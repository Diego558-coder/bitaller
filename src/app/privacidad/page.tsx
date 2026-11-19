import Link from "next/link";
import { LogoIcon, Wordmark } from "@/components/Logo";
export const metadata = { title: "Política de tratamiento de datos · Bitaller" };
export default function Privacidad() {
  return (
    <main className="max-w-3xl mx-auto p-6 md:p-10 leading-relaxed">
      <Link href="/" className="flex items-center gap-2 mb-6"><LogoIcon size={36} /><Wordmark /></Link>
      <h1 className="text-2xl font-extrabold mb-4">Política de tratamiento de datos personales</h1>
      <div className="card p-6 space-y-3 text-[15px]">
        <p>Bitaller trata los datos personales de los propietarios de vehículos conforme a la Ley Estatutaria 1581 de 2012 y sus decretos reglamentarios.</p>
        <p><b>Datos que se tratan:</b> número de celular (WhatsApp), placa del vehículo y los servicios registrados por los talleres (fecha, trabajos, repuestos, kilometraje, precio y taller). No se solicita cédula ni otros datos de identificación.</p>
        <p><b>Finalidades:</b> enviar el comprobante de cada servicio, enviar recordatorios de mantenimiento y de vencimiento del SOAT y la revisión técnico-mecánica, y permitir que el titular consulte el historial de su vehículo.</p>
        <p><b>Autorización:</b> se solicita por WhatsApp; el titular la otorga respondiendo «SÍ». La fecha y hora de la autorización quedan registradas.</p>
        <p><b>Consulta por terceros:</b> solo si el titular la activa (mensaje «PÚBLICO SÍ»), otras personas pueden ver las fechas y los trabajos realizados, nunca los precios ni el taller. Hay un límite diario de consultas por número.</p>
        <p><b>Derechos del titular:</b> conocer, actualizar, rectificar y suprimir sus datos, y revocar la autorización en cualquier momento escribiendo «BAJA» al WhatsApp de Bitaller. Las quejas pueden presentarse ante la Superintendencia de Industria y Comercio.</p>
        <p><b>Seguridad:</b> cada taller solo accede a los servicios que registró; las comunicaciones viajan cifradas (HTTPS).</p>
      </div>
    </main>
  );
}
