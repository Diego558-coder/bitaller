import { z } from "zod";
import type { Db } from "./db";
import { addDays, esCelularValido, esPlacaValida, normalizarCelular, normalizarPlaca, tipoPorPlaca, ymdBogota } from "./format";
import { paramsComprobante, textoComprobante } from "./mensajes";
import { sendWhatsApp } from "./whatsapp/provider";

export const TRABAJOS = ["Cambio de aceite", "Filtro de aire", "Frenos", "Kit de arrastre", "Sincronización", "Llantas", "Revisión eléctrica", "Suspensión"];

export const RegistroSchema = z.object({
  placa: z.string().transform(normalizarPlaca).refine(esPlacaValida, "Placa no válida (ej. ABC123 o ABC12D)"),
  celular: z.string().optional().default(""),
  kilometraje: z.coerce.number().int().min(0).max(2_000_000).nullable().optional(),
  trabajos: z.array(z.string().min(1)).default([]),
  otroTrabajo: z.string().optional().default(""),
  repuestos: z.array(z.object({ repuestoId: z.coerce.number().int(), cantidad: z.coerce.number().int().min(1) })).default([]),
  manoObra: z.coerce.number().int().min(0).default(0),
  mecanicoId: z.coerce.number().int().optional().nullable(),
  esGarantia: z.boolean().default(false),
  soatVence: z.string().optional().default(""),
  rtmVence: z.string().optional().default(""),
  enviarComprobante: z.boolean().default(true),
  notas: z.string().optional().default(""),
});
export type RegistroInput = z.input<typeof RegistroSchema>;

export class RegistroError extends Error {}

export async function buscarVehiculo(db: Db, placa: string, tallerId: number) {
  const p = normalizarPlaca(placa);
  const v = (await db.query(`SELECT * FROM vehiculos WHERE placa=$1`, [p]))[0];
  if (!v) return null;
  const ultimo = (await db.query(`SELECT fecha, trabajos, kilometraje FROM servicios WHERE vehiculo_id=$1 AND taller_id=$2 ORDER BY fecha DESC LIMIT 1`, [v.id, tallerId]))[0] || null;
  return { vehiculo: v, ultimoEnTaller: ultimo };
}

