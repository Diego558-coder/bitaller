import "./globals.css";
import type { Metadata, Viewport } from "next";
export const metadata: Metadata = { title: "Bitaller · Cada servicio deja huella", description: "Registro de servicios para talleres de motos y carros con comprobantes y recordatorios por WhatsApp.", manifest: "/manifest.webmanifest", icons: { icon: "/icon.svg" } };
export const viewport: Viewport = { themeColor: "#1F7A5A", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body className="antialiased font-sans">{children}</body></html>;
}
