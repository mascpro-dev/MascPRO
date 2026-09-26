import { NextRequest, NextResponse } from "next/server";
import { buscarAtualizacaoMapaOnline } from "@/lib/mapaAtualizacao";

export const dynamic = "force-dynamic";

function autorizado(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.AGENDA_REMINDER_CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const token = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "";
  return token === secret || headerSecret === secret;
}

async function run(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ ok: false, error: "Não autorizado." }, { status: 401 });
  }
  const resultado = await buscarAtualizacaoMapaOnline();
  return NextResponse.json(resultado);
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
