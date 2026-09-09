import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertVendedorCrmAccess,
  podeAcessarLeadVendedor,
} from "@/lib/crmVendedorServer";
import { jsonPerfilDoLead } from "@/lib/crmLeadPerfilEndereco";

export const dynamic = "force-dynamic";

/** Endereço do comprador (perfil vinculado ao lead) para pré-preencher o pedido. */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadVendedor(supabase, params.id, userId);
  return jsonPerfilDoLead(req, { supabase, leadId: params.id, permitido });
}
