import type { Db } from "./db";
import { cop, fechaCorta, normalizarCelular, sinTildes } from "./format";
import { AYUDA, LEY } from "./mensajes";
import { sendWhatsApp } from "./whatsapp/provider";

export const LIMITE_CONSULTAS_DIA = 5;
const PLACA_EN_TEXTO = /\b([A-Z]{3}\s?-?\s?(?:\d{3}|\d{2}[A-Z]))\b/;

export async function registrarEntrante(db: Db, telefono: string, texto: string, metaId?: string) {
  const tel = normalizarCelular(telefono);
  const v = (await db.query(`SELECT id FROM vehiculos WHERE celular=$1 ORDER BY id LIMIT 1`, [tel]))[0];
  await db.query(`INSERT INTO mensajes (vehiculo_id, telefono, direccion, tipo, contenido, estado, meta_id) VALUES ($1,$2,'in','otro',$3,'recibido',$4)`, [v?.id ?? null, tel, texto, metaId ?? null]);
}

export async function consultaPlaca(db: Db, telefono: string, placa: string): Promise<{ texto: string; nivel: "completo" | "publico" | "ninguno" | "limite" }> {
  const tel = normalizarCelular(telefono);
  const n = (await db.query(`SELECT count(*)::int AS n FROM consultas_placa WHERE telefono=$1 AND created_at > now() - interval '24 hours'`, [tel]))[0].n;
  if (n >= LIMITE_CONSULTAS_DIA) return { nivel: "limite", texto: `⚠️ Alcanzó el límite de ${LIMITE_CONSULTAS_DIA} consultas de placa por día. Intente de nuevo mañana.` };
  await db.query(`INSERT INTO consultas_placa (telefono, placa) VALUES ($1,$2)`, [tel, placa]);
  const v = (await db.query(`SELECT * FROM vehiculos WHERE placa=$1`, [placa]))[0];
  const sinRegistros = { nivel: "ninguno" as const, texto: `No encontramos registros públicos para la placa *${placa}*.` };
  if (!v) return sinRegistros;
  const servicios = await db.query(`SELECT s.fecha, s.trabajos, s.total, s.kilometraje, t.nombre AS taller FROM servicios s JOIN talleres t ON t.id=s.taller_id WHERE s.vehiculo_id=$1 ORDER BY s.fecha DESC LIMIT 15`, [v.id]);
  if (v.celular === tel) {
    if (!servicios.length) return { nivel: "completo", texto: `Su vehículo *${placa}* aún no tiene servicios registrados.` };
    const l = servicios.map((s: any) => `• ${fechaCorta(s.fecha)} · ${s.trabajos.join(", ")}${s.kilometraje ? ` · ${s.kilometraje.toLocaleString("es-CO").replace(/,/g, ".")} km` : ""} · ${cop(s.total)} · ${s.taller}`);
    return { nivel: "completo", texto: [`📋 *Historial de ${placa}*`, ...l, "", v.consulta_publica ? "La consulta pública está *activada* (otros ven solo fechas y trabajos). Escriba PÚBLICO NO para desactivarla." : "Solo usted ve este detalle. Escriba PÚBLICO SÍ si quiere que otras personas vean fechas y trabajos (sin precios ni taller)."].join("\n") };
  }
  if (v.consulta_publica && servicios.length) {
    const l = servicios.map((s: any) => `• ${fechaCorta(s.fecha)} · ${s.trabajos.join(", ")}`);
    return { nivel: "publico", texto: [`📋 *Historial público de ${placa}*`, ...l, "", "Por privacidad no se muestran precios ni talleres."].join("\n") };
  }
  return sinRegistros;
}

/** Procesa un mensaje entrante y responde. Devuelve el texto respondido. */
export async function manejarEntrante(db: Db, telefono: string, texto: string, metaId?: string): Promise<string> {
  const tel = normalizarCelular(telefono);
  await registrarEntrante(db, tel, texto, metaId);
  const t = sinTildes(texto || "").toLowerCase().replace(/[¡!¿?.,]/g, " ").replace(/\s+/g, " ").trim();
  const propios = await db.query(`SELECT * FROM vehiculos WHERE celular=$1 ORDER BY id`, [tel]);
  let respuesta: string; let tipo: "autorizacion" | "historial" | "otro" = "otro"; let vehiculoId: number | null = propios[0]?.id ?? null;

  if (/^(si|sii|si acepto|acepto|si autorizo|autorizo|ok si)$/.test(t)) {
    tipo = "autorizacion";
    if (!propios.length) respuesta = "No encontramos vehículos asociados a este número. " + AYUDA;
    else {
      await db.query(`UPDATE vehiculos SET autoriza_datos=true, autoriza_datos_at=now() WHERE celular=$1`, [tel]);
      respuesta = `✅ Gracias. Registramos su autorización (${LEY}) para *${propios.map((v: any) => v.placa).join(", ")}*. Le avisaremos antes de su próximo mantenimiento y de los vencimientos.\n\nEscriba la placa para ver el historial o BAJA para revocar.`;
    }
  } else if (/^(baja|no mas|stop|revocar|cancelar)$/.test(t)) {
    tipo = "autorizacion";
    await db.query(`UPDATE vehiculos SET autoriza_datos=false, consulta_publica=false WHERE celular=$1`, [tel]);
    await db.query(`UPDATE recordatorios SET cancelado=true WHERE enviado_at IS NULL AND vehiculo_id IN (SELECT id FROM vehiculos WHERE celular=$1)`, [tel]);
    respuesta = "Listo. Revocamos su autorización y no le enviaremos más recordatorios. Puede volver a activarla escribiendo SÍ.";
  } else if (/^publico (si|no)$/.test(t)) {
    tipo = "autorizacion";
    const on = t.endsWith("si");
    if (!propios.length) respuesta = "Este número no tiene vehículos registrados.";
    else if (on && !propios.some((v: any) => v.autoriza_datos)) respuesta = "Primero autorice el tratamiento de datos respondiendo SÍ.";
    else {
      await db.query(`UPDATE vehiculos SET consulta_publica=$2 WHERE celular=$1`, [tel, on]);
      respuesta = on ? "🔓 Consulta pública activada: otras personas verán solo fechas y trabajos de su vehículo, sin precios ni taller." : "🔒 Consulta pública desactivada: solo usted ve el historial.";
    }
  } else {
    const m = texto.toUpperCase().match(PLACA_EN_TEXTO);
    if (m) {
      tipo = "historial";
      const placa = m[1].replace(/[\s-]/g, "");
      const r = await consultaPlaca(db, tel, placa);
      respuesta = r.texto;
      const v = (await db.query(`SELECT id FROM vehiculos WHERE placa=$1`, [placa]))[0];
      if (v && r.nivel === "completo") vehiculoId = v.id;
    } else respuesta = AYUDA;
  }
  await sendWhatsApp(db, { to: tel, text: respuesta, tipo, vehiculoId });
  return respuesta;
}
