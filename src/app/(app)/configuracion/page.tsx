import { metaConfig } from "@/lib/whatsapp/provider";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { whatsappMode } from "@/lib/whatsapp/provider";
import { guardarTallerAction, logoutAction } from "../../actions";
import { CambiarPassword } from "./CambiarPassword";
export const dynamic = "force-dynamic";
export default async function Configuracion() {
  const s = await getSession(); if (!s) redirect("/login");
  const db = await getDb();
  const t = (await db.query(`SELECT * FROM talleres WHERE id=$1`, [s.tallerId]))[0];
  const modo = whatsappMode(); const appUrl = (process.env.APP_URL || "").replace(/\/$/, "");
  const ok = (b: boolean) => b ? <span className="text-selva font-semibold">✓ configurado</span> : <span className="text-red-600 font-semibold">✗ falta</span>;
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-extrabold">Configuración</h1>
      {s.rol === "dueno" && <form action={guardarTallerAction} className="card p-4 grid sm:grid-cols-3 gap-3 items-end">
        <div className="sm:col-span-2"><label className="label" htmlFor="tn">Nombre del taller</label><input id="tn" name="nombre" className="input" defaultValue={t.nombre} /></div>
        <div><label className="label" htmlFor="tc">Ciudad</label><input id="tc" name="ciudad" className="input" defaultValue={t.ciudad} /></div>
        <button className="btn-green sm:col-span-3">Guardar</button></form>}
      {s.rol === "dueno" && <section className="card p-4 text-sm space-y-2">
        <h2 className="font-bold text-base">WhatsApp</h2>
        <p>Modo: <b>{modo === "demo" ? "Demostración (simulado dentro de la app)" : "Meta WhatsApp Cloud API"}</b></p>
        {modo === "meta" && <ul className="space-y-1"><li>Phone Number ID: {ok(!!process.env.META_PHONE_NUMBER_ID)}</li><li>Token de acceso: {ok(!!process.env.META_ACCESS_TOKEN)}</li><li>App Secret (firma del webhook): {ok(!!process.env.META_APP_SECRET)}</li><li>Plantilla de comprobante: {process.env.META_TEMPLATE_COMPROBANTE || <span className="text-gris">sin plantilla (texto libre)</span>}</li></ul>}
        <div className="bg-niebla rounded-xl p-3"><div className="label">URL del webhook para Meta</div><code className="break-all">{appUrl || "https://SU-DOMINIO"}/api/whatsapp/webhook</code>
          <div className="label mt-2">Token de verificación</div><code>{metaConfig().verifyToken}</code></div>
      </section>}
      <CambiarPassword />
      <form action={logoutAction}><button className="btn-ghost">Cerrar sesión</button></form>
    </div>
  );
}
