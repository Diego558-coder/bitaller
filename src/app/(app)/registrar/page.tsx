import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { TRABAJOS } from "@/lib/servicios";
import { RegistroForm } from "./RegistroForm";
export const dynamic = "force-dynamic";
export default async function Registrar() {
  const s = await getSession(); if (!s) redirect("/login");
  const db = await getDb();
  const repuestos = await db.query(`SELECT id, nombre, stock, stock_minimo, precio FROM repuestos WHERE taller_id=$1 ORDER BY nombre`, [s.tallerId]);
  const mecanicos = await db.query(`SELECT id, nombre FROM usuarios WHERE taller_id=$1 AND activo ORDER BY rol DESC, nombre`, [s.tallerId]);
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-extrabold mb-1">Registrar servicio</h1>
      <p className="text-sm text-gris mb-4">{s.rol === "mecanico" ? `Registrando como ${s.nombre}` : "Complete los datos y guarde. El cliente recibe el comprobante por WhatsApp."}</p>
      <RegistroForm repuestos={repuestos as any} mecanicos={mecanicos as any} trabajos={TRABAJOS} rol={s.rol} userId={s.userId} />
    </div>
  );
}
