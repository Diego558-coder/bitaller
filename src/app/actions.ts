"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { clearSessionCookie, getSession, hashPassword, login, setSessionCookie, verifyPassword } from "@/lib/auth";
import { buscarVehiculo, registrarServicio, RegistroError, type RegistroInput } from "@/lib/servicios";
import { enviarRecordatoriosPendientes } from "@/lib/recordatorios";
import { cop, fechaCorta, ocultarCelular } from "@/lib/format";
import { z } from "zod";

async function requireSession(rol?: "dueno") {
  const s = await getSession();
  if (!s) redirect("/login");
  if (rol && s.rol !== rol) throw new Error("No autorizado");
  return s;
}

export async function loginAction(_: unknown, fd: FormData) {
  const s = await login(String(fd.get("email") || ""), String(fd.get("password") || ""));
  if (!s) return { error: "Correo o contraseña incorrectos" };
  await setSessionCookie(s);
  redirect(s.rol === "dueno" ? "/resumen" : "/registrar");
}
export async function logoutAction() { await clearSessionCookie(); redirect("/login"); }

export async function buscarPlacaAction(placa: string) {
  const s = await requireSession();
  const db = await getDb();
  const r = await buscarVehiculo(db, placa, s.tallerId);
  if (!r) return { existe: false as const };
  const u = r.ultimoEnTaller;
  return { existe: true as const, celular: ocultarCelular(r.vehiculo.celular), autorizado: r.vehiculo.autoriza_datos as boolean,
    ultimo: u ? `${fechaCorta(u.fecha)} (${(u.trabajos as string[]).join(", ")}${u.kilometraje ? ", " + Number(u.kilometraje).toLocaleString("es-CO").replace(/,/g, ".") + " km" : ""})` : null,
    soat: r.vehiculo.soat_vence ? String(r.vehiculo.soat_vence instanceof Date ? r.vehiculo.soat_vence.toISOString() : r.vehiculo.soat_vence).slice(0, 10) : "",
    rtm: r.vehiculo.rtm_vence ? String(r.vehiculo.rtm_vence instanceof Date ? r.vehiculo.rtm_vence.toISOString() : r.vehiculo.rtm_vence).slice(0, 10) : "" };
}

export type RegistroResult = { ok: true; placa: string; total: string; trabajos: string; envio: string; envioOk: boolean; demo: boolean; telefono: string } | { ok: false; error: string };
export async function registrarAction(input: RegistroInput): Promise<RegistroResult> {
  const s = await requireSession();
  const db = await getDb();
  try {
    const r = await registrarServicio(db, s, input);
    revalidatePath("/resumen"); revalidatePath("/repuestos"); revalidatePath("/vehiculos");
    const envio = !r.envio ? "Comprobante no enviado (desactivado)" : r.envio.ok ? (r.envio.via === "demo" ? "Comprobante enviado (modo demo)" : "Comprobante enviado por WhatsApp") : /132001|132000|template/i.test(r.envio.error || "")
        ? "Comprobante pendiente: Meta todavía no aprueba la plantilla. Pida al cliente escribir \"hola\" al WhatsApp del taller y el comprobante le llegará automáticamente."
        : /131047|24 hours|re-engagement/i.test(r.envio.error || "")
        ? "Comprobante pendiente: el cliente debe escribir \"hola\" al WhatsApp del taller y le llegará automáticamente."
        : "No se pudo enviar el comprobante (quedó pendiente y se enviará cuando el cliente escriba): " + r.envio.error;
    return { ok: true, placa: r.vehiculo.placa, total: cop(r.total), trabajos: r.trabajos.join(", "), envio, envioOk: !!r.envio?.ok, demo: r.envio?.via === "demo", telefono: r.vehiculo.celular };
  } catch (e: any) {
    if (e instanceof RegistroError) return { ok: false, error: e.message };
    if (e?.issues) return { ok: false, error: e.issues[0]?.message || "Datos no válidos" };
    console.error(e); return { ok: false, error: "Error inesperado al guardar" };
  }
}

