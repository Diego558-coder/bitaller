import { Simulador } from "./Simulador";
import { whatsappMode } from "@/lib/whatsapp/provider";
export const dynamic = "force-dynamic";
export const metadata = { title: "Simulador de WhatsApp · Bitaller" };
export default async function Page({ searchParams }: { searchParams: Promise<{ tel?: string }> }) {
  const tel = (await searchParams).tel || "573100000042";
  if (whatsappMode() !== "demo" && process.env.ALLOW_DEMO !== "true") return <main className="p-8">El simulador solo está disponible en modo demo.</main>;
  return <Simulador inicial={tel} />;
}
