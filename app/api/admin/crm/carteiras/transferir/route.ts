import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess, podeAcessarLead } from "@/lib/crmServer";
import { idsRedeComercial } from "@/lib/crmCarteiraServidor";
import { registrarAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

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
  const ids: string[] = Array.isArray(body?.lead_ids) ? body.lead_ids.map(String) : [];
  const para = String(body?.para_responsavel_id || "").trim();
  const motivo = String(body?.motivo || "").trim() || "Distribuição de carteira";
  if (!ids.length || !para) {
    return NextResponse.json({ ok: false, error: "Selecione contatos e o vendedor de destino." }, { status: 400 });
  }

  const { data: dest } = await supabase.from("profiles").select("id, role, indicado_por").eq("id", para).maybeSingle();
  const papel = String(dest?.role || "").toUpperCase();
  if (!dest?.id || !["ADMIN", "DISTRIBUIDOR", "VENDEDOR"].includes(papel)) {
    return NextResponse.json({ ok: false, error: "Destino inválido." }, { status: 400 });
  }

  if (access.role !== "ADMIN") {
    const rede = await idsRedeComercial(supabase, userId);
    if (!rede.includes(para)) {
      return NextResponse.json({ ok: false, error: "Só é possível transferir dentro da sua equipe." }, { status: 403 });
    }
  }

  let transferidos = 0;
  for (const leadId of ids.slice(0, 500)) {
    const okLead = await podeAcessarLead(supabase, leadId, userId, access.role);
    if (!okLead) continue;
    const { data: atual } = await supabase
      .from("crm_leads")
      .select("id, responsavel_id")
      .eq("id", leadId)
      .maybeSingle();
    if (!atual) continue;
    const de = atual.responsavel_id;
    const { error } = await supabase
      .from("crm_leads")
      .update({ responsavel_id: para, updated_at: new Date().toISOString() })
      .eq("id", leadId);
    if (error) continue;
    transferidos += 1;
    await supabase.from("crm_transferencias").insert({
      lead_id: leadId,
      de_responsavel_id: de,
      para_responsavel_id: para,
      autor_id: userId,
      motivo,
    });
    await registrarAudit(supabase, {
      usuarioId: userId,
      acao: "UPDATE_LEAD",
      entidade: "crm_leads",
      entidadeId: leadId,
      dadosAntes: { responsavel_id: de },
      dadosApos: { responsavel_id: para, motivo },
    });
    await supabase.from("crm_atividades").insert({
      lead_id: leadId,
      autor_id: userId,
      tipo: "nota",
      conteudo: `Carteira transferida. ${motivo}`,
    });
  }

  return NextResponse.json({ ok: true, transferidos });
}
