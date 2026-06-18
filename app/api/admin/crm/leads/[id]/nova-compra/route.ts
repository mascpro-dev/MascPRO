import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess, podeAcessarLead } from "@/lib/crmServer";

export const dynamic = "force-dynamic";

/** Cria novo lead no pipeline para acompanhar nova compra do mesmo cliente. */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const permitido = await podeAcessarLead(supabase, params.id, userId, access.role);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const { data: origem, error: errOrigem } = await supabase
    .from("crm_leads")
    .select(
      "nome, empresa, telefone, email, instagram, cidade, estado, profile_id, responsavel_id, notas"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (errOrigem || !origem) {
    return NextResponse.json(
      { ok: false, error: errOrigem?.message || "Lead não encontrado." },
      { status: 404 }
    );
  }

  const { data: novoLead, error: errNovo } = await supabase
    .from("crm_leads")
    .insert({
      nome: origem.nome,
      empresa: origem.empresa,
      telefone: origem.telefone,
      email: origem.email,
      instagram: origem.instagram,
      cidade: origem.cidade,
      estado: origem.estado,
      profile_id: origem.profile_id,
      responsavel_id: origem.responsavel_id || userId,
      created_by: userId,
      status: "negociacao",
      origem: "manual",
      notas: `Nova compra — retorno após pedido anterior. ${origem.notas || ""}`.trim(),
    })
    .select("id, nome, status")
    .single();

  if (errNovo || !novoLead) {
    return NextResponse.json(
      { ok: false, error: errNovo?.message || "Falha ao criar lead de acompanhamento." },
      { status: 500 }
    );
  }

  await supabase.from("crm_atividades").insert({
    lead_id: novoLead.id,
    autor_id: userId,
    tipo: "criacao",
    conteudo: "Lead de nova compra criado a partir de venda fechada.",
  });

  return NextResponse.json({ ok: true, lead: novoLead });
}
