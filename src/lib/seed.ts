import bcrypt from "bcryptjs";
import type { Db } from "./db";
import { addDays, bogotaDayStartUtc, ymdBogota } from "./format";

function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }

export const DEMO_PASSWORD = "bitaller123";

export async function seedIfEmpty(db: Db) {
  const n = (await db.query(`SELECT count(*)::int AS n FROM talleres`))[0].n;
  if (n > 0) return false;
  await seed(db);
  return true;
}

export async function seed(db: Db) {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const t = (await db.query(`INSERT INTO talleres (nombre, ciudad, plan) VALUES ('Taller Motos La 16','Florencia','basico') RETURNING id`))[0].id;
  const users: Record<string, number> = {};
  for (const [nombre, email, rol] of [["Nicolas", "nicolas@bitaller.co", "dueno"], ["Andrés", "andres@bitaller.co", "mecanico"], ["Carlos", "carlos@bitaller.co", "mecanico"], ["Jhon", "jhon@bitaller.co", "mecanico"]]) {
    users[nombre] = (await db.query(`INSERT INTO usuarios (taller_id, nombre, email, password_hash, rol) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [t, nombre, email, hash, rol]))[0].id;
  }
  const reps: Record<string, { id: number; precio: number }> = {};
  for (const [nombre, stock, min, precio] of [["Aceite 20W-50 1 L", 7, 4, 32000], ["Filtro de aire NS200", 2, 3, 20000], ["Pastillas de freno AKT 125", 3, 3, 28000], ["Bujía NGK CR7HSA", 4, 4, 15000], ["Kit de arrastre AKT 125", 6, 2, 165000], ["Filtro de aceite universal", 12, 4, 12000], ["Llanta 90/90-18", 5, 2, 145000], ["Bombillo farola H4", 9, 3, 9000]] as const) {
    reps[nombre] = (await db.query<{ id: number; precio: number }>(`INSERT INTO repuestos (taller_id, nombre, stock, stock_minimo, precio) VALUES ($1,$2,$3,$4,$5) RETURNING id, precio`, [t, nombre, stock, min, precio]))[0];
  }
  // Vehículo protagonista de la demo
  const xyz = (await db.query(`INSERT INTO vehiculos (placa, tipo, celular, autoriza_datos, autoriza_datos_at, consulta_publica, soat_vence, rtm_vence) VALUES ('XYZ45F','moto','573100000042',true,now(),false,'2026-12-03','2027-04-15') RETURNING id`))[0].id;
  const ins = async (veh: number, mec: string, ymd: string, hora: number, km: number | null, trabajos: string[], mano: number, repuestos: [string, number][], garantia = false) => {
    const fecha = new Date(new Date(bogotaDayStartUtc(ymd)).getTime() + hora * 3600_000).toISOString();
    const total = mano + repuestos.reduce((a, [r, c]) => a + reps[r].precio * c, 0);
    const s = (await db.query(`INSERT INTO servicios (taller_id, vehiculo_id, mecanico_id, fecha, kilometraje, trabajos, mano_obra, total, es_garantia, comprobante_enviado) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true) RETURNING id`,
      [t, veh, users[mec], fecha, km, trabajos, mano, total, garantia]))[0].id;
    for (const [r, c] of repuestos) await db.query(`INSERT INTO servicio_repuestos (servicio_id, repuesto_id, cantidad, precio_unitario) VALUES ($1,$2,$3,$4)`, [s, reps[r].id, c, reps[r].precio]);
    return total;
  };
  await ins(xyz, "Carlos", "2026-06-02", 10, 12100, ["Frenos"], 30000, [["Pastillas de freno AKT 125", 1]]);
  await ins(xyz, "Andrés", "2026-09-12", 9, 15380, ["Cambio de aceite"], 13000, [["Aceite 20W-50 1 L", 1]]);
  await db.query(`INSERT INTO recordatorios (vehiculo_id, taller_id, tipo, programado_para, km_objetivo, enviado_at) VALUES ($1,$2,'aceite','2026-11-11',18380, '2026-11-11T14:00:00Z')`, [xyz, t]);
  await db.query(`INSERT INTO recordatorios (vehiculo_id, taller_id, tipo, programado_para) VALUES ($1,$2,'soat','2026-11-26')`, [xyz, t]);
  // Flota de clientes
  const R = rng(42); const L = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const placa = () => { const a = Array.from({ length: 3 }, () => L[Math.floor(R() * L.length)]).join(""); const d = String(10 + Math.floor(R() * 89)); return R() < 0.82 ? a + d + L[Math.floor(R() * L.length)] : a + d + Math.floor(R() * 10); };
  const vehs: number[] = [];
  for (let i = 0; i < 60; i++) {
    const p = placa(); const cel = "5731" + String(10000000 + Math.floor(R() * 89999999));
    const auth = R() < 0.75;
    const r = await db.query(`INSERT INTO vehiculos (placa, tipo, celular, autoriza_datos, autoriza_datos_at, consulta_publica) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (placa) DO NOTHING RETURNING id`,
      [p, /[A-Z]$/.test(p) ? "moto" : "carro", cel, auth, auth ? new Date().toISOString() : null, auth && R() < 0.3]);
    if (r[0]) vehs.push(r[0].id);
  }
  const catalogo: { trabajos: string[]; mano: number; reps: [string, number][] }[] = [
    { trabajos: ["Cambio de aceite"], mano: 13000, reps: [["Aceite 20W-50 1 L", 1]] },
    { trabajos: ["Cambio de aceite", "Filtro de aire"], mano: 15000, reps: [["Aceite 20W-50 1 L", 1], ["Filtro de aire NS200", 1]] },
    { trabajos: ["Frenos"], mano: 25000, reps: [["Pastillas de freno AKT 125", 1]] },
    { trabajos: ["Sincronización"], mano: 45000, reps: [["Bujía NGK CR7HSA", 1]] },
    { trabajos: ["Revisión eléctrica"], mano: 30000, reps: [["Bombillo farola H4", 1]] },
    { trabajos: ["Kit de arrastre"], mano: 35000, reps: [["Kit de arrastre AKT 125", 1]] },
    { trabajos: ["Cambio de aceite"], mano: 12000, reps: [["Aceite 20W-50 1 L", 1], ["Filtro de aceite universal", 1]] },
    { trabajos: ["Suspensión"], mano: 60000, reps: [] },
  ];
  const mecs = ["Andrés", "Andrés", "Carlos", "Carlos", "Jhon"];
  const hoy = ymdBogota();
  const desde = "2026-09-28";
  const porDia = [5, 4, 7, 5, 8, 11, 2]; // lun..dom
  for (let d = desde; d <= hoy; d = addDays(d, 1)) {
    const dow = (new Date(d + "T12:00:00Z").getUTCDay() + 6) % 7;
    const cuantos = Math.max(0, Math.round(porDia[dow] * (0.7 + R() * 0.6)));
    for (let k = 0; k < cuantos; k++) {
      const c = catalogo[Math.floor(R() * catalogo.length)];
      const veh = vehs[Math.floor(R() * vehs.length)];
      await ins(veh, mecs[Math.floor(R() * mecs.length)], d, 8 + Math.floor(R() * 10), 5000 + Math.floor(R() * 40000), c.trabajos, c.mano, c.reps, R() < 0.03);
    }
  }
  // Recordatorios de ejemplo (enviados y pendientes)
  for (let i = 0; i < 40; i++) {
    const veh = vehs[Math.floor(R() * vehs.length)];
    const tipo = ["aceite", "aceite", "aceite", "soat", "rtm"][Math.floor(R() * 5)];
    const dia = addDays(hoy, Math.floor(R() * 14) - 20);
    const enviado = dia < hoy ? new Date(bogotaDayStartUtc(dia)).toISOString() : null;
    await db.query(`INSERT INTO recordatorios (vehiculo_id, taller_id, tipo, programado_para, enviado_at) VALUES ($1,$2,$3,$4,$5)`, [veh, t, tipo, dia, enviado]);
  }
  for (let i = 0; i < 30; i++) {
    const veh = vehs[Math.floor(R() * vehs.length)];
    const tipo = ["aceite", "aceite", "soat", "rtm"][Math.floor(R() * 4)];
    await db.query(`INSERT INTO recordatorios (vehiculo_id, taller_id, tipo, programado_para) VALUES ($1,$2,$3,$4)`, [veh, t, tipo, addDays(hoy, 1 + Math.floor(R() * 12))]);
  }
  return t;
}
