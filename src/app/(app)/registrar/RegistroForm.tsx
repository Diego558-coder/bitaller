"use client";
import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { buscarPlacaAction, registrarAction, type RegistroResult } from "../../actions";

type Rep = { id: number; nombre: string; stock: number; stock_minimo: number; precio: number };
const fmt = (n: number) => "$" + Math.round(n).toLocaleString("es-CO").replace(/,/g, ".");
const PLACA_RE = /^[A-Z]{3}(\d{3}|\d{2}[A-Z])$/;

export function RegistroForm({ repuestos, mecanicos, trabajos, rol, userId }: { repuestos: Rep[]; mecanicos: { id: number; nombre: string }[]; trabajos: string[]; rol: string; userId: number }) {
  const [placa, setPlaca] = useState("");
  const [info, setInfo] = useState<Awaited<ReturnType<typeof buscarPlacaAction>> | null>(null);
  const [celular, setCelular] = useState("");
  const [km, setKm] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [otro, setOtro] = useState("");
  const [usados, setUsados] = useState<{ repuestoId: number; cantidad: number }[]>([]);
  const [repSel, setRepSel] = useState("");
  const [mano, setMano] = useState("");
  const [mecanico, setMecanico] = useState(String(userId));
  const [garantia, setGarantia] = useState(false);
  const [masDatos, setMasDatos] = useState(false);
  const [soat, setSoat] = useState(""); const [rtm, setRtm] = useState("");
  const [enviar, setEnviar] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<RegistroResult | null>(null);
  const [pending, start] = useTransition();
  const lastLookup = useRef("");

  const total = useMemo(() => (Number(mano) || 0) + usados.reduce((a, u) => a + u.cantidad * (repuestos.find((r) => r.id === u.repuestoId)?.precio || 0), 0), [mano, usados, repuestos]);
  const placaOk = PLACA_RE.test(placa);

  function onPlaca(v: string) {
    const p = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    setPlaca(p); setInfo(null);
    if (PLACA_RE.test(p) && lastLookup.current !== p) {
      lastLookup.current = p;
      buscarPlacaAction(p).then((r) => { if (lastLookup.current === p) { setInfo(r); if (r.existe) { setSoat(r.soat); setRtm(r.rtm); } } }).catch(() => {});
    }
  }
  function addRep() {
    const id = Number(repSel); if (!id) return;
    setUsados((u) => u.some((x) => x.repuestoId === id) ? u.map((x) => x.repuestoId === id ? { ...x, cantidad: x.cantidad + 1 } : x) : [...u, { repuestoId: id, cantidad: 1 }]);
    setRepSel("");
  }
  function reset() { setPlaca(""); setInfo(null); setCelular(""); setKm(""); setSel([]); setOtro(""); setUsados([]); setMano(""); setGarantia(false); setSoat(""); setRtm(""); setEnviar(true); setRes(null); setError(null); lastLookup.current = ""; }

  function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    start(async () => {
      const r = await registrarAction({ placa, celular, kilometraje: km ? Number(km.replace(/\D/g, "")) : null, trabajos: sel, otroTrabajo: otro, repuestos: usados, manoObra: Number(mano) || 0, mecanicoId: Number(mecanico), esGarantia: garantia, soatVence: soat, rtmVence: rtm, enviarComprobante: enviar });
      if (r.ok) setRes(r); else setError(r.error);
    });
  }

  if (res?.ok) return (
    <div className="card p-6 text-center" data-testid="registro-ok">
      <div className="text-5xl mb-2">✅</div>
      <h2 className="text-xl font-extrabold">Servicio guardado</h2>
      <p className="mt-2"><b className="tracking-widest">{res.placa}</b> · {res.trabajos}</p>
      <p className="text-2xl font-extrabold mt-2">{res.total}</p>
      <p className={`mt-3 text-sm ${res.envioOk ? "text-selva" : "text-red-600"}`}>{res.envio}</p>
      <div className="flex flex-col gap-2 mt-5">
        <button className="btn-primary" onClick={reset}>Registrar otro servicio</button>
        {res.demo && <Link className="btn-ghost" href={`/demo/whatsapp?tel=${res.telefono}`} target="_blank">Ver lo que recibió el cliente 💬</Link>}
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="placa">Placa</label><input id="placa" className="input font-extrabold tracking-[0.2em] uppercase" placeholder="ABC12D" value={placa} onChange={(e) => onPlaca(e.target.value)} required autoComplete="off" /></div>
        <div><label className="label" htmlFor="km">Kilometraje</label><input id="km" className="input" inputMode="numeric" placeholder="18420" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ""))} /></div>
      </div>
      {placa.length >= 5 && !placaOk && <p className="text-xs text-red-600">Formato de placa: ABC123 (carro) o ABC12D (moto).</p>}
      {info?.existe && <div className="rounded-xl bg-selva-soft text-selva-dark text-sm px-3 py-2">✓ Vehículo conocido · WhatsApp {info.celular}{info.ultimo ? ` · último servicio aquí: ${info.ultimo}` : ""}{info.autorizado ? " · recordatorios autorizados" : " · sin autorización de recordatorios"}</div>}
      {info && !info.existe && <div className="rounded-xl bg-[#FFF4E8] text-[#8A4B0F] text-sm px-3 py-2">Vehículo nuevo: se creará con esta placa y el celular de quien lo trae.</div>}
      <div><label className="label" htmlFor="cel">Celular del cliente (WhatsApp){info?.existe ? " · opcional, solo si cambió" : ""}</label>
        <input id="cel" className="input" inputMode="tel" placeholder="310 123 4567" value={celular} onChange={(e) => setCelular(e.target.value)} required={info ? !info.existe : false} /></div>
      <div><span className="label">Trabajo realizado</span>
        <div className="flex flex-wrap gap-2">{trabajos.map((t) => { const on = sel.includes(t); return <button type="button" key={t} aria-pressed={on} className={`chip ${on ? "chip-on" : "chip-off"}`} onClick={() => setSel((s) => on ? s.filter((x) => x !== t) : [...s, t])}>{t}</button>; })}</div>
        <input className="input mt-2" placeholder="Otro trabajo (opcional)" value={otro} onChange={(e) => setOtro(e.target.value)} aria-label="Otro trabajo" /></div>
      <div><span className="label">Repuestos usados (del inventario)</span>
        <div className="card divide-y divide-linea">
          {usados.length === 0 && <p className="text-sm text-gris px-3 py-2.5">Sin repuestos</p>}
          {usados.map((u) => { const r = repuestos.find((x) => x.id === u.repuestoId)!; const queda = r.stock - u.cantidad; return (
            <div key={u.repuestoId} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1">{r.nombre} <span className="text-gris">· {fmt(r.precio)}</span></span>
              <button type="button" className="h-7 w-7 rounded-lg border border-linea" onClick={() => setUsados((x) => x.flatMap((y) => y.repuestoId !== u.repuestoId ? [y] : y.cantidad > 1 ? [{ ...y, cantidad: y.cantidad - 1 }] : []))} aria-label={`Quitar uno de ${r.nombre}`}>−</button>
              <b className="w-5 text-center">{u.cantidad}</b>
              <button type="button" className="h-7 w-7 rounded-lg border border-linea" disabled={queda <= 0} onClick={() => setUsados((x) => x.map((y) => y.repuestoId === u.repuestoId ? { ...y, cantidad: y.cantidad + 1 } : y))} aria-label={`Agregar uno de ${r.nombre}`}>+</button>
              <span className={`w-20 text-right text-xs ${queda <= r.stock_minimo ? "text-motor font-bold" : "text-gris"}`}>quedan {queda}{queda <= r.stock_minimo ? " ⚠" : ""}</span>
            </div>); })}
          <div className="flex gap-2 p-2">
            <select className="input !py-2" value={repSel} onChange={(e) => setRepSel(e.target.value)} aria-label="Elegir repuesto">
              <option value="">Agregar repuesto…</option>
              {repuestos.filter((r) => r.stock - (usados.find((u) => u.repuestoId === r.id)?.cantidad || 0) > 0).map((r) => <option key={r.id} value={r.id}>{r.nombre} · {fmt(r.precio)} (hay {r.stock})</option>)}
            </select>
            <button type="button" className="btn-green" onClick={addRep} disabled={!repSel}>Agregar</button>
          </div>
        </div></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="mano">Mano de obra</label><input id="mano" className="input" inputMode="numeric" placeholder="15000" value={mano} onChange={(e) => setMano(e.target.value.replace(/\D/g, ""))} /></div>
        <div><span className="label">Total</span><div className="input font-extrabold bg-niebla" data-testid="total">{fmt(total)}</div></div>
      </div>
      {rol === "dueno" && <div><label className="label" htmlFor="mec">Mecánico que hizo el trabajo</label><select id="mec" className="input" value={mecanico} onChange={(e) => setMecanico(e.target.value)}>{mecanicos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>}
      <button type="button" className="text-sm text-selva font-semibold" onClick={() => setMasDatos((v) => !v)}>{masDatos ? "− Ocultar" : "+ Garantía y vencimientos (SOAT / tecnomecánica)"}</button>
      {masDatos && <div className="card p-3 space-y-3">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={garantia} onChange={(e) => setGarantia(e.target.checked)} /> Es una garantía (trabajo repetido sin costo)</label>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="soat">SOAT vence</label><input id="soat" type="date" className="input" value={soat} onChange={(e) => setSoat(e.target.value)} /></div>
          <div><label className="label" htmlFor="rtm">Tecnomecánica vence</label><input id="rtm" type="date" className="input" value={rtm} onChange={(e) => setRtm(e.target.value)} /></div>
        </div></div>}
      <label className="flex items-center justify-between text-sm font-medium"><span>Enviar comprobante por WhatsApp</span>
        <input type="checkbox" role="switch" className="h-6 w-11 appearance-none rounded-full bg-[#ccc] checked:bg-selva relative cursor-pointer transition before:content-[''] before:absolute before:top-[3px] before:left-[3px] before:h-[18px] before:w-[18px] before:rounded-full before:bg-white before:transition checked:before:translate-x-5" checked={enviar} onChange={(e) => setEnviar(e.target.checked)} /></label>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2" role="alert">{error}</p>}
      <button className="btn-primary w-full !py-3.5 !text-base" disabled={pending || !placaOk}>{pending ? "Guardando…" : enviar ? "Guardar y enviar" : "Guardar"}</button>
    </form>
  );
}