export async function registrarServicio(db: Db, s: { tallerId: number; userId: number; rol: string }, raw: RegistroInput) {
  const input = RegistroSchema.parse(raw);
  const trabajos = [...input.trabajos, ...(input.otroTrabajo.trim() ? [input.otroTrabajo.trim()] : [])];
  if (!trabajos.length) throw new RegistroError("Seleccione al menos un trabajo realizado");
  const mecanicoId = s.rol === "mecanico" ? s.userId : (input.mecanicoId || s.userId);

  const res = await db.tx(async (q) => {
    // mecánico debe pertenecer al taller
    const mec = (await q.query(`SELECT id, nombre FROM usuarios WHERE id=$1 AND taller_id=$2`, [mecanicoId, s.tallerId]))[0];
    if (!mec) throw new RegistroError("Mecánico no válido");
    let v = (await q.query(`SELECT * FROM vehiculos WHERE placa=$1`, [input.placa]))[0];
    const cel = input.celular ? normalizarCelular(input.celular) : "";
    if (cel && !esCelularValido(cel)) throw new RegistroError("Celular no válido");
    if (!v) {
      if (!cel) throw new RegistroError("Vehículo nuevo: ingrese el celular (WhatsApp) de quien lo trae");
      v = (await q.query(`INSERT INTO vehiculos (placa, tipo, celular) VALUES ($1,$2,$3) RETURNING *`, [input.placa, tipoPorPlaca(input.placa), cel]))[0];
    } else if (cel && cel !== v.celular) {
      // cambia el número: la autorización anterior no aplica al nuevo número
      v = (await q.query(`UPDATE vehiculos SET celular=$2, autoriza_datos=false, autoriza_datos_at=NULL, consulta_publica=false WHERE id=$1 RETURNING *`, [v.id, cel]))[0];
    }
    // repuestos
    const usados: { id: number; nombre: string; cantidad: number; precio: number }[] = [];
    for (const r of input.repuestos) {
      const rep = (await q.query(`SELECT id, nombre, stock, precio FROM repuestos WHERE id=$1 AND taller_id=$2 FOR UPDATE`, [r.repuestoId, s.tallerId]))[0];
      if (!rep) throw new RegistroError("Repuesto no encontrado");
      if (rep.stock < r.cantidad) throw new RegistroError(`Stock insuficiente de ${rep.nombre} (quedan ${rep.stock})`);
      const ya = usados.find((u) => u.id === rep.id);
      if (ya) ya.cantidad += r.cantidad; else usados.push({ id: rep.id, nombre: rep.nombre, cantidad: r.cantidad, precio: rep.precio });
    }
    const total = input.manoObra + usados.reduce((a, u) => a + u.cantidad * u.precio, 0);
    const srv = (await q.query(`INSERT INTO servicios (taller_id, vehiculo_id, mecanico_id, kilometraje, trabajos, notas, mano_obra, total, es_garantia)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [s.tallerId, v.id, mec.id, input.kilometraje ?? null, trabajos, input.notas || null, input.manoObra, total, input.esGarantia]))[0];
    for (const u of usados) {
      await q.query(`INSERT INTO servicio_repuestos (servicio_id, repuesto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)`, [srv.id, u.id, u.cantidad, u.precio]);
      await q.query(`UPDATE repuestos SET stock = stock - $2 WHERE id=$1`, [u.id, u.cantidad]);
    }
    // recordatorios
    const hoy = ymdBogota(srv.fecha);
    if (trabajos.some((t) => /aceite/i.test(t))) {
      await q.query(`UPDATE recordatorios SET cancelado=true WHERE vehiculo_id=$1 AND tipo='aceite' AND enviado_at IS NULL`, [v.id]);
      await q.query(`INSERT INTO recordatorios (vehiculo_id, taller_id, tipo, programado_para, km_objetivo) VALUES ($1,$2,'aceite',$3,$4)`,
        [v.id, s.tallerId, addDays(hoy, 60), input.kilometraje != null ? input.kilometraje + 3000 : null]);
    }
    for (const [campo, tipo, valor] of [["soat_vence", "soat", input.soatVence], ["rtm_vence", "rtm", input.rtmVence]] as const) {
      if (valor && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        await q.query(`UPDATE vehiculos SET ${campo}=$2 WHERE id=$1`, [v.id, valor]);
        await q.query(`UPDATE recordatorios SET cancelado=true WHERE vehiculo_id=$1 AND tipo=$2 AND enviado_at IS NULL`, [v.id, tipo]);
        const aviso = addDays(valor, -7) < hoy ? hoy : addDays(valor, -7);
        await q.query(`INSERT INTO recordatorios (vehiculo_id, taller_id, tipo, programado_para) VALUES ($1,$2,$3,$4)`, [v.id, s.tallerId, tipo, aviso]);
      }
    }
    const taller = (await q.query(`SELECT nombre FROM talleres WHERE id=$1`, [s.tallerId]))[0];
    return { servicio: srv, vehiculo: v, usados, mecanico: mec.nombre as string, taller: taller.nombre as string, trabajos, total };
  });

  let envio: Awaited<ReturnType<typeof sendWhatsApp>> | null = null;
  if (input.enviarComprobante) {
    const p = { placa: res.vehiculo.placa, fecha: res.servicio.fecha, trabajos: res.trabajos, total: res.total, taller: res.taller };
    envio = await sendWhatsApp(db, {
      to: res.vehiculo.celular, tipo: "comprobante", vehiculoId: res.vehiculo.id,
      text: textoComprobante({ ...p, repuestos: res.usados, km: res.servicio.kilometraje, mecanico: res.mecanico, pedirAutorizacion: !res.vehiculo.autoriza_datos, appUrl: process.env.APP_URL }),
      template: process.env.META_TEMPLATE_COMPROBANTE ? { name: process.env.META_TEMPLATE_COMPROBANTE, params: paramsComprobante(p) } : null,
    });
    if (envio.ok) await db.query(`UPDATE servicios SET comprobante_enviado=true WHERE id=$1`, [res.servicio.id]);
  }
  return { ...res, envio };
}
