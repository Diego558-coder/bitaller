import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { whatsappMode } from "@/lib/whatsapp/provider";
export const dynamic = "force-dynamic";
export async function GET() {
  const db = await getDb(); await db.query("SELECT 1");
  return NextResponse.json({ ok: true, db: process.env.DATABASE_URL ? "postgres" : "pglite", whatsapp: whatsappMode() });
}
