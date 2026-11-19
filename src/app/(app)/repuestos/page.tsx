import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { cop } from "@/lib/format";
import { ajustarStockAction, guardarRepuestoAction } from "../../actions";
export const dynamic = "force-dynamic";
export default async function Repuestos() {
  const s = await getSession(); if (!s) redirect("/login");
  const db = await getDb();
  const rows = await db.query(`SELECT * FROM repuestos WHERE taller_id=$1 ORDER BY (stock <= stock_minimo) DESC, nombre`, [s.tallerId]);
  const dueno = s.rol === "dueno";
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-extrabold">Repuestos</h1>
      <p className="text-sm text-gris mb-4">Los repuestos usados en cada servicio se descuentan solos. En naranja, los que están en el mínimo o por debajo.</p>
      <div className="card overflow-x-auto"><table className="tbl w-full"><thead><tr><th>Repuesto</th><th>Stock</th><th>Mínimo</th><th>Precio</th>{dueno && <th>Ajustar</th>}</tr></thead>
        <tbody>{rows.map((r: any) => { const bajo = r.stock <= r.stock_minimo; return (
          <tr key={r.id}><td className="font-medium">{r.nombre}</td><td className={bajo ? "text-motor font-extrabold" : ""}>{r.stock}{bajo ? " ⚠" : ""}</td><td>{r.stock_minimo}</td><td>{cop(r.precio)}</td>
            {dueno && <td><div className="flex gap-1">{[-1, 1, 5].map((d) => <form key={d} action={ajustarStockAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="delta" value={d} /><button className="h-8 min-w-8 px-2 rounded-lg border border-linea text-sm hover:bg-niebla" aria-label={`Ajustar ${d} a ${r.nombre}`}>{d > 0 ? "+" + d : d}</button></form>)}</div></td>}</tr>); })}</tbody></table></div>
      {dueno && <form action={guardarRepuestoAction} className="card p-4 mt-4 grid sm:grid-cols-5 gap-3 items-end">
        <div className="sm:col-span-2"><label className="label" htmlFor="nombre">Nuevo repuesto (o compra de uno existente)</label><input id="nombre" name="nombre" className="input" required placeholder="Ej. Aceite 20W-50 1 L" /></div>
        <div><label className="label" htmlFor="stock">Cantidad</label><input id="stock" name="stock" type="number" min="0" className="input" required defaultValue={1} /></div>
        <div><label className="label" htmlFor="stock_minimo">Mínimo</label><input id="stock_minimo" name="stock_minimo" type="number" min="0" className="input" required defaultValue={2} /></div>
        <div><label className="label" htmlFor="precio">Precio de venta</label><input id="precio" name="precio" type="number" min="0" step="100" className="input" required defaultValue={0} /></div>
        <button className="btn-green sm:col-span-5">Guardar repuesto</button>
      </form>}
    </div>
  );
}
