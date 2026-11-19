import { cop, fechaCorta, miles } from "./format";

export const LEY = "Ley 1581 de 2012";
export function textoComprobante(p: { placa: string; fecha: string | Date; trabajos: string[]; repuestos: { nombre: string; cantidad: number }[]; km?: number | null; mecanico?: string | null; total: number; taller: string; pedirAutorizacion: boolean; appUrl?: string; }) {
  const lineas = [
    "✅ *Comprobante de servicio · Bitaller*",
    `Placa: *${p.placa}* · ${fechaCorta(p.fecha)}`,
    `Trabajo: ${p.trabajos.join(", ") || "Servicio general"}`,
  ];
  if (p.repuestos.length) lineas.push(`Repuestos: ${p.repuestos.map((r) => `${r.nombre} ×${r.cantidad}`).join(", ")}`);
  lineas.push(`Kilometraje: ${p.km != null ? miles(p.km) : "-"}${p.mecanico ? " · Mecánico: " + p.mecanico : ""}`);
  lineas.push(`Total: *${cop(p.total)}* · ${p.taller}`);
  if (p.pedirAutorizacion) {
    lineas.push("", `¿Acepta recibir recordatorios de mantenimiento, SOAT y tecnomecánica, y que guardemos el historial de su vehículo? (${LEY}). Responda *SÍ* para aceptar.`);
    if (p.appUrl) lineas.push(`Política de datos: ${p.appUrl.replace(/\/$/, "")}/privacidad`);
  }
  return lineas.join("\n");
}
export function paramsComprobante(p: { placa: string; fecha: string | Date; trabajos: string[]; total: number; taller: string }) {
  return [p.taller, p.placa, fechaCorta(p.fecha), p.trabajos.join(", ") || "Servicio general", cop(p.total)];
}
export const AYUDA = [
  "👋 Hola, soy el asistente de *Bitaller*.",
  "• Escriba una *placa* (ej. XYZ45F) para consultar el historial del vehículo.",
  "• *SÍ*: autorizar recordatorios y el historial (" + LEY + ").",
  "• *PÚBLICO SÍ* / *PÚBLICO NO*: permitir o no que otras personas vean las fechas y trabajos de su vehículo (sin precios ni taller).",
  "• *BAJA*: dejar de recibir mensajes y revocar la autorización.",
].join("\n");
export function textoRecordatorio(tipo: string, placa: string, extra: { km?: number | null; fecha?: string }) {
  if (tipo === "aceite") return `🔔 *Recordatorio Bitaller*\nA su vehículo *${placa}* le toca cambio de aceite${extra.km ? ` cerca de los ${miles(extra.km)} km` : ""}. ¡Agende su servicio!`;
  if (tipo === "soat") return `🔔 *Recordatorio Bitaller*\nEl SOAT de *${placa}* vence el ${extra.fecha ? fechaCorta(extra.fecha) : "pronto"}. Renuévelo a tiempo y evite multas.`;
  return `🔔 *Recordatorio Bitaller*\nLa revisión técnico-mecánica de *${placa}* vence el ${extra.fecha ? fechaCorta(extra.fecha) : "pronto"}.`;
}
