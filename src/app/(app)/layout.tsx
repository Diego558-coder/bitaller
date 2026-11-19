import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { LogoIcon, Wordmark } from "@/components/Logo";
import { NavLinks, BottomNav } from "@/components/Nav";
import { whatsappMode } from "@/lib/whatsapp/provider";
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const db = await getDb();
  const t = (await db.query(`SELECT nombre, plan FROM talleres WHERE id=$1`, [s.tallerId]))[0];
  const demo = whatsappMode() === "demo";
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden md:flex w-60 shrink-0 bg-grafito text-white flex-col p-4 sticky top-0 h-screen">
        <Link href="/" className="flex items-center gap-2 mb-8"><LogoIcon size={38} /><Wordmark light /></Link>
        <NavLinks rol={s.rol} />
        <div className="mt-auto border-t border-white/10 pt-4 text-sm">
          {demo && <Link href="/demo/whatsapp" target="_blank" className="block mb-3 rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20">💬 Abrir simulador de WhatsApp</Link>}
          <div className="font-bold">{t?.nombre}</div>
          <div className="text-white/60 text-xs">{s.nombre} · {s.rol === "dueno" ? "Dueño" : "Mecánico"} · Plan {t?.plan === "completo" ? "Completo" : "Básico"}</div>
        </div>
      </aside>
      <header className="md:hidden bg-selva text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <LogoIcon size={34} />
        <div className="leading-tight"><div className="font-extrabold">Bitaller</div><div className="text-xs text-white/80">{t?.nombre} · {s.nombre}</div></div>
        {demo && <Link href="/demo/whatsapp" target="_blank" className="ml-auto text-xs bg-white/15 rounded-lg px-2 py-1">💬 Demo</Link>}
      </header>
      <main className="flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-8">{children}</main>
      <BottomNav rol={s.rol} />
    </div>
  );
}
