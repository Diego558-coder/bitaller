import { describe, it, expect, beforeAll } from "vitest";
import crypto from "crypto";
import { initDb, type Db } from "@/lib/db";
import { seed } from "@/lib/seed";
import { registrarServicio, RegistroError } from "@/lib/servicios";
import { manejarEntrante, consultaPlaca, LIMITE_CONSULTAS_DIA } from "@/lib/bot";
import { enviarRecordatoriosPendientes } from "@/lib/recordatorios";
import { resumenSemana } from "@/lib/reportes";
import { firmaValida, extraerMensajes } from "@/lib/whatsapp/provider";
import { normalizarCelular, normalizarPlaca, esPlacaValida, cop, mondayOf } from "@/lib/format";

let db: Db; let tallerId: number; let duenoId: number; let andresId: number;
const ultimoOut = async (tel: string) => (await db.query(`SELECT * FROM mensajes WHERE telefono=$1 AND direccion='out' ORDER BY id DESC LIMIT 1`, [tel]))[0];

beforeAll(async () => {
  process.env.SEED_DEMO = "false"; process.env.WHATSAPP_MODE = "demo";
  db = await initDb({ memory: true });
  tallerId = await seed(db);
  duenoId = (await db.query(`SELECT id FROM usuarios WHERE rol='dueno'`))[0].id;
  andresId = (await db.query(`SELECT id FROM usuarios WHERE nombre='Andrés'`))[0].id;
});

describe("formatos", () => {
  it("normaliza placas y celulares", () => {
    expect(normalizarPlaca("xyz-45f")).toBe("XYZ45F");
    expect(esPlacaValida("ABC123")).toBe(true); expect(esPlacaValida("XYZ45F")).toBe(true); expect(esPlacaValida("AB12")).toBe(false);
    expect(normalizarCelular("310 123 4567")).toBe("573101234567");
    expect(cop(67000)).toBe("$67.000"); expect(mondayOf("2026-11-19")).toBe("2026-11-16");
  });
});

describe("registro de servicio", () => {
  it("crea vehículo nuevo, descuenta stock, calcula total y envía comprobante con solicitud de autorización", async () => {
    const stockAntes = (await db.query(`SELECT id, stock, precio FROM repuestos WHERE nombre='Aceite 20W-50 1 L'`))[0];
    const r = await registrarServicio(db, { tallerId, userId: andresId, rol: "mecanico" }, {
      placa: "qwe12r", celular: "3201112233", kilometraje: 10000, trabajos: ["Cambio de aceite"], manoObra: 15000,
      repuestos: [{ repuestoId: stockAntes.id, cantidad: 1 }], enviarComprobante: true,
    });
    expect(r.total).toBe(15000 + stockAntes.precio);
    expect(r.vehiculo.placa).toBe("QWE12R"); expect(r.vehiculo.tipo).toBe("moto");
    const stockDespues = (await db.query(`SELECT stock FROM repuestos WHERE id=$1`, [stockAntes.id]))[0].stock;
    expect(stockDespues).toBe(stockAntes.stock - 1);
    const m = await ultimoOut("573201112233");
    expect(m.tipo).toBe("comprobante"); expect(m.contenido).toContain("Responda *SÍ*"); expect(m.contenido).toContain("QWE12R");
    const rec = await db.query(`SELECT * FROM recordatorios WHERE vehiculo_id=$1 AND tipo='aceite' AND enviado_at IS NULL AND cancelado=false`, [r.vehiculo.id]);
    expect(rec.length).toBe(1); expect(rec[0].km_objetivo).toBe(13000);
  });
  it("exige celular si el vehículo es nuevo y valida stock", async () => {
    await expect(registrarServicio(db, { tallerId, userId: duenoId, rol: "dueno" }, { placa: "NEW123", trabajos: ["Frenos"], manoObra: 1000 })).rejects.toThrow(RegistroError);
    const filtro = (await db.query(`SELECT id, stock FROM repuestos WHERE nombre='Filtro de aire NS200'`))[0];
    await expect(registrarServicio(db, { tallerId, userId: duenoId, rol: "dueno" }, { placa: "XYZ45F", trabajos: ["Filtro de aire"], repuestos: [{ repuestoId: filtro.id, cantidad: filtro.stock + 5 }] })).rejects.toThrow(/Stock insuficiente/);
    const stock = (await db.query(`SELECT stock FROM repuestos WHERE id=$1`, [filtro.id]))[0].stock;
    expect(stock).toBe(filtro.stock); // la transacción no dejó cambios
  });
  it("vehículo autorizado no vuelve a recibir la pregunta de autorización", async () => {
    await registrarServicio(db, { tallerId, userId: duenoId, rol: "dueno" }, { placa: "XYZ45F", kilometraje: 18420, trabajos: ["Cambio de aceite", "Filtro de aire"], manoObra: 15000 });
    const m = await ultimoOut("573100000042");
    expect(m.contenido).not.toContain("Responda *SÍ*");
  });
});

