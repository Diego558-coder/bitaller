"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogoIcon } from "@/components/Logo";

type Msg = { id: number; direccion: "in" | "out"; tipo: string; contenido: string; estado: string; created_at: string };
function md(t: string) {
  const esc = t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return esc.replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/(https?:\/\/\S+)/g, '<span class="text-[#027EB5] underline">$1</span>');
}
const hora = (d: string) => new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" });

export function Simulador({ inicial }: { inicial: string }) {
  const [tel, setTel] = useState(inicial.replace(/\D/g, ""));
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [tels, setTels] = useState<{ telefono: string; placa: string | null }[]>([]);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const r = await fetch(`/api/demo/messages?tel=${tel}`, { cache: "no-store" }); const j = await r.json();
    setMsgs(j.mensajes || []); setTels(j.telefonos || []);
  }, [tel]);
  useEffect(() => { load(); const i = setInterval(load, 2000); return () => clearInterval(i); }, [load]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);
  async function send(texto: string) {
    if (!texto.trim()) return; setBusy(true); setInput("");
    await fetch("/api/demo/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tel, texto }) });
    await load(); setBusy(false);
  }
  return (
    <main className="min-h-screen bg-[#d9dbd5] flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 p-4 lg:p-8">
      <section className="w-full max-w-sm lg:mt-6 space-y-3">
        <h1 className="text-xl font-extrabold">Simulador de WhatsApp</h1>
        <p className="text-sm text-gris">Así ve los mensajes el propietario del vehículo. Escriba como si fuera el cliente: <b>SÍ</b>, una placa (ej. <b>XYZ45F</b>), <b>PÚBLICO SÍ</b> o <b>BAJA</b>. En producción esto llega al WhatsApp real.</p>
        <label className="label" htmlFor="tel">Número del cliente</label>
        <input id="tel" className="input" value={tel} onChange={(e) => setTel(e.target.value.replace(/\D/g, ""))} />
        <div className="flex flex-wrap gap-2">{tels.map((t) => <button key={t.telefono} onClick={() => setTel(t.telefono)} className={`chip ${t.telefono === tel ? "chip-on" : "chip-off"}`}>{t.placa || "+" + t.telefono.slice(-4)}</button>)}</div>
        <div className="flex flex-wrap gap-2 pt-2">{["Sí", "XYZ45F", "Público sí", "Público no", "Hola"].map((q) => <button key={q} className="btn-ghost !py-1.5" onClick={() => send(q)} disabled={busy}>{q}</button>)}</div>
      </section>
      <div className="w-[390px] max-w-full h-[780px] rounded-[44px] bg-[#111] p-3 shadow-2xl">
        <div className="h-full rounded-[34px] overflow-hidden flex flex-col bg-[#EFE7DE]">
          <div className="bg-[#075E54] text-white px-3 pt-4 pb-2 flex items-center gap-3">
            <span className="text-2xl">‹</span><div className="bg-white rounded-full p-1"><LogoIcon size={30} /></div>
            <div><div className="font-bold text-[15px]">Bitaller ✔</div><div className="text-xs text-white/75">Cuenta de empresa</div></div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2" data-testid="chat">
            {msgs.length === 0 && <p className="text-center text-xs bg-[#FFF3C4] rounded-lg p-2 mx-6">Aún no hay mensajes para este número. Registre un servicio en el panel o escriba aquí.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-[13.5px] leading-snug shadow-sm whitespace-pre-wrap ${m.direccion === "in" ? "ml-auto bg-[#D9FDD3]" : "bg-white"}`}>
                <span dangerouslySetInnerHTML={{ __html: md(m.contenido) }} />
                <div className="text-[10.5px] text-[#667781] text-right mt-0.5">{hora(m.created_at)}{m.direccion === "in" ? " ✓✓" : ""}{m.estado?.startsWith("error") ? " ⚠ " + m.estado : ""}</div>
              </div>
            ))}
            <div ref={end} />
          </div>
          <form className="bg-[#F0F0F0] p-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input className="flex-1 rounded-full bg-white px-4 py-2.5 text-sm outline-none" placeholder="Mensaje" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Mensaje del cliente" />
            <button className="h-10 w-10 rounded-full bg-[#00A884] text-white" disabled={busy} aria-label="Enviar">➤</button>
          </form>
        </div>
      </div>
    </main>
  );
}
