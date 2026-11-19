"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const ALL = [
  { href: "/resumen", label: "Resumen", icon: "📊", rol: "dueno" },
  { href: "/registrar", label: "Registrar servicio", short: "Registrar", icon: "➕" },
  { href: "/vehiculos", label: "Vehículos", icon: "🏍️" },
  { href: "/repuestos", label: "Repuestos", icon: "🔩" },
  { href: "/recordatorios", label: "Recordatorios", icon: "🔔", rol: "dueno" },
  { href: "/mecanicos", label: "Mecánicos", icon: "👥", rol: "dueno" },
  { href: "/configuracion", label: "Configuración", icon: "⚙️" },
];
export function NavLinks({ rol }: { rol: string }) {
  const p = usePathname();
  return <nav className="space-y-1">{ALL.filter((i) => !i.rol || i.rol === rol).map((i) => {
    const on = p.startsWith(i.href);
    return <Link key={i.href} href={i.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] ${on ? "bg-selva font-bold" : "text-white/75 hover:bg-white/10"}`}><span className="w-5 text-center">{i.icon}</span>{i.label}</Link>;
  })}</nav>;
}
export function BottomNav({ rol }: { rol: string }) {
  const p = usePathname();
  const base = rol === "dueno" ? ["/resumen", "/registrar", "/vehiculos", "/repuestos"] : ["/registrar", "/vehiculos", "/repuestos"];
  const items: { href: string; label: string; icon: string; short?: string }[] = [...base.map((h) => ALL.find((i) => i.href === h)!), { href: "/mas", label: "Más", icon: "☰" }];
  return <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-linea grid z-20" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
    {items.map((i) => { const on = p.startsWith(i.href) || (i.href === "/mas" && ["/mas", "/recordatorios", "/mecanicos", "/configuracion"].some((x) => p.startsWith(x))); return <Link key={i.href} href={i.href} className={`flex flex-col items-center py-2 text-xs ${on ? "text-selva font-bold" : "text-gris"}`}><span className={`h-1 w-7 rounded mb-1 ${on ? "bg-selva" : "bg-transparent"}`} /><span className="text-lg leading-none">{i.icon}</span>{i.short ?? i.label}</Link>; })}
  </nav>;
}
export function MasLinks({ rol }: { rol: string }) {
  return <div className="card divide-y divide-linea">{ALL.filter((i) => !i.rol || i.rol === rol).map((i) => <Link key={i.href} href={i.href} className="flex items-center gap-3 px-4 py-3.5"><span className="w-6 text-center">{i.icon}</span><span className="flex-1 font-medium">{i.label}</span><span className="text-gris">›</span></Link>)}</div>;
}
