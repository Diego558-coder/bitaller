import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { resumenSemana } from "@/lib/reportes";
import { addDays, cop, DIAS, fechaCorta, mondayOf, ymdBogota } from "@/lib/format";
export const dynamic = "force-dynamic";

export default async function Resumen({ searchParams }: { searchParams: Promise<{ semana?: string }> }) {
  const s = await getSession(); if (!s) redirect("/login");
  if (s.rol !== "dueno") redirect("/registrar");
  const sp = await searchParams;
  const lunes = mondayOf(sp.semana && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana) ? sp.semana : ymdBogota());
  const db = await getDb();
  const t = (await db.query(`SELECT nombre FROM talleres WHERE id=$1`, [s.tallerId]))[0];
  const r = await resumenSemana(db, s.tallerId, lunes);
  const max = Math.max(1, ...r.porDia.map((d) => d.ventas));
  const mejorIdx = r.porDia.findIndex((d) => d.dia === r.mejor.dia);
  const esActual = lunes === mondayOf(ymdBogota());
  const kpi = (titulo: string, valor: string, detalle: string) => (
    <div className="card p-4"><div className="text-xs font-semibold text-gris">{titulo}</div><div className="text-2xl md:text-3xl font-extrabold mt-1">{valor}</div><div className="text-xs text-selva mt-1">{detalle}</div></div>
  );
  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">Resumen de ventas</h1>
          <p className="text-gris text-sm mt-1">{t.nombre} · semana del {fechaCorta(lunes)} al {fechaCorta(addDays(lunes, 6))}</p>
        </div>
        <div className="flex gap-2">
          <Link className="btn-ghost" href={`/resumen?semana=${addDays(lunes, -7)}`}>← Anterior</Link>
          {!esActual && <Link className="btn-ghost" href={`/resumen?semana=${addDays(lunes, 7)}`}>Siguiente →</Link>}
          <Link className="btn-primary" href="/registrar">+ Registrar servicio</Link>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {kpi("Mejor día", cop(r.mejor.ventas), r.mejor.ventas ? `${DIAS[mejorIdx].toLowerCase()} · ${r.mejor.servicios} servicios` : "sin ventas")}
        {kpi("Ventas de la semana", cop(r.total), `${r.servicios} servicios${r.variacion != null ? ` · ${r.variacion >= 0 ? "+" : ""}${Math.round(r.variacion * 100)} % vs semana anterior` : ""}`)}
        {kpi("Clientes que volvieron", String(r.volvieron), "tras un recordatorio (últimos 30 días)")}
        {kpi("Comprobantes enviados", String(r.comprobantes), r.servicios ? `${Math.round((r.comprobantes / r.servicios) * 100)} % de los servicios` : "-")}
      </div>
      <div className="grid lg:grid-cols-5 gap-3 mt-3">
        <section className="card p-4 lg:col-span-3">
          <h2 className="font-bold">Ventas por día (miles de pesos)</h2>
          <div className="flex items-end gap-2 md:gap-4 h-52 mt-4 border-b border-[#ccc] px-1" role="img" aria-label="Gráfico de ventas por día">
            {r.porDia.map((d, i) => (
              <div key={d.dia} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div className="absolute -top-1 opacity-0 group-hover:opacity-100 text-[11px] bg-grafito text-white rounded px-1.5 py-0.5 whitespace-nowrap -translate-y-full">{cop(d.ventas)} · {d.servicios} serv.</div>
                <div className={`w-full max-w-11 rounded-t-md ${i === mejorIdx && d.ventas ? "bg-motor" : "bg-selva"}`} style={{ height: `${(d.ventas / max) * 100}%`, minHeight: d.ventas ? 4 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex gap-2 md:gap-4 px-1 mt-1">{r.porDia.map((d, i) => <div key={d.dia} className="flex-1 text-center"><div className="text-xs font-semibold">{DIAS[i]}</div><div className="text-[11px] text-gris">${Math.round(d.ventas / 1000)}k</div></div>)}</div>
        </section>
        <section className="card p-4 lg:col-span-2 overflow-x-auto">
          <h2 className="font-bold mb-2">Ventas por mecánico</h2>
          <table className="tbl w-full"><thead><tr><th>Mecánico</th><th>Servicios</th><th>Garantías</th><th className="!text-right">Ventas</th></tr></thead>
            <tbody>{r.porMecanico.map((m: any) => <tr key={m.nombre}><td className="font-medium">{m.nombre}</td><td>{m.servicios}</td><td>{m.garantias}</td><td className="text-right font-bold">{cop(m.ventas)}</td></tr>)}</tbody></table>
          <p className="text-xs text-selva font-semibold mt-3">Total semana: {cop(r.total)} · {r.servicios} servicios</p>
        </section>
      </div>
      <div className="grid md:grid-cols-2 gap-3 mt-3">
        <section className="card p-4">
          <h2 className="font-bold mb-2">⚠️ Repuestos por agotarse</h2>
          {r.bajos.length === 0 ? <p className="text-sm text-gris">Todo el inventario está por encima del mínimo.</p> :
            <ul className="divide-y divide-linea">{r.bajos.map((b: any) => <li key={b.nombre} className="flex justify-between py-2 text-sm"><span>{b.nombre}</span><b className="text-motor">{b.stock} {b.stock === 1 ? "unidad" : "unidades"}</b></li>)}</ul>}
          <Link href="/repuestos" className="text-sm text-selva font-semibold mt-2 inline-block">Ver inventario →</Link>
        </section>
        <section className="card p-4">
          <h2 className="font-bold mb-2">🔔 Recordatorios de esta semana</h2>
          <ul className="divide-y divide-linea text-sm">
            <li className="flex justify-between py-2"><span>Cambio de aceite</span><b>{r.recordatorios.aceite} {r.recordatorios.aceite === 1 ? "cliente" : "clientes"}</b></li>
            <li className="flex justify-between py-2"><span>SOAT por vencer</span><b>{r.recordatorios.soat} {r.recordatorios.soat === 1 ? "cliente" : "clientes"}</b></li>
            <li className="flex justify-between py-2"><span>Revisión técnico-mecánica</span><b>{r.recordatorios.rtm} {r.recordatorios.rtm === 1 ? "cliente" : "clientes"}</b></li>
          </ul>
          <Link href="/recordatorios" className="text-sm text-selva font-semibold mt-2 inline-block">Ver recordatorios →</Link>
        </section>
      </div>
    </div>
  );
}
