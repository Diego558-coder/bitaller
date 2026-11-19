import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cop, fechaCorta, fechaHora, normalizarPlaca, ocultarCelular } from "@/lib/format";
export const dynamic = "force-dynamic";
const fecha = (d: any) => (d ? fechaCorta(d instanceof Date ? d : String(d).slice(0, 10) + "T17:00:00Z") : "-");
export default async function Vehiculo({ params }: { params: Promise<{ placa: string }> }) {
  const s = await getSession(); if (!s) redirect("/login");
  const placa = normalizarPlaca((await params).placa);
  const db = await getDb();
  const v = (await db.query(`SELECT * FROM vehiculos WHERE placa=$1`, [placa]))[0];
  if (!v) notFound();
  const servicios = await db.query(`SELECT s.*, u.nombre AS mecanico, (SELECT string_agg(r.nombre || ' ×' || sr.cantidad, ', ') FROM servicio_repuestos sr JOIN repuestos r ON r.id=sr.repuesto_id WHERE sr.servicio_id=s.id) AS repuestos
    FROM servicios s LEFT JOIN usuarios u ON u.id=s.mecanico_id WHERE s.vehiculo_id=$1 AND s.taller_id=$2 ORDER BY s.fecha DESC`, [v.id, s.tallerId]);
  if (!servicios.length) notFound();
  const rec = await db.query(`SELECT * FROM recordatorios WHERE vehiculo_id=$1 AND cancelado=false ORDER BY programado_para DESC LIMIT 6`, [v.id]);
  return (
    <div className="max-w-4xl">
      <Link href="/vehiculos" className="text-sm text-selva font-semibold">← Vehículos</Link>
      <div className="flex flex-wrap items-center gap-3 mt-2"><h1 className="text-3xl font-extrabold tracking-[0.2em]">{v.placa}</h1><span className="text-sm bg-white border border-linea rounded-full px-3 py-1 capitalize">{v.tipo}</span>
        <Link href="/registrar" className="btn-primary ml-auto">+ Nuevo servicio</Link></div>
      <div className="grid sm:grid-cols-4 gap-3 mt-4 text-sm">
        <div className="card p-3"><div className="label">WhatsApp</div>{ocultarCelular(v.celular)}</div>
        <div className="card p-3"><div className="label">Autorización (Ley 1581)</div>{v.autoriza_datos ? `Sí · ${fechaCorta(v.autoriza_datos_at)}` : "Pendiente"}</div>
        <div className="card p-3"><div className="label">SOAT vence</div>{fecha(v.soat_vence)}</div>
        <div className="card p-3"><div className="label">Tecnomecánica vence</div>{fecha(v.rtm_vence)}</div>
      </div>
      <h2 className="font-bold mt-6 mb-2">Servicios en este taller ({servicios.length})</h2>
      <div className="card overflow-x-auto"><table className="tbl w-full"><thead><tr><th>Fecha</th><th>Trabajo</th><th>Repuestos</th><th>Km</th><th>Mecánico</th>{s.rol === "dueno" && <th className="!text-right">Total</th>}</tr></thead>
        <tbody>{servicios.map((x: any) => <tr key={x.id}><td className="whitespace-nowrap">{fechaHora(x.fecha)}</td><td>{x.trabajos.join(", ")}{x.es_garantia && <span className="ml-1 text-xs text-motor font-bold">GARANTÍA</span>}</td><td className="text-gris">{x.repuestos || "-"}</td><td>{x.kilometraje?.toLocaleString("es-CO").replace(/,/g, ".") ?? "-"}</td><td>{x.mecanico || "-"}</td>{s.rol === "dueno" && <td className="text-right font-bold">{cop(x.total)}</td>}</tr>)}</tbody></table></div>
      <h2 className="font-bold mt-6 mb-2">Recordatorios</h2>
      <div className="card divide-y divide-linea text-sm">{rec.length === 0 ? <p className="p-3 text-gris">Sin recordatorios.</p> : rec.map((r: any) => <div key={r.id} className="flex justify-between p-3"><span className="capitalize">{r.tipo === "rtm" ? "Tecnomecánica" : r.tipo === "soat" ? "SOAT" : "Cambio de aceite"}{r.km_objetivo ? ` · ${r.km_objetivo.toLocaleString("es-CO").replace(/,/g, ".")} km` : ""}</span><span>{r.enviado_at ? `Enviado ${fechaCorta(r.enviado_at)}` : `Programado ${fecha(r.programado_para)}`}</span></div>)}</div>
    </div>
  );
}
