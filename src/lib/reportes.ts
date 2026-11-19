import type { Db } from "./db";
import { addDays, bogotaDayStartUtc } from "./format";

const DIA_LOCAL = `to_char(((s.fecha AT TIME ZONE 'UTC') - interval '5 hours')::date, 'YYYY-MM-DD')`;

export async function resumenSemana(db: Db, tallerId: number, lunes: string) {
  const ini = bogotaDayStartUtc(lunes), fin = bogotaDayStartUtc(addDays(lunes, 7)), iniAnt = bogotaDayStartUtc(addDays(lunes, -7));
  const dias = await db.query(`SELECT ${DIA_LOCAL} AS dia, sum(s.total)::int AS ventas, count(*)::int AS servicios FROM servicios s WHERE s.taller_id=$1 AND s.fecha >= $2 AND s.fecha < $3 GROUP BY 1`, [tallerId, ini, fin]);
  const porDia = Array.from({ length: 7 }, (_, i) => { const d = addDays(lunes, i); const r = dias.find((x: any) => x.dia === d); return { dia: d, ventas: r?.ventas ?? 0, servicios: r?.servicios ?? 0 }; });
  const total = porDia.reduce((a, d) => a + d.ventas, 0), servicios = porDia.reduce((a, d) => a + d.servicios, 0);
  const ant = (await db.query(`SELECT coalesce(sum(total),0)::int AS v FROM servicios WHERE taller_id=$1 AND fecha >= $2 AND fecha < $3`, [tallerId, iniAnt, ini]))[0].v;
  const mejor = porDia.reduce((a, d) => (d.ventas > a.ventas ? d : a), porDia[0]);
  const porMecanico = await db.query(`SELECT u.nombre, count(s.id)::int AS servicios, coalesce(sum(s.total),0)::int AS ventas, count(*) FILTER (WHERE s.es_garantia)::int AS garantias
    FROM usuarios u LEFT JOIN servicios s ON s.mecanico_id=u.id AND s.fecha >= $2 AND s.fecha < $3 WHERE u.taller_id=$1 AND u.activo GROUP BY u.id, u.nombre HAVING count(s.id) > 0 OR u.rol='mecanico' ORDER BY ventas DESC`, [tallerId, ini, fin]);
  const comprobantes = (await db.query(`SELECT count(*)::int AS n FROM servicios WHERE taller_id=$1 AND fecha >= $2 AND fecha < $3 AND comprobante_enviado`, [tallerId, ini, fin]))[0].n;
  const ini30 = bogotaDayStartUtc(addDays(lunes, -23));
  const volvieron = (await db.query(`SELECT count(DISTINCT s.vehiculo_id)::int AS n FROM servicios s WHERE s.taller_id=$1 AND s.fecha >= $2 AND s.fecha < $3
    AND EXISTS (SELECT 1 FROM recordatorios r WHERE r.vehiculo_id=s.vehiculo_id AND r.enviado_at IS NOT NULL AND r.enviado_at < s.fecha AND r.enviado_at > s.fecha - interval '45 days')`, [tallerId, ini30, fin]))[0].n;
  const bajos = await db.query(`SELECT nombre, stock, stock_minimo FROM repuestos WHERE taller_id=$1 AND stock <= stock_minimo ORDER BY stock ASC, nombre LIMIT 8`, [tallerId]);
  const rec = await db.query(`SELECT r.tipo, count(*)::int AS n FROM recordatorios r WHERE r.cancelado=false AND r.programado_para >= $2 AND r.programado_para < $3
    AND (r.taller_id=$1 OR r.vehiculo_id IN (SELECT vehiculo_id FROM servicios WHERE taller_id=$1)) GROUP BY r.tipo`, [tallerId, lunes, addDays(lunes, 7)]);
  const recordatorios = { aceite: 0, soat: 0, rtm: 0 } as Record<string, number>;
  for (const r of rec) recordatorios[r.tipo] = r.n;
  return { lunes, porDia, total, servicios, anterior: ant, variacion: ant ? (total - ant) / ant : null, mejor, porMecanico, comprobantes, volvieron, bajos, recordatorios };
}
