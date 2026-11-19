"use client";
import { useActionState } from "react";
import { cambiarPasswordAction } from "../../actions";
export function CambiarPassword() {
  const [st, action, p] = useActionState(cambiarPasswordAction, null as any);
  return <form action={action} className="card p-4 grid sm:grid-cols-2 gap-3 items-end"><h2 className="font-bold sm:col-span-2">Cambiar contraseña</h2>
    <div><label className="label" htmlFor="a">Actual</label><input id="a" name="actual" type="password" className="input" required /></div>
    <div><label className="label" htmlFor="nv">Nueva</label><input id="nv" name="nueva" type="password" className="input" required minLength={6} /></div>
    <button className="btn-green sm:col-span-2" disabled={p}>Actualizar</button>
    {st?.error && <p className="text-sm text-red-600 sm:col-span-2">{st.error}</p>}{st?.ok && <p className="text-sm text-selva sm:col-span-2">{st.ok}</p>}</form>;
}
