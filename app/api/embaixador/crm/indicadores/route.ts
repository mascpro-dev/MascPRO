import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertEmbaixadoraCrmAccess } from "@/lib/crmEmbaixadoraServer";
import {
  listarIndicadoresCrm,
  resolverIndicadorSugeridoLead,
} from "@/lib/crmListarIndicadores";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q") || "";
  const leadId = req.nextUrl.searchParams.get("lead_id") || "";

  const indicadores = await listarIndicadoresCrm(supabase, {
    viewerRole: "EMBAIXADOR",
    viewerId: userId,
    q,
  });

  let sugestao = null;
  if (leadId) {
    sugestao = await resolverIndicadorSugeridoLead(supabase, leadId);
  }

  return NextResponse.json({ ok: true, indicadores, sugestao });
}
