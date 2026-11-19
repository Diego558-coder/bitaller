import fs from "fs"; import path from "path";
const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite");
if (!process.env.DATABASE_URL) { fs.rmSync(dir, { recursive: true, force: true }); console.log("Base local borrada. Se recreará con datos demo al iniciar."); }
else console.log("DATABASE_URL está definida: borre las tablas desde Supabase si de verdad quiere reiniciar.");
