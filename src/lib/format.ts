export const TZ_OFFSET_HOURS = -5; // America/Bogota (sin horario de verano)

export function cop(n: number | null | undefined): string {
  const v = Math.round(Number(n || 0));
  return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("es-CO").replace(/,/g, ".");
}
export function miles(n: number): string { return Math.round(n).toLocaleString("es-CO").replace(/,/g, "."); }

/** Fecha local de Bogotá en formato YYYY-MM-DD */
export function ymdBogota(d: Date | string = new Date()): string {
  const t = new Date(typeof d === "string" ? d : d.getTime());
  const local = new Date(t.getTime() + TZ_OFFSET_HOURS * 3600_000);
  return local.toISOString().slice(0, 10);
}
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
export function fechaCorta(d: Date | string): string {
  const ymd = typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ymdBogota(d);
  const [y, m, day] = ymd.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${MESES[m - 1]} ${y}`;
}
export function fechaHora(d: Date | string): string {
  const t = new Date(new Date(d).getTime() + TZ_OFFSET_HOURS * 3600_000);
  return `${fechaCorta(d)} ${String(t.getUTCHours()).padStart(2, "0")}:${String(t.getUTCMinutes()).padStart(2, "0")}`;
}
export function addDays(ymd: string, days: number): string {
  const d = new Date(ymd + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
/** Lunes de la semana (YYYY-MM-DD) a la que pertenece la fecha */
export function mondayOf(ymd: string): string {
  const d = new Date(ymd + "T12:00:00Z"); const dow = (d.getUTCDay() + 6) % 7; return addDays(ymd, -dow);
}
/** Inicio del día de Bogotá como instante UTC ISO */
export function bogotaDayStartUtc(ymd: string): string {
  return new Date(new Date(ymd + "T00:00:00Z").getTime() - TZ_OFFSET_HOURS * 3600_000).toISOString();
}
export const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function normalizarPlaca(p: string): string { return (p || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
export const PLACA_RE = /^[A-Z]{3}(\d{3}|\d{2}[A-Z])$/;
export function esPlacaValida(p: string) { return PLACA_RE.test(normalizarPlaca(p)); }
export function tipoPorPlaca(p: string): "moto" | "carro" { return /[A-Z]$/.test(normalizarPlaca(p)) ? "moto" : "carro"; }

/** Normaliza un celular colombiano a formato internacional sin "+" (ej. 573101234567) */
export function normalizarCelular(c: string): string {
  let d = (c || "").replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("3")) d = "57" + d;
  return d;
}
export function esCelularValido(c: string) { return /^\d{11,15}$/.test(normalizarCelular(c)); }
export function ocultarCelular(c: string): string {
  const d = normalizarCelular(c); if (d.length < 6) return d;
  return "+" + d.slice(0, 2) + " " + d.slice(2, 5) + " *** **" + d.slice(-2);
}
export function sinTildes(s: string) { return s.normalize("NFD").replace(/[̀-ͯ]/g, ""); }
