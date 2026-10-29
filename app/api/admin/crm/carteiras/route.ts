import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess } from "@/lib/crmServer";
import {
  agregarCidades,
  filtrarLeadsCarteira,
  idsRedeComercial,
  listarLeadsCarteira,
  perfilComercialLead,
} from "@/lib/crmCarteiraServidor";
import { STATUS_LEAD_LABEL } from "@/lib/comercialClassificacao";
import {
  PERFIL_COMERCIAL_LABEL,
  RELACIONAMENTO_LABEL,
  RESULTADO_ATENDIMENTO_LABEL,
  PROXIMA_ACAO_LABEL,
} from "@/lib/crmCarteira";

export const dynamic = "force-dynamic";

const PAGE = 50;

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const cidade = sp.get("cidade") || "";
  const uf = sp.get("uf") || "";
  const vendedor = sp.get("vendedor") || "";
  const q = sp.get("q") || "";
  const semResponsavel = sp.get("sem_responsavel") === "1";
  const page = Math.max(1, Number(sp.get("page") || 1));

  const escopo = access.role === "ADMIN" ? null : await idsRedeComercial(supabase, userId);
  const { data: leads, error } = await listarLeadsCarteira(supabase, escopo);
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });

  const idsResp = [...new Set(leads.map((l) => l.responsavel_id).filter(Boolean))];
  const nomes: Record<string, string> = {};
  if (idsResp.length) {
    const { data: perfis } = await supabase.from("profiles").select("id, full_name, role").in("id", idsResp);
    for (const p of perfis || []) nomes[p.id] = p.full_name || "Sem nome";
  }

  let vendedores: { id: string; full_name: string; role: string }[] = [];
  if (access.role === "ADMIN") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["DISTRIBUIDOR", "VENDEDOR"])
      .order("full_name");
    vendedores = (data || []).map((p) => ({
      id: p.id,
      full_name: p.full_name || "Sem nome",
      role: String(p.role || "").toUpperCase(),
    }));
  } else {
    const ids = escopo || [userId];
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", ids)
      .order("full_name");
    vendedores = (data || []).map((p) => ({
      id: p.id,
      full_name: p.full_name || "Sem nome",
      role: String(p.role || "").toUpperCase(),
    }));
  }

  const cidades = agregarCidades(leads);
  const filtrados = filtrarLeadsCarteira(leads, { cidade, uf, vendedor, q, semResponsavel });
  const total = filtrados.length;
  const slice = filtrados.slice((page - 1) * PAGE, page * PAGE);

  return NextResponse.json({
    ok: true,
    viewer_role: access.role,
    cidades,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE)),
    vendedores,
    contatos: slice.map((l) => ({
      id: l.id,
      empresa: l.empresa,
      nome: l.nome,
      telefone: l.telefone,
      cidade: l.cidade,
      estado: l.estado,
      bairro: l.bairro || null,
      vendedor_id: l.responsavel_id,
      vendedor_nome: l.responsavel_id ? nomes[l.responsavel_id] || "—" : "Sem responsável",
      perfil_comercial: perfilComercialLead(l),
      perfil_comercial_label: PERFIL_COMERCIAL_LABEL[perfilComercialLead(l)] || "Não verificado",
      relacionamento: l.relacionamento || "nao_identificado",
      relacionamento_label: RELACIONAMENTO_LABEL[l.relacionamento || "nao_identificado"] || "Não identificado",
      resultado: l.resultado_atendimento || (l.status === "novo" ? "nao_abordado" : null),
      resultado_label:
        RESULTADO_ATENDIMENTO_LABEL[l.resultado_atendimento || (l.status === "novo" ? "nao_abordado" : "")] || "—",
      pipeline: l.status,
      pipeline_label: STATUS_LEAD_LABEL[l.status] || l.status,
      ultimo_contato: l.ultimo_atendimento_em || l.updated_at,
      proxima_acao: l.proxima_acao || null,
      proxima_acao_label: l.proxima_acao ? PROXIMA_ACAO_LABEL[l.proxima_acao] || l.proxima_acao : l.proximo_passo || "—",
      proxima_acao_em: l.proxima_acao_em || l.data_followup,
    })),
  });
}
