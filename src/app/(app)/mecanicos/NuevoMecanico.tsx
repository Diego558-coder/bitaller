"use client";
import { useActionState, useEffect, useState } from "react";
import { crearMecanicoAction } from "../../actions";
export function NuevoMecanico() {
  const [st, action, p] = useActionState(crearMecanicoAction, null as any);
  const [f, setF] = useState({ nombre: "", email: "", password: "" });
  useEffect(() => { if (st?.ok) setF({ nombre: "", email: "", password: "" }); }, [st]);
  const on = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return <form action={action} className="card p-4 mt-4 grid sm:grid-cols-3 gap-3 items-end">
    <div><label className="label" htmlFor="n">Nombre</label><input id="n" name="nombre" className="input" required value={f.nombre} onChange={on("nombre")} /></div>
    <div><label className="label" htmlFor="e">Correo</label><input id="e" name="email" type="email" className="input" required value={f.email} onChange={on("email")} /></div>
    <div><label className="label" htmlFor="pw">Contraseña inicial</label><input id="pw" name="password" type="text" className="input" required minLength={6} value={f.password} onChange={on("password")} /></div>
    <button className="btn-green sm:col-span-3" disabled={p}>Agregar mecánico</button>
    {st?.error && <p className="text-sm text-red-600 sm:col-span-3">{st.error}</p>}{st?.ok && <p className="text-sm text-selva sm:col-span-3">{st.ok}</p>}
  </form>;
}
