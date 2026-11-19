import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { addDays, fechaCorta, ymdBogota } from "@/lib/format";
import { EnviarAhora } from "./EnviarAhora";
export const dynamic = "force-dynamic";
const TIPO: Record<string, string> = { aceite: "Cambio de aceite", soat: "SOAT", rtm: "Tecnomecánica" };
const f = (d: any) => fechaCorta(d instanceof Date ? d : String(d).slice(0, 10) + "T17:00:00Z");
export default async function Recordatorios() {
  const s = await getSession(); if (!s) redirect("/login"); if (s.rol !== "dueno") redirect("/registrar");
  const db = await getDb(); const hoy = ymdBogota();
  const base = `FROM recordatorios r JOIN vehiculos v ON v.id=r.vehiculo_id WHERE r.cancelado=false AND (r.taller_id=$1 OR r.vehiculo_id IN (SELECT vehiculo_id FROM servicios WHERE taller_id=$1))`;
  const pendientes = await db.query(`SELECT r.*, v.placa, v.autoriza_datos ${base} AND r.enviado_at IS NULL AND r.programado_para <= $2 ORDER BY r.programado_para LIMIT 100`, [s.tallerId, addDays(hoy, 14)]);
  const enviados = await db.query(`SELECT r.*, v.placa ${base} AND r.enviado_at IS NOT NULL ORDER BY r.enviado_at DESC LIMIT 30`, [s.tallerId]);
  const vencidos = pendientes.filter((r: any) => f(r.programado_para) && String(r.programado_para instanceof Date ? r.programado_para.toISOString() : r.programado_para).slice(0, 10) <= hoy && r.autoriza_datos).length;
  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div><h1 className="text-2xl font-extrabold">Recordatorios</h1><p className="text-sm text-gris">Se envían solos cada día por WhatsApp a los clientes que autorizaron. Hoy hay {vencidos} listos para enviar.</p></div>
        <EnviarAhora />
      </div>
      <h2 className="font-bold mt-6 mb-2">Próximos 14 días</h2>
      <div className="card overflow-x-auto"><table className="tbl w-full"><thead><tr><th>Fecha</th><th>Placa</th><th>Tipo</th><th>Estado</th></tr></thead>
        <tbody>{pendientes.map((r: any) => <tr key={r.id}><td>{f(r.programado_para)}</td><td className="font-bold tracking-widest">{r.placa}</td><td>{TIPO[r.tipo]}{r.km_objetivo ? ` · ${r.km_objetivo.toLocaleString("es-CO").replace(/,/g, ".")} km` : ""}</td><td>{r.autoriza_datos ? "Programado" : <span className="text-gris">Sin autorización (no se enviará)</span>}</td></tr>)}
          {!pendientes.length && <tr><td colSpan={4} className="text-gris">No hay recordatorios próximos.</td></tr>}</tbody></table></div>
      <h2 className="font-bold mt-6 mb-2">Enviados recientemente</h2>
      <div className="card overflow-x-auto"><table className="tbl w-full"><thead><tr><th>Enviado</th><th>Placa</th><th>Tipo</th></tr></thead>
        <tbody>{enviados.map((r: any) => <tr key={r.id}><td>{fechaCorta(r.enviado_at)}</td><td className="font-bold tracking-widest">{r.placa}</td><td>{TIPO[r.tipo]}</td></tr>)}</tbody></table></div>
    </div>
  );
}
