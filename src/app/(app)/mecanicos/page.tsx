import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { toggleUsuarioAction } from "../../actions";
import { NuevoMecanico } from "./NuevoMecanico";
export const dynamic = "force-dynamic";
export default async function Mecanicos() {
  const s = await getSession(); if (!s) redirect("/login"); if (s.rol !== "dueno") redirect("/registrar");
  const db = await getDb();
  const rows = await db.query(`SELECT u.id, u.nombre, u.email, u.rol, u.activo, count(sv.id)::int AS servicios FROM usuarios u LEFT JOIN servicios sv ON sv.mecanico_id=u.id WHERE u.taller_id=$1 GROUP BY u.id ORDER BY u.rol DESC, u.nombre`, [s.tallerId]);
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold">Mecánicos</h1>
      <p className="text-sm text-gris mb-4">Cada mecánico tiene su usuario: registra servicios desde su celular, pero no ve los totales de ventas.</p>
      <div className="card overflow-x-auto"><table className="tbl w-full"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Servicios</th><th></th></tr></thead>
        <tbody>{rows.map((u: any) => <tr key={u.id} className={u.activo ? "" : "opacity-50"}><td className="font-medium">{u.nombre}</td><td>{u.email}</td><td>{u.rol === "dueno" ? "Dueño" : "Mecánico"}</td><td>{u.servicios}</td>
          <td>{u.rol === "mecanico" && <form action={toggleUsuarioAction}><input type="hidden" name="id" value={u.id} /><button className="text-sm text-selva font-semibold">{u.activo ? "Desactivar" : "Activar"}</button></form>}</td></tr>)}</tbody></table></div>
      <NuevoMecanico />
    </div>
  );
}
