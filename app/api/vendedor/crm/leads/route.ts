import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";
import {
  parseOrigemLead,
  pickClassificacaoLead,
  validarProximoPassoProposta,
  normalizarStatusCrmSimplificado,
  erroColunaFase2,
} from "@/lib/comercialClassificacao";
import { sincronizarVisitasOrfasNoPipeline } from "@/lib/crmVisitaPipeline";
import { buscarTodasAsPaginas } from "@/lib/crmBuscarTodasPaginas";
import { camposPessoasSalao, nomeDoSalao } from "@/lib/crmPessoasSalao";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  // Visitas antigas sem lead → entram no pipeline ao abrir o CRM
  await sincronizarVisitasOrfasNoPipeline(supabase, userId, access.full_name || "vendedor");

  const busca = req.nextUrl.searchParams.get("q");
  const { data, error } = await buscarTodasAsPaginas((inicio, fim) => {
    let query = supabase
      .from("crm_leads")
      .select("*")
      .or(`created_by.eq.${userId},responsavel_id.eq.${userId}`)
      .order("updated_at", { ascending: false });

    if (busca) {
      query = query.or(
        `nome.ilike.%${busca}%,telefone.ilike.%${busca}%,email.ilike.%${busca}%`
      );
    }
    return query.range(inicio, fim);
  });
  if (error) return NextResponse.json({ ok: false, error: erroColunaFase2(error) }, { status: 500 });
  const leads = (data || []).map((lead: any) => ({
    ...lead,
    status: normalizarStatusCrmSimplificado(lead.status),
  }));
  return NextResponse.json({ ok: true, leads });
}

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
  if (nomeDoSalao(body) === "Contato") {
    return NextResponse.json({ ok: false, error: "Informe o salão, o dono ou o cabeleireiro." }, { status: 400 });
  }

  const origem = parseOrigemLead(body.origem, "manual");
  if (!origem.ok) return NextResponse.json({ ok: false, error: origem.error }, { status: 400 });
  const classif = pickClassificacaoLead(body);
  if (classif.error) return NextResponse.json({ ok: false, error: classif.error }, { status: 400 });

  const avancao = validarProximoPassoProposta({
    status: "novo",
    data_followup: body.data_followup || null,
    proximo_passo: classif.campos.proximo_passo ?? null,
  });
  if (avancao) return NextResponse.json({ ok: false, error: avancao }, { status: 400 });

  const pessoas = camposPessoasSalao(body);
  const payload = {
    nome: nomeDoSalao(body),
    telefone: body.telefone?.trim() || pessoas.dono_telefone || pessoas.cabeleireiro_telefone,
    email: body.email?.trim() || null,
    cidade: body.cidade?.trim() || null,
    estado: body.estado?.trim() || null,
    status: "novo",
    origem: origem.value,
    notas: body.notas?.trim() || null,
    data_followup: body.data_followup || null,
    valor_estimado: body.valor_estimado ? Number(body.valor_estimado) : null,
    empresa: body.empresa?.trim() || null,
    instagram: body.instagram?.trim() || null,
    responsavel_id: userId,
    created_by: userId,
    profile_id: body.profile_id ? String(body.profile_id) : null,
    ...pessoas,
    ...classif.campos,
  };
  let ins = await supabase.from("crm_leads").insert(payload).select().single();
  if (ins.error && /dono_nome|cabeleireiro|schema cache|PGRST204/i.test(ins.error.message)) {
    const { dono_nome, dono_telefone, cabeleireiro_nome, cabeleireiro_telefone, ...sem } = payload;
    void dono_nome;
    void dono_telefone;
    void cabeleireiro_nome;
    void cabeleireiro_telefone;
    ins = await supabase.from("crm_leads").insert(sem).select().single();
  }
  const lead = ins.data;
  const error = ins.error;

  if (error || !lead) return NextResponse.json({ ok: false, error: erroColunaFase2(error?.message || "Falha ao gravar.") }, { status: 500 });

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "criacao",
    conteudo: `Lead criado por vendedor ${access.full_name}.`,
  });

  return NextResponse.json({ ok: true, lead });
}
