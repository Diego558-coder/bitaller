import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { MasLinks } from "@/components/Nav";
import { logoutAction } from "../../actions";
import { whatsappMode } from "@/lib/whatsapp/provider";
export const dynamic = "force-dynamic";
export default async function Mas() {
  const s = await getSession(); if (!s) redirect("/login");
  return <div className="max-w-md mx-auto space-y-4"><h1 className="text-2xl font-extrabold">Menú</h1><MasLinks rol={s.rol} />
    {whatsappMode() === "demo" && <Link href="/demo/whatsapp" target="_blank" className="btn-ghost w-full">💬 Abrir simulador de WhatsApp</Link>}
    <Link href="/privacidad" className="btn-ghost w-full">Política de datos</Link>
    <form action={logoutAction}><button className="btn-ghost w-full">Cerrar sesión</button></form></div>;
}
