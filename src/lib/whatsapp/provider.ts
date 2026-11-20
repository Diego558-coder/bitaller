import crypto from "crypto";
import type { Db } from "../db";

export type OutMessage = {
  to: string;
  text: string;
  tipo: "comprobante" | "autorizacion" | "recordatorio" | "historial" | "otro";
  vehiculoId?: number | null;
  /** Parámetros para la plantilla aprobada en Meta (se usan fuera de la ventana de 24 h) */
  template?: { name: string; params: string[] } | null;
};
export type SendResult = { ok: boolean; id?: string; error?: string; via: "demo" | "meta-text" | "meta-template" };

export function whatsappMode(): "demo" | "meta" { return process.env.WHATSAPP_MODE === "meta" ? "meta" : "demo"; }

/** Configuración de Meta. Acepta los nombres META_* y también los del equipo (BUSSINES_PHONE, API_VERSION, WEBHOOK_VERIFY_TOKEN, ACCESS_TOKEN). */
export function metaConfig() {
  const e = process.env;
  return {
    phoneId: e.META_PHONE_NUMBER_ID || e.BUSSINES_PHONE || e.BUSINESS_PHONE || "",
    token: e.META_ACCESS_TOKEN || e.ACCESS_TOKEN || e.WHATSAPP_TOKEN || "",
    version: e.META_GRAPH_VERSION || e.API_VERSION || "v27.0",
    verifyToken: e.META_VERIFY_TOKEN || e.WEBHOOK_VERIFY_TOKEN || "bitaller-verify",
    appSecret: e.META_APP_SECRET || e.APP_SECRET || "",
  };
}
let avisoSinSecreto = false;

async function guardar(db: Db, m: OutMessage, estado: string, metaId?: string) {
  await db.query(`INSERT INTO mensajes (vehiculo_id, telefono, direccion, tipo, contenido, estado, meta_id) VALUES ($1,$2,'out',$3,$4,$5,$6)`,
    [m.vehiculoId ?? null, m.to, m.tipo, m.text, estado, metaId ?? null]);
}

/** ¿El cliente escribió en las últimas 24 h? (ventana de atención de Meta: se puede enviar texto libre) */
export async function ventanaAbierta(db: Db, telefono: string): Promise<boolean> {
  const r = await db.query(`SELECT 1 FROM mensajes WHERE telefono=$1 AND direccion='in' AND created_at > now() - interval '24 hours' LIMIT 1`, [telefono]);
  return r.length > 0;
}

export async function sendWhatsApp(db: Db, m: OutMessage): Promise<SendResult> {
  if (whatsappMode() === "demo") { await guardar(db, m, "entregado"); return { ok: true, via: "demo" }; }
  const { version, phoneId, token } = metaConfig();
  if (!phoneId || !token) { await guardar(db, m, "error: faltan credenciales de Meta"); return { ok: false, error: "Faltan META_PHONE_NUMBER_ID o META_ACCESS_TOKEN", via: "meta-text" }; }
  const abierta = await ventanaAbierta(db, m.to);
  const useTemplate = !abierta && !!m.template?.name;
  const body = useTemplate
    ? { messaging_product: "whatsapp", to: m.to, type: "template", template: { name: m.template!.name, language: { code: process.env.META_TEMPLATE_LANG || "es" },
        components: [{ type: "body", parameters: m.template!.params.map((p) => ({ type: "text", text: p.replace(/\s*\n\s*/g, " · ").slice(0, 1000) })) }] } }
    : { messaging_product: "whatsapp", to: m.to, type: "text", text: { preview_url: false, body: m.text } };
  try {
    const res = await fetch(`${process.env.META_GRAPH_BASE || "https://graph.facebook.com"}/${version}/${phoneId}/messages`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) { const err = json?.error?.message || `HTTP ${res.status}`; console.warn("[whatsapp] error de Meta:", err); await guardar(db, m, "error: " + err); return { ok: false, error: err, via: useTemplate ? "meta-template" : "meta-text" }; }
    const id = json?.messages?.[0]?.id; await guardar(db, m, "enviado", id);
    return { ok: true, id, via: useTemplate ? "meta-template" : "meta-text" };
  } catch (e: any) { await guardar(db, m, "error: " + e.message); return { ok: false, error: e.message, via: "meta-text" }; }
}

/** Valida la cabecera X-Hub-Signature-256 que envía Meta */
export function firmaValida(rawBody: string, header: string | null, secret = metaConfig().appSecret): boolean {
  if (!secret) {
    // Modo desarrollo/MVP local: sin clave secreta no se valida la firma (configure META_APP_SECRET para producción)
    if (!avisoSinSecreto) { console.warn("[webhook] META_APP_SECRET vacío: no se valida la firma de Meta (solo para desarrollo)"); avisoSinSecreto = true; }
    return true;
  }
  if (!header?.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(header);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Extrae los mensajes de texto entrantes de un payload de webhook de WhatsApp Cloud API */
export function extraerMensajes(payload: any): { from: string; text: string; id: string }[] {
  const out: { from: string; text: string; id: string }[] = [];
  for (const entry of payload?.entry ?? []) for (const ch of entry?.changes ?? []) for (const msg of ch?.value?.messages ?? []) {
    let text = "";
    if (msg.type === "text") text = msg.text?.body ?? "";
    else if (msg.type === "button") text = msg.button?.text ?? "";
    else if (msg.type === "interactive") text = msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? "";
    if (msg.from) out.push({ from: String(msg.from), text, id: msg.id });
  }
  return out;
}
