import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertEmbaixadoraCrmAccess,
  podeAcessarLeadEmbaixadora,
} from "@/lib/crmEmbaixadoraServer";
import { jsonPerfilDoLead } from "@/lib/crmLeadPerfilEndereco";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLeadEmbaixadora(supabase, params.id, userId);
  return jsonPerfilDoLead(req, { supabase, leadId: params.id, permitido });
}
