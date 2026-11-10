import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertForcaAcesso, podeOperarLeadForca } from "@/lib/forcaAcesso";
import { PROXIMAS_ACOES } from "@/lib/crmCarteira";
import { dataHojeSaoPaulo, intervaloDiaSaoPaulo } from "@/lib/forcaVendasDia";

export const dynamic = "force-dynamic";

const RESULTADOS = new Set(["positivo", "neutro", "negativo", "reagendar"]);
const ACOES = new Set(PROXIMAS_ACOES.map((a) => a.value));

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertForcaAcesso(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const leadId = String(req.nextUrl.searchParams.get("lead") || "");
  if (!leadId) return NextResponse.json({ ok: false, error: "Informe o salão." }, { status: 400 });
  const permitido = await podeOperarLeadForca(supabase, access, userId, leadId);
  if (!permitido) return NextResponse.json({ ok: false, error: "Sem acesso a este salão." }, { status: 403 });

  const { ini, fim } = intervaloDiaSaoPaulo(dataHojeSaoPaulo());
  let abertaQuery = supabase
    .from("crm_visitas")
    .select("*")
    .eq("crm_lead_id", leadId)
    .gte("data_visita", ini)
    .lt("data_visita", fim)
    .is("encerrada_em", null)
    .order("data_visita", { ascending: false })
    .limit(1);
  if (access.papel === "VENDEDOR") abertaQuery = abertaQuery.eq("vendedor_id", userId);
  const { data: aberta } = await abertaQuery.maybeSingle();

  let historicoQuery = supabase
    .from("crm_visitas")
    .select("id, data_visita, resultado, notas, checkin_em, encerrada_em")
    .eq("crm_lead_id", leadId)
    .order("data_visita", { ascending: false })
    .limit(5);
  if (access.papel === "VENDEDOR") historicoQuery = historicoQuery.eq("vendedor_id", userId);
  const { data: historico } = await historicoQuery;

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, nome, empresa, telefone, dono_nome, email, cidade, estado, endereco, bairro, cep, perfil_comercial, relacionamento, proxima_acao, profile_id")
    .eq("id", leadId)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    papel: access.papel,
    lead: lead || null,
    visita: aberta || null,
    historico: historico || [],
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertForcaAcesso(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  const acao = String(body?.acao || "");
  if (acao === "cadastro") return salvarCadastro(supabase, access, userId, body);
  if (acao === "encerrar") return encerrar(supabase, userId, body);
  if (acao !== "checkin") {
    return NextResponse.json({ ok: false, error: "Ação de visita inválida." }, { status: 400 });
  }

  const leadId = String(body?.crm_lead_id || "");
  const permitido = await podeOperarLeadForca(supabase, access, userId, leadId);
  if (!permitido) return NextResponse.json({ ok: false, error: "Sem acesso a este salão." }, { status: 403 });

  const manual = Boolean(body?.manual);
  const justificativa = String(body?.justificativa || "").trim();
  const lat = Number(body?.lat);
  const lng = Number(body?.lng);
  const temLocal = Number.isFinite(lat) && Number.isFinite(lng);
  if (manual && !justificativa) {
    return NextResponse.json({ ok: false, error: "Informe a justificativa do check-in manual." }, { status: 400 });
  }
  if (!manual && !temLocal) {
    return NextResponse.json({ ok: false, error: "Autorize a localização ou faça o check-in manual." }, { status: 400 });
  }

  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, nome, empresa, telefone, cidade, estado")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return NextResponse.json({ ok: false, error: "Salão não encontrado." }, { status: 404 });

  const hoje = dataHojeSaoPaulo();
  const { ini, fim } = intervaloDiaSaoPaulo(hoje);
  const { data: aberta } = await supabase
    .from("crm_visitas")
    .select("id")
    .eq("vendedor_id", userId)
    .eq("crm_lead_id", leadId)
    .gte("data_visita", ini)
    .lt("data_visita", fim)
    .is("encerrada_em", null)
    .limit(1)
    .maybeSingle();
  if (aberta?.id) return NextResponse.json({ ok: true, visita_id: aberta.id, ja_aberta: true });

  const agora = new Date().toISOString();
  const { data: visita, error } = await supabase
    .from("crm_visitas")
    .insert({
      vendedor_id: userId,
      distribuidor_id: access.distribuidor_id || userId,
      crm_lead_id: lead.id,
      tipo: "visita",
      cliente_nome: lead.empresa || lead.nome,
      cliente_telefone: lead.telefone,
      cliente_cidade: lead.cidade,
      uf: lead.estado,
      objetivo: String(body?.objetivo || "").trim() || null,
      data_visita: agora,
      checkin_em: agora,
      checkin_lat: temLocal ? lat : null,
      checkin_lng: temLocal ? lng : null,
      checkin_manual: manual,
      checkin_justificativa: manual ? justificativa : null,
    })
    .select("id")
    .single();
  if (error || !visita) {
    return NextResponse.json({ ok: false, error: error?.message || "Falha no check-in." }, { status: 500 });
  }

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "contato",
    conteudo: manual
      ? `Check-in manual: ${justificativa}`
      : "Check-in da visita com localização.",
  });

  if (lead.cidade && access.distribuidor_id) {
    await marcarParada(supabase, userId, access.distribuidor_id, lead, visita.id, hoje, "em_visita");
  }

  return NextResponse.json({ ok: true, visita_id: visita.id });
}

