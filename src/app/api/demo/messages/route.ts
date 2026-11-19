import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { manejarEntrante } from "@/lib/bot";
import { normalizarCelular } from "@/lib/format";
import { whatsappMode } from "@/lib/whatsapp/provider";
export const dynamic = "force-dynamic";
const habilitado = () => whatsappMode() === "demo" || process.env.ALLOW_DEMO === "true";
export async function GET(req: NextRequest) {
  if (!habilitado()) return NextResponse.json({ error: "Simulador deshabilitado" }, { status: 404 });
  const db = await getDb(); const tel = normalizarCelular(req.nextUrl.searchParams.get("tel") || "");
  const telefonos = await db.query(`SELECT m.telefono, max(m.created_at) AS ultimo, (SELECT placa FROM vehiculos v WHERE v.celular=m.telefono ORDER BY id LIMIT 1) AS placa FROM mensajes m GROUP BY m.telefono ORDER BY max(m.created_at) DESC LIMIT 20`);
  const mensajes = tel ? await db.query(`SELECT id, direccion, tipo, contenido, estado, created_at FROM mensajes WHERE telefono=$1 ORDER BY id ASC LIMIT 200`, [tel]) : [];
  return NextResponse.json({ telefonos, mensajes });
}
export async function POST(req: NextRequest) {
  if (!habilitado()) return NextResponse.json({ error: "Simulador deshabilitado" }, { status: 404 });
  const { tel, texto } = await req.json();
  if (!tel || !texto) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  const respuesta = await manejarEntrante(await getDb(), String(tel), String(texto).slice(0, 500));
  return NextResponse.json({ ok: true, respuesta });
}
