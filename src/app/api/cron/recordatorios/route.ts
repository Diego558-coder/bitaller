import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { enviarRecordatoriosPendientes } from "@/lib/recordatorios";
export const dynamic = "force-dynamic";
async function handle(req: NextRequest) {
  const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.nextUrl.searchParams.get("key");
  if (!process.env.CRON_SECRET || key !== process.env.CRON_SECRET) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const r = await enviarRecordatoriosPendientes(await getDb());
  return NextResponse.json({ ok: true, ...r });
}
export const GET = handle; export const POST = handle;
