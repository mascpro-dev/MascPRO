import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";
import { inserirListaLeads } from "@/lib/crmInserirListaLeads";

export const dynamic = "force-dynamic";

/** Sobe uma lista de contatos para o pipeline do vendedor logado. */
export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const texto = String(body?.texto || "");
  const resultado = await inserirListaLeads(supabase, {
    autorId: userId,
    autorNome: access.full_name || "vendedor",
    responsavelId: userId,
    texto,
  });

  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 400 });
  }
  return NextResponse.json(resultado);
}