export async function guardarRepuestoAction(fd: FormData) {
  const s = await requireSession("dueno"); const db = await getDb();
  const d = z.object({ id: z.coerce.number().optional(), nombre: z.string().trim().min(2), stock: z.coerce.number().int().min(0), stock_minimo: z.coerce.number().int().min(0), precio: z.coerce.number().int().min(0) }).parse(Object.fromEntries(fd));
  if (d.id) await db.query(`UPDATE repuestos SET nombre=$3, stock=$4, stock_minimo=$5, precio=$6 WHERE id=$1 AND taller_id=$2`, [d.id, s.tallerId, d.nombre, d.stock, d.stock_minimo, d.precio]);
  else await db.query(`INSERT INTO repuestos (taller_id, nombre, stock, stock_minimo, precio) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (taller_id, nombre) DO UPDATE SET stock=repuestos.stock+EXCLUDED.stock, precio=EXCLUDED.precio, stock_minimo=EXCLUDED.stock_minimo`, [s.tallerId, d.nombre, d.stock, d.stock_minimo, d.precio]);
  revalidatePath("/repuestos");
}
export async function ajustarStockAction(fd: FormData) {
  const s = await requireSession("dueno"); const db = await getDb();
  const id = Number(fd.get("id")), delta = Number(fd.get("delta"));
  await db.query(`UPDATE repuestos SET stock=GREATEST(0, stock + $3) WHERE id=$1 AND taller_id=$2`, [id, s.tallerId, delta]);
  revalidatePath("/repuestos");
}

export async function crearMecanicoAction(_: unknown, fd: FormData) {
  const s = await requireSession("dueno"); const db = await getDb();
  const p = z.object({ nombre: z.string().trim().min(2, "Nombre muy corto"), email: z.string().trim().email("Correo no válido"), password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres") }).safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0].message };
  try {
    await db.query(`INSERT INTO usuarios (taller_id, nombre, email, password_hash, rol) VALUES ($1,$2,lower($3),$4,'mecanico')`, [s.tallerId, p.data.nombre, p.data.email, await hashPassword(p.data.password)]);
  } catch { return { error: "Ya existe un usuario con ese correo" }; }
  revalidatePath("/mecanicos"); return { ok: `Mecánico ${p.data.nombre} creado. Comparta el correo y la contraseña con él.` };
}
export async function toggleUsuarioAction(fd: FormData) {
  const s = await requireSession("dueno"); const db = await getDb();
  await db.query(`UPDATE usuarios SET activo = NOT activo WHERE id=$1 AND taller_id=$2 AND rol='mecanico'`, [Number(fd.get("id")), s.tallerId]);
  revalidatePath("/mecanicos");
}
export async function guardarTallerAction(fd: FormData) {
  const s = await requireSession("dueno"); const db = await getDb();
  const nombre = String(fd.get("nombre") || "").trim(), ciudad = String(fd.get("ciudad") || "").trim();
  if (nombre.length >= 2) await db.query(`UPDATE talleres SET nombre=$2, ciudad=$3 WHERE id=$1`, [s.tallerId, nombre, ciudad || "Florencia"]);
  revalidatePath("/configuracion");
}
export async function cambiarPasswordAction(_: unknown, fd: FormData) {
  const s = await requireSession(); const db = await getDb();
  const actual = String(fd.get("actual") || ""), nueva = String(fd.get("nueva") || "");
  if (nueva.length < 6) return { error: "La nueva contraseña debe tener al menos 6 caracteres" };
  const u = (await db.query(`SELECT password_hash FROM usuarios WHERE id=$1`, [s.userId]))[0];
  if (!(await verifyPassword(actual, u.password_hash))) return { error: "La contraseña actual no es correcta" };
  await db.query(`UPDATE usuarios SET password_hash=$2 WHERE id=$1`, [s.userId, await hashPassword(nueva)]);
  return { ok: "Contraseña actualizada" };
}
export async function enviarRecordatoriosAction() {
  await requireSession("dueno"); const db = await getDb();
  const r = await enviarRecordatoriosPendientes(db);
  revalidatePath("/recordatorios");
  return r;
}
