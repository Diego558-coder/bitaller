"use client";
import { useState, useTransition } from "react";
import { enviarRecordatoriosAction } from "../../actions";
export function EnviarAhora() {
  const [msg, setMsg] = useState(""); const [p, start] = useTransition();
  return <div className="text-right"><button className="btn-green" disabled={p} onClick={() => start(async () => { const r = await enviarRecordatoriosAction(); setMsg(`${r.enviados} enviados${r.errores ? `, ${r.errores} con error` : ""}`); })}>{p ? "Enviando…" : "Enviar pendientes ahora"}</button>{msg && <p className="text-sm text-selva mt-1">{msg}</p>}</div>;
}
