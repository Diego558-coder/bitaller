import type { Db } from "./db";
import { ymdBogota } from "./format";
import { textoRecordatorio } from "./mensajes";
import { sendWhatsApp } from "./whatsapp/provider";

/** Envía los recordatorios vencidos (programado_para <= hoy) de vehículos con autorización. */
export async function enviarRecordatoriosPendientes(db: Db, hoy = ymdBogota()) {
  const pend = await db.query(`SELECT r.*, v.placa, v.celular, v.soat_vence, v.rtm_vence FROM recordatorios r JOIN vehiculos v ON v.id=r.vehiculo_id
    WHERE r.enviado_at IS NULL AND r.cancelado=false AND r.programado_para <= $1 AND v.autoriza_datos=true ORDER BY r.programado_para`, [hoy]);
  let enviados = 0, errores = 0;
  for (const r of pend) {
    const fecha = r.tipo === "soat" ? r.soat_vence : r.tipo === "rtm" ? r.rtm_vence : undefined;
    const fechaStr = fecha ? (typeof fecha === "string" ? fecha.slice(0, 10) : ymdBogota(fecha)) : undefined;
    const text = textoRecordatorio(r.tipo, r.placa, { km: r.km_objetivo, fecha: fechaStr });
    const tpl = process.env.META_TEMPLATE_RECORDATORIO ? { name: process.env.META_TEMPLATE_RECORDATORIO, params: [r.placa, text.split("\n").slice(1).join(" ")] } : null;
    const res = await sendWhatsApp(db, { to: r.celular, text, tipo: "recordatorio", vehiculoId: r.vehiculo_id, template: tpl });
    if (res.ok) { enviados++; await db.query(`UPDATE recordatorios SET enviado_at=now() WHERE id=$1`, [r.id]); } else errores++;
  }
  return { revisados: pend.length, enviados, errores };
}
