import fs from "fs";
import path from "path";

type Row = Record<string, any>;
export interface Db {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  tx<T>(fn: (q: Db) => Promise<T>): Promise<T>;
}

declare global { // eslint-disable-line
  var __bitallerDb: Promise<Db> | undefined;
}

function schemaSql() {
  return fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
}

async function createPglite(dir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = dir ? new PGlite(dir) : new PGlite();
  await pg.exec(schemaSql());
  const wrap = (exec: any): Db => ({
    async query(sql, params = []) { const r = await exec.query(sql, params as any[]); return r.rows as any[]; },
    async tx(fn) { return fn(this); },
  });
  const db: Db = {
    async query(sql, params = []) { const r = await pg.query(sql, params as any[]); return r.rows as any[]; },
    async tx(fn) { return pg.transaction(async (t: any) => fn(wrap(t))) as any; },
  };
  return db;
}

async function createPostgres(url: string): Promise<Db> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(url, { prepare: false, max: 5, ssl: (process.env.DB_SSL as any) || (url.includes("localhost") ? false : "prefer") });
  await sql.unsafe(schemaSql());
  const make = (s: any): Db => ({
    async query(q, params = []) { return (await s.unsafe(q, params as any[])) as any[]; },
    async tx(fn) { return s.begin((t: any) => fn(make(t))); },
  });
  return make(sql);
}

export async function initDb(opts: { memory?: boolean } = {}): Promise<Db> {
  let db: Db;
  if (process.env.DATABASE_URL) db = await createPostgres(process.env.DATABASE_URL);
  else if (opts.memory || process.env.NODE_ENV === "test") db = await createPglite();
  else {
    const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
    fs.mkdirSync(dir, { recursive: true });
    db = await createPglite(dir);
  }
  if ((process.env.SEED_DEMO ?? "true") === "true") {
    const { seedIfEmpty } = await import("./seed");
    await seedIfEmpty(db);
  }
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalThis.__bitallerDb) globalThis.__bitallerDb = initDb();
  return globalThis.__bitallerDb;
}
export function setDbForTests(db: Db) { globalThis.__bitallerDb = Promise.resolve(db); }
