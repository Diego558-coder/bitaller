import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getDb } from "./db";

export type Session = { userId: number; tallerId: number; rol: "dueno" | "mecanico"; nombre: string };
const COOKIE = "bt_session";
function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET no está configurado (mínimo 16 caracteres)");
  return new TextEncoder().encode(s);
}
export async function hashPassword(p: string) { return bcrypt.hash(p, 10); }
export async function verifyPassword(p: string, h: string) { return bcrypt.compare(p, h); }

export async function createSessionToken(s: Session) {
  return new SignJWT(s as any).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(key());
}
export async function readSessionToken(token?: string): Promise<Session | null> {
  if (!token) return null;
  try { const { payload } = await jwtVerify(token, key()); return payload as unknown as Session; } catch { return null; }
}
export async function getSession(): Promise<Session | null> {
  const c = await cookies();
  const s = await readSessionToken(c.get(COOKIE)?.value);
  if (!s) return null;
  const db = await getDb();
  const u = await db.query(`SELECT activo FROM usuarios WHERE id=$1`, [s.userId]);
  if (!u[0]?.activo) return null;
  return s;
}
export async function setSessionCookie(s: Session) {
  const c = await cookies();
  c.set(COOKIE, await createSessionToken(s), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && (process.env.APP_URL || "").startsWith("https"), path: "/", maxAge: 60 * 60 * 24 * 30 });
}
export async function clearSessionCookie() { (await cookies()).delete(COOKIE); }

export async function login(email: string, password: string): Promise<Session | null> {
  const db = await getDb();
  const rows = await db.query(`SELECT id, taller_id, rol, nombre, password_hash, activo FROM usuarios WHERE lower(email)=lower($1)`, [email.trim()]);
  const u = rows[0];
  if (!u || !u.activo || !(await verifyPassword(password, u.password_hash))) return null;
  return { userId: u.id, tallerId: u.taller_id, rol: u.rol, nombre: u.nombre };
}