describe("bot de WhatsApp", () => {
  it("SÍ registra la autorización", async () => {
    const resp = await manejarEntrante(db, "573201112233", "Sí");
    expect(resp).toContain("Registramos su autorización");
    const v = (await db.query(`SELECT autoriza_datos FROM vehiculos WHERE placa='QWE12R'`))[0];
    expect(v.autoriza_datos).toBe(true);
  });
  it("el dueño ve historial completo con precios y taller", async () => {
    const resp = await manejarEntrante(db, "573100000042", "historial XYZ45F");
    expect(resp).toContain("Historial de XYZ45F"); expect(resp).toContain("$"); expect(resp).toContain("Taller Motos La 16");
  });
  it("un tercero no ve nada si la consulta pública está desactivada", async () => {
    const r = await consultaPlaca(db, "573009998877", "XYZ45F");
    expect(r.nivel).toBe("ninguno");
  });
  it("con PÚBLICO SÍ un tercero ve fechas y trabajos sin precios ni taller", async () => {
    await manejarEntrante(db, "573100000042", "publico si");
    const r = await consultaPlaca(db, "573005554433", "XYZ45F");
    expect(r.nivel).toBe("publico"); expect(r.texto).not.toContain("$"); expect(r.texto).not.toContain("Taller Motos");
  });
  it("aplica el límite diario de consultas por número", async () => {
    let last: any;
    for (let i = 0; i < LIMITE_CONSULTAS_DIA + 1; i++) last = await consultaPlaca(db, "573111111111", "ABC123");
    expect(last.nivel).toBe("limite");
  });
  it("BAJA revoca y cancela recordatorios", async () => {
    await manejarEntrante(db, "573201112233", "baja");
    const pend = await db.query(`SELECT count(*)::int n FROM recordatorios r JOIN vehiculos v ON v.id=r.vehiculo_id WHERE v.placa='QWE12R' AND r.enviado_at IS NULL AND r.cancelado=false`);
    expect(pend[0].n).toBe(0);
  });
  it("mensaje desconocido responde ayuda", async () => {
    expect(await manejarEntrante(db, "573222222222", "hola")).toContain("asistente de *Bitaller*");
  });
});

describe("recordatorios", () => {
  it("envía solo pendientes vencidos de vehículos autorizados y no repite", async () => {
    const r1 = await enviarRecordatoriosPendientes(db, "2027-12-31");
    expect(r1.enviados).toBeGreaterThan(0); expect(r1.errores).toBe(0);
    const r2 = await enviarRecordatoriosPendientes(db, "2027-12-31");
    expect(r2.enviados).toBe(0);
  });
});

describe("reportes", () => {
  it("resumen semanal consistente", async () => {
    const r = await resumenSemana(db, tallerId, "2026-11-09");
    expect(r.porDia.length).toBe(7);
    expect(r.total).toBe(r.porDia.reduce((a, d) => a + d.ventas, 0));
    expect(r.porMecanico.reduce((a: number, m: any) => a + m.ventas, 0)).toBe(r.total);
    expect(r.servicios).toBeGreaterThan(20);
  });
});

describe("webhook de Meta", () => {
  it("valida la firma HMAC y extrae mensajes", () => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [{ changes: [{ value: { messages: [{ from: "573100000042", id: "wamid.1", type: "text", text: { body: "XYZ45F" } }] } }] }] });
    const sig = "sha256=" + crypto.createHmac("sha256", "secreto").update(body).digest("hex");
    expect(firmaValida(body, sig, "secreto")).toBe(true);
    expect(firmaValida(body, "sha256=00", "secreto")).toBe(false);
    expect(extraerMensajes(JSON.parse(body))).toEqual([{ from: "573100000042", text: "XYZ45F", id: "wamid.1" }]);
  });
});

describe("modo meta: plantilla sin aprobar", () => {
  it("deja el comprobante pendiente y lo envía cuando el cliente escribe", async () => {
    const prev = { ...process.env }; const realFetch = globalThis.fetch;
    Object.assign(process.env, { WHATSAPP_MODE: "meta", META_PHONE_NUMBER_ID: "1", META_ACCESS_TOKEN: "x", META_TEMPLATE_COMPROBANTE: "bitaller_comprobante" });
    const enviados: any[] = [];
    globalThis.fetch = (async (_u: any, init: any) => {
      const b = JSON.parse(init.body); enviados.push(b);
      if (b.type === "template") return new Response(JSON.stringify({ error: { message: "(#132001) Template name does not exist in the translation" } }), { status: 404 });
      return new Response(JSON.stringify({ messages: [{ id: "wamid." + enviados.length }] }), { status: 200 });
    }) as any;
    try {
      const r = await registrarServicio(db, { tallerId, userId: duenoId, rol: "dueno" }, { placa: "PEN12D", celular: "3159990001", trabajos: ["Cambio de aceite"], manoObra: 20000 });
      expect(r.envio?.ok).toBe(false);
      expect((await db.query(`SELECT comprobante_pendiente FROM servicios WHERE id=$1`, [r.servicio.id]))[0].comprobante_pendiente).toBe(true);
      await manejarEntrante(db, "573159990001", "hola", "wamid.in1");
      const texto = enviados.filter((b) => b.type === "text");
      expect(texto[0].text.body).toMatch(/Comprobante de servicio/);
      expect(texto[1].text.body).toMatch(/Arriba tiene su comprobante/);
      const s = (await db.query(`SELECT comprobante_enviado, comprobante_pendiente FROM servicios WHERE id=$1`, [r.servicio.id]))[0];
      expect(s.comprobante_enviado).toBe(true); expect(s.comprobante_pendiente).toBe(false);
    } finally { globalThis.fetch = realFetch; process.env = prev; }
  });
});
