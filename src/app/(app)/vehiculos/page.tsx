import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { fechaCorta, normalizarPlaca, ocultarCelular } from "@/lib/format";
export const dynamic = "force-dynamic";
export default async function Vehiculos({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await getSession(); if (!s) redirect("/login");
  const q = normalizarPlaca((await searchParams).q || "");
  const db = await getDb();
  const rows = await db.query(`SELECT v.placa, v.tipo, v.celular, v.autoriza_datos, count(s.id)::int AS servicios, max(s.fecha) AS ultimo
    FROM vehiculos v JOIN servicios s ON s.vehiculo_id=v.id AND s.taller_id=$1 WHERE ($2 = '' OR v.placa LIKE $2 || '%') GROUP BY v.id ORDER BY max(s.fecha) DESC LIMIT 100`, [s.tallerId, q]);
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold">Vehículos atendidos</h1>
      <p className="text-sm text-gris mb-4">Solo ve los vehículos y servicios de su taller.</p>
      <form className="flex gap-2 mb-4"><input name="q" defaultValue={q} placeholder="Buscar por placa" className="input uppercase" aria-label="Buscar por placa" /><button className="btn-green">Buscar</button></form>
      <div className="card overflow-x-auto"><table className="tbl w-full">
        <thead><tr><th>Placa</th><th>Tipo</th><th>WhatsApp</th><th>Servicios</th><th>Último</th><th>Recordatorios</th></tr></thead>
        <tbody>{rows.map((v: any) => <tr key={v.placa}><td><Link className="font-extrabold tracking-widest text-selva" href={`/vehiculos/${v.placa}`}>{v.placa}</Link></td><td className="capitalize">{v.tipo}</td><td>{ocultarCelular(v.celular)}</td><td>{v.servicios}</td><td>{fechaCorta(v.ultimo)}</td><td>{v.autoriza_datos ? <span className="text-selva font-semibold">Autorizado</span> : <span className="text-gris">Pendiente</span>}</td></tr>)}
          {rows.length === 0 && <tr><td colSpan={6} className="text-gris">No hay vehículos {q ? `con placa ${q}` : ""}.</td></tr>}</tbody></table></div>
    </div>
  );
}
