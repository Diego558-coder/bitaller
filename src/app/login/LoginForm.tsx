"use client";
import { useActionState, useState } from "react";
import { loginAction } from "../actions";
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null as any);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  return (
    <form action={action} className="space-y-4">
      <div><label className="label" htmlFor="email">Correo</label><input id="email" name="email" type="email" required className="input" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div><label className="label" htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required className="input" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      {state?.error && <p className="text-sm text-red-600" role="alert">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Ingresando…" : "Ingresar"}</button>
    </form>
  );
}