async function encerrar(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminContext>>["supabase"]>,
  userId: string,
  body: Record<string, unknown> | null
) {
  const visitaId = String(body?.visita_id || "");
  const resultado = String(body?.resultado || "").toLowerCase();
  if (!RESULTADOS.has(resultado)) {
    return NextResponse.json({ ok: false, error: "Informe o resultado da visita." }, { status: 400 });
  }
  const proxima = body?.proxima_acao ? String(body.proxima_acao) : null;
  if (proxima && !ACOES.has(proxima as never)) {
    return NextResponse.json({ ok: false, error: "Próxima ação inválida." }, { status: 400 });
  }
  const quando = body?.proxima_acao_em ? String(body.proxima_acao_em) : null;
  const notas = String(body?.notas || "").trim() || null;

  const { data: visita } = await supabase
    .from("crm_visitas")
    .select("id, crm_lead_id, vendedor_id")
    .eq("id", visitaId)
    .eq("vendedor_id", userId)
    .maybeSingle();
  if (!visita) return NextResponse.json({ ok: false, error: "Visita não encontrada." }, { status: 404 });

  const enderecoVisita = dadosDoCliente(body);
  if (enderecoVisita.erro) return NextResponse.json({ ok: false, error: enderecoVisita.erro }, { status: 400 });
  if (!enderecoVisita.telefone || !enderecoVisita.cidade || !enderecoVisita.endereco || !enderecoVisita.bairro) {
    return NextResponse.json(
      { ok: false, error: "Informe telefone, cidade, rua e bairro da visita." },
      { status: 400 }
    );
  }

  const agora = new Date().toISOString();
  const { error } = await supabase
    .from("crm_visitas")
    .update({
      encerrada_em: agora,
      resultado,
      notas,
      proximo_passo: proxima,
      proxima_acao: proxima,
      proxima_acao_em: quando,
      cliente_telefone: enderecoVisita.telefone,
      cliente_cidade: enderecoVisita.cidade,
      uf: enderecoVisita.estado,
    })
    .eq("id", visita.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (visita.crm_lead_id) {
    const gravou = await gravarDadosDoCliente(supabase, visita.crm_lead_id, enderecoVisita, {
      proxima_acao: proxima,
      proxima_acao_em: quando,
      data_followup: quando,
      ultimo_atendimento_em: agora,
      ultimo_atendimento_por: userId,
    });
    if (gravou) return NextResponse.json({ ok: false, error: gravou }, { status: 500 });
    await supabase.from("crm_atividades").insert({
      lead_id: visita.crm_lead_id,
      autor_id: userId,
      tipo: "contato",
      conteudo: `Visita encerrada: ${resultado}.${notas ? ` ${notas}` : ""}`,
    });
    await supabase
      .from("sales_route_stops")
      .update({ status: "concluida", crm_visita_id: visita.id })
      .eq("crm_visita_id", visita.id);
    await supabase
      .from("sales_route_stops")
      .update({ status: "concluida", crm_visita_id: visita.id })
      .eq("crm_lead_id", visita.crm_lead_id)
      .eq("status", "em_visita");
  }

  return NextResponse.json({ ok: true });
}

function dadosDoCliente(body: Record<string, unknown> | null) {
  const telefone = String(body?.telefone || "").trim();
  const cidade = String(body?.cidade || "").trim();
  const endereco = String(body?.endereco || "").trim();
  const bairro = String(body?.bairro || "").trim();
  const estadoBruto = String(body?.estado || "").trim();
  const estado = estadoBruto.toUpperCase();
  if (estadoBruto && !/^[A-Z]{2}$/.test(estado)) {
    return { erro: "A UF precisa ter 2 letras.", telefone, cidade, endereco, bairro, estado: "" };
  }
  return { erro: "", telefone, cidade, endereco, bairro, estado };
}

async function gravarDadosDoCliente(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminContext>>["supabase"]>,
  leadId: string,
  dados: { telefone: string; cidade: string; endereco: string; bairro: string; estado: string },
  extra: Record<string, unknown>
) {
  const patch = {
    ...extra,
    telefone: dados.telefone || null,
    cidade: dados.cidade || null,
    estado: dados.estado || null,
    endereco: dados.endereco || null,
    bairro: dados.bairro || null,
  };
  let upd = await supabase.from("crm_leads").update(patch).eq("id", leadId);
  if (upd.error && /endereco|bairro|schema cache|PGRST204/i.test(upd.error.message)) {
    const { endereco: _endereco, bairro: _bairro, ...semEndereco } = patch;
    void _endereco;
    void _bairro;
    upd = await supabase.from("crm_leads").update(semEndereco).eq("id", leadId);
  }
  return upd.error?.message || "";
}

async function salvarCadastro(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminContext>>["supabase"]>,
  access: Awaited<ReturnType<typeof assertForcaAcesso>>,
  userId: string,
  body: Record<string, unknown> | null
) {
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  const leadId = String(body?.crm_lead_id || "");
  const permitido = await podeOperarLeadForca(supabase, access, userId, leadId);
  if (!permitido) return NextResponse.json({ ok: false, error: "Sem acesso a este salão." }, { status: 403 });
  const dados = dadosDoCliente(body);
  if (dados.erro) return NextResponse.json({ ok: false, error: dados.erro }, { status: 400 });
  if (!dados.telefone || !dados.cidade) {
    return NextResponse.json({ ok: false, error: "Informe telefone e cidade." }, { status: 400 });
  }
  const erro = await gravarDadosDoCliente(supabase, leadId, dados, {});
  if (erro) return NextResponse.json({ ok: false, error: erro }, { status: 500 });
  return NextResponse.json({ ok: true });
}

async function marcarParada(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminContext>>["supabase"]>,
  userId: string,
  distribuidorId: string,
  lead: { id: string; cidade: string | null; estado: string | null },
  visitaId: string,
  data: string,
  statusParada: string
) {
  const cidade = String(lead.cidade || "").trim();
  if (!cidade) return;
  const { data: rota } = await supabase
    .from("sales_routes")
    .upsert(
      {
        vendedor_id: userId,
        distribuidor_id: distribuidorId,
        cidade,
        uf: lead.estado,
        data_rota: data,
        status: "ativa",
      },
      { onConflict: "vendedor_id,data_rota,cidade" }
    )
    .select("id")
    .single();
  if (!rota?.id) return;

  const { data: existente } = await supabase
    .from("sales_route_stops")
    .select("id, ordem")
    .eq("route_id", rota.id)
    .eq("crm_lead_id", lead.id)
    .maybeSingle();
  if (existente?.id) {
    await supabase
      .from("sales_route_stops")
      .update({ status: statusParada, crm_visita_id: visitaId })
      .eq("id", existente.id);
    return;
  }
  const { data: ultima } = await supabase
    .from("sales_route_stops")
    .select("ordem")
    .eq("route_id", rota.id)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();
  await supabase.from("sales_route_stops").insert({
    route_id: rota.id,
    crm_lead_id: lead.id,
    ordem: Number(ultima?.ordem || 0) + 1,
    planejada: false,
    status: statusParada,
    crm_visita_id: visitaId,
  });
}
