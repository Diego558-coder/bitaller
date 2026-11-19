import { initDb } from "../src/lib/db";
import { enviarRecordatoriosPendientes } from "../src/lib/recordatorios";
(async () => { const db = await initDb(); console.log(await enviarRecordatoriosPendientes(db)); process.exit(0); })();
