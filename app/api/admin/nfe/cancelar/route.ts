import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { cancelarNfe } from "@/lib/blingNfe";
import { registrarAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// POST /api/admin/nfe/cancelar
// Body: { nfe_id, justificativa }
export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const check = await assertAdmin(supabase, userId);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.nfe_id || !body?.justificativa) {
    return NextResponse.json({ ok: false, error: "nfe_id e justificativa obrigatórios." }, { status: 400 });
  }

  const { data: nfe } = await supabase
    .from("notas_fiscais")
    .select("id, bling_id, status, numero_nfe")
    .eq("id", body.nfe_id)
    .maybeSingle();

  if (!nfe) return NextResponse.json({ ok: false, error: "NF-e não encontrada." }, { status: 404 });
  if (nfe.status !== "emitida") {
    return NextResponse.json({ ok: false, error: `NF-e com status "${nfe.status}" não pode ser cancelada.` }, { status: 400 });
  }

  const resultado = await cancelarNfe(nfe.bling_id!, body.justificativa);

  if (resultado.ok) {
    await supabase.from("notas_fiscais")
      .update({ status: "cancelada" })
      .eq("id", body.nfe_id);

    await registrarAudit(supabase, {
      usuarioId: userId, acao: "CANCEL_NFE",
      entidade: "notas_fiscais", entidadeId: body.nfe_id,
      dadosApos: { justificativa: body.justificativa },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: resultado.error }, { status: 422 });
}
