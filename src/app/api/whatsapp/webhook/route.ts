import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { manejarEntrante } from "@/lib/bot";
import { extraerMensajes, firmaValida } from "@/lib/whatsapp/provider";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Verificación del webhook (Meta envía GET con hub.challenge)
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  if (p.get("hub.mode") === "subscribe" && p.get("hub.verify_token") === (process.env.META_VERIFY_TOKEN || "bitaller-verify"))
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200, headers: { "Content-Type": "text/plain" } });
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!firmaValida(raw, req.headers.get("x-hub-signature-256"))) {
    console.warn("[webhook] firma inválida (revise META_APP_SECRET). Bytes:", raw.length, "cabecera:", req.headers.get("x-hub-signature-256") ? "presente" : "ausente");
    return new NextResponse("Firma inválida", { status: 401 });
  }
  let payload: any; try { payload = JSON.parse(raw); } catch { return new NextResponse("JSON inválido", { status: 400 }); }
  const db = await getDb();
  // Actualizar estados de entrega
  for (const entry of payload?.entry ?? []) for (const ch of entry?.changes ?? []) for (const st of ch?.value?.statuses ?? []) {
    const estado = st.status === "failed" ? `error: ${st.errors?.[0]?.title || "fallido"}` : st.status;
    await db.query(`UPDATE mensajes SET estado=$2 WHERE meta_id=$1`, [st.id, estado]);
  }
  const msgs = extraerMensajes(payload);
  const campos = (payload?.entry ?? []).flatMap((e: any) => (e?.changes ?? []).map((c: any) => c?.field));
  console.log("[webhook] recibido", { campos, mensajes: msgs.length });
  for (const m of msgs) {
    const ya = m.id ? await db.query(`SELECT 1 FROM mensajes WHERE meta_id=$1 AND direccion='in'`, [m.id]) : [];
    if (ya.length) continue; // Meta reintenta: evitar duplicados
    try { const r = await manejarEntrante(db, m.from, m.text, m.id); console.log("[webhook] respondido a ***" + m.from.slice(-4), r.slice(0, 40)); } catch (e) { console.error("Error procesando mensaje", e); }
  }
  return NextResponse.json({ ok: true, procesados: msgs.length });
}
