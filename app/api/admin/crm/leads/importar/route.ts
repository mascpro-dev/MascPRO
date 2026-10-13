import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess } from "@/lib/crmServer";
import { inserirListaLeads } from "@/lib/crmInserirListaLeads";

export const dynamic = "force-dynamic";

/** Sobe uma lista de contatos para o pipeline de quem está logado (admin ou distribuidor). */
export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const texto = String(body?.texto || "");
  const resultado = await inserirListaLeads(supabase, {
    userId,
    autorNome: access.full_name || "distribuidor",
    texto,
  });

  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 400 });
  }
  return NextResponse.json(resultado);
}
