import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { STATUS_PEDIDO_PAGO } from "@/lib/comercialMetricas";
import {
  DEFINICOES_FASE4,
  MANUAL_VAZIO,
  erroColunaFase4,
  montarScoreDistribuidor,
  montarScoreEmbaixadora,
  parseManualScore,
  parsePapelScore,
  parsePeriodoScore,
  type ManualScore,
} from "@/lib/comercialScore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE = 1000;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let from = 0;
  for (let i = 0; i < 40; i++) {
    const res = await fetchPage(from, from + PAGE - 1);
    if (res.error) return { rows: [], error: res.error.message };
    const chunk = res.data || [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return { rows, error: null };
}

function ymOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function boundsMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const ini = new Date(y, m - 1, 1);
  const fim = new Date(y, m, 0, 23, 59, 59, 999);
  return { ini: ini.toISOString(), fim: fim.toISOString() };
}

function roleNorm(role: string | null | undefined) {
  return String(role || "").trim().toUpperCase();
}

type Perfil = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  role: string | null;
  nivel_embaixador: string | null;
  avatar_url: string | null;
  indicado_por: string | null;
};

type Pedido = {
  id: string;
  total: unknown;
  created_at: string;
  profile_id: string | null;
  crm_lead_id?: string | null;
  distribuidor_gestor_id?: string | null;
  eh_kit_home_care?: boolean | null;
};

type Lead = {
  id: string;
  responsavel_id: string | null;
  created_at: string;
  status: string;
};

type ScoreRow = ManualScore & {
  profile_id: string;
  periodo: string;
  papel: string;
};

function manualDe(row: ScoreRow | undefined): ManualScore {
  if (!row) return { ...MANUAL_VAZIO };
  return {
    prova: row.prova,
    conteudo: row.conteudo,
    treino: row.treino,
    postura: row.postura,
    saloes_prospectados: Number(row.saloes_prospectados || 0),
    saloes_ativados: Number(row.saloes_ativados || 0),
    relatorio_ok: Boolean(row.relatorio_ok),
    politica_ok: Boolean(row.politica_ok),
    exclusividade: row.exclusividade,
    notas: row.notas,
  };
}

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const periodoRaw = parsePeriodoScore(req.nextUrl.searchParams.get("periodo") || ymOf(new Date()));
  if (!periodoRaw.ok) {
    return NextResponse.json({ ok: false, error: periodoRaw.error }, { status: 400 });
  }
  const papelRaw = parsePapelScore(req.nextUrl.searchParams.get("papel") || "embaixadora");
  if (!papelRaw.ok) {
    return NextResponse.json({ ok: false, error: papelRaw.error }, { status: 400 });
  }
  const periodo = periodoRaw.value;
  const papel = papelRaw.value;
  const { ini: iniMes, fim: fimMes } = boundsMes(periodo);
  const roleAlvo = papel === "embaixadora" ? "EMBAIXADOR" : "DISTRIBUIDOR";

  const pessoasRes = await fetchAllRows<Perfil>(async (from, to) =>
    supabase
      .from("profiles")
      .select("id, full_name, whatsapp, city, state, role, nivel_embaixador, avatar_url, indicado_por")
      .ilike("role", roleAlvo)
      .order("full_name", { ascending: true })
      .range(from, to)
  );
  if (pessoasRes.error) {
    return NextResponse.json({ ok: false, error: pessoasRes.error }, { status: 500 });
  }
  const pessoas = pessoasRes.rows.filter((p) => roleNorm(p.role) === roleAlvo);
  const idsPessoas = pessoas.map((p) => p.id);
  const idSet = new Set(idsPessoas);

  const redeRes = idsPessoas.length
    ? await fetchAllRows<{ id: string; indicado_por: string | null; role: string | null }>(async (from, to) =>
        supabase
          .from("profiles")
          .select("id, indicado_por, role")
          .in("indicado_por", idsPessoas)
          .range(from, to)
      )
    : { rows: [] as { id: string; indicado_por: string | null; role: string | null }[], error: null };

  if (redeRes.error) {
    return NextResponse.json({ ok: false, error: redeRes.error }, { status: 500 });
  }

  const redeDireta = new Map<string, string[]>();
  const vendedoresDe = new Map<string, string[]>();
  for (const p of pessoas) {
    redeDireta.set(p.id, []);
    vendedoresDe.set(p.id, []);
  }
  for (const r of redeRes.rows) {
    if (!r.indicado_por) continue;
    redeDireta.get(r.indicado_por)?.push(r.id);
    if (papel === "distribuidor" && roleNorm(r.role) === "VENDEDOR") {
      vendedoresDe.get(r.indicado_por)?.push(r.id);
    }
  }

  const vendedorIds = [...new Set([...vendedoresDe.values()].flat())];
  const segundoNivel = new Map<string, string[]>();
  const compradorParaVendedor = new Map<string, string>();
  for (const p of pessoas) segundoNivel.set(p.id, []);

  if (papel === "distribuidor" && vendedorIds.length) {
    const nivel2 = await fetchAllRows<{ id: string; indicado_por: string | null }>(async (from, to) =>
      supabase
        .from("profiles")
        .select("id, indicado_por")
        .in("indicado_por", vendedorIds)
        .range(from, to)
    );
    if (!nivel2.error) {
      const vendedorParaDist = new Map<string, string>();
      for (const [distId, vs] of vendedoresDe) {
        for (const v of vs) vendedorParaDist.set(v, distId);
      }
      for (const r of nivel2.rows) {
        if (r.indicado_por) compradorParaVendedor.set(r.id, r.indicado_por);
        const distId = r.indicado_por ? vendedorParaDist.get(r.indicado_por) : null;
        if (distId) segundoNivel.get(distId)?.push(r.id);
      }
    }
  }

  const donoDaRede = new Map<string, string>();
  for (const [pessoaId, ids] of redeDireta) {
    for (const id of ids) donoDaRede.set(id, pessoaId);
  }
  for (const [pessoaId, ids] of segundoNivel) {
    for (const id of ids) {
      if (!donoDaRede.has(id)) donoDaRede.set(id, pessoaId);
    }
  }

  let pedidosRes = await fetchAllRows<Pedido>(async (from, to) =>
    supabase
      .from("orders")
      .select("id, total, created_at, profile_id, crm_lead_id, distribuidor_gestor_id, eh_kit_home_care")
      .in("status", [...STATUS_PEDIDO_PAGO])
      .gte("created_at", iniMes)
      .lte("created_at", fimMes)
      .order("created_at", { ascending: false })
      .range(from, to)
  );
  if (pedidosRes.error && /eh_kit_home_care|crm_lead_id|distribuidor_gestor_id/i.test(pedidosRes.error)) {
    pedidosRes = await fetchAllRows<Pedido>(async (from, to) =>
      supabase
        .from("orders")
        .select("id, total, created_at, profile_id")
        .in("status", [...STATUS_PEDIDO_PAGO])
        .gte("created_at", iniMes)
        .lte("created_at", fimMes)
        .order("created_at", { ascending: false })
        .range(from, to)
    );
  }
  if (pedidosRes.error) {
    return NextResponse.json({ ok: false, error: pedidosRes.error }, { status: 500 });
  }

  const leadsRes = await fetchAllRows<Lead>(async (from, to) =>
    supabase
      .from("crm_leads")
      .select("id, responsavel_id, created_at, status")
      .not("responsavel_id", "is", null)
      .range(from, to)
  );
  if (leadsRes.error) {
    return NextResponse.json({ ok: false, error: `leads: ${leadsRes.error}` }, { status: 500 });
  }

  const leadDono = new Map<string, string>();
  const leadsMesPorPessoa = new Map<string, number>();
  for (const p of pessoas) leadsMesPorPessoa.set(p.id, 0);
  for (const l of leadsRes.rows) {
    if (!l.responsavel_id || !idSet.has(l.responsavel_id)) continue;
    leadDono.set(l.id, l.responsavel_id);
    if (l.created_at >= iniMes && l.created_at <= fimMes) {
      leadsMesPorPessoa.set(l.responsavel_id, (leadsMesPorPessoa.get(l.responsavel_id) || 0) + 1);
    }
  }

  const atribuidos = new Map<string, { pedidos: number; receita: number; kits: number; ids: Set<string> }>();
  const compraPropria = new Map<string, number>();
  for (const p of pessoas) {
    atribuidos.set(p.id, { pedidos: 0, receita: 0, kits: 0, ids: new Set() });
    compraPropria.set(p.id, 0);
  }

  for (const ped of pedidosRes.rows) {
    const donos = new Set<string>();
    if (ped.profile_id && idSet.has(ped.profile_id)) {
      compraPropria.set(ped.profile_id, (compraPropria.get(ped.profile_id) || 0) + 1);
    }
    if (ped.profile_id) {
      const dono = donoDaRede.get(ped.profile_id);
      if (dono) donos.add(dono);
    }
    if (ped.crm_lead_id) {
      const dono = leadDono.get(ped.crm_lead_id);
      if (dono) donos.add(dono);
    }
    if (papel === "distribuidor" && ped.distribuidor_gestor_id && idSet.has(ped.distribuidor_gestor_id)) {
      donos.add(ped.distribuidor_gestor_id);
    }
    const kit = Boolean(ped.eh_kit_home_care);
    const total = Number(ped.total || 0);
    for (const dono of donos) {
      const acc = atribuidos.get(dono);
      if (!acc || acc.ids.has(ped.id)) continue;
      acc.ids.add(ped.id);
      acc.pedidos += 1;
      acc.receita += total;
      if (kit) acc.kits += 1;
    }
  }

  const visitasPorDist = new Map<string, { total: number; vendedores: Set<string> }>();
  const vendedorAtivoPedido = new Map<string, Set<string>>();
  for (const p of pessoas) {
    visitasPorDist.set(p.id, { total: 0, vendedores: new Set() });
    vendedorAtivoPedido.set(p.id, new Set());
  }

  if (papel === "distribuidor" && idsPessoas.length) {
    const visitas = await fetchAllRows<{ distribuidor_id: string; vendedor_id: string }>(async (from, to) =>
      supabase
        .from("crm_visitas")
        .select("distribuidor_id, vendedor_id")
        .in("distribuidor_id", idsPessoas)
        .gte("data_visita", iniMes)
        .lte("data_visita", fimMes)
        .range(from, to)
    );
    if (!visitas.error) {
      for (const v of visitas.rows) {
        const acc = visitasPorDist.get(v.distribuidor_id);
        if (!acc) continue;
        acc.total += 1;
        if (v.vendedor_id) acc.vendedores.add(v.vendedor_id);
      }
    }
    for (const ped of pedidosRes.rows) {
      if (!ped.profile_id) continue;
      const distId = donoDaRede.get(ped.profile_id);
      if (!distId) continue;
      const vendedorIdsDist = new Set(vendedoresDe.get(distId) || []);
      if (vendedorIdsDist.has(ped.profile_id)) {
        vendedorAtivoPedido.get(distId)?.add(ped.profile_id);
      }
      const vid = compradorParaVendedor.get(ped.profile_id);
      if (vid && vendedorIdsDist.has(vid)) {
        vendedorAtivoPedido.get(distId)?.add(vid);
      }
    }
  }

  const postsPorPessoa = new Map<string, number>();
  for (const p of pessoas) postsPorPessoa.set(p.id, 0);
  if (papel === "embaixadora" && idsPessoas.length) {
    const posts = await fetchAllRows<{ user_id: string }>(async (from, to) =>
      supabase
        .from("community_posts")
        .select("user_id")
        .in("user_id", idsPessoas)
        .gte("created_at", iniMes)
        .lte("created_at", fimMes)
        .range(from, to)
    );
    if (!posts.error) {
      for (const p of posts.rows) {
        postsPorPessoa.set(p.user_id, (postsPorPessoa.get(p.user_id) || 0) + 1);
      }
    }
  }

  let avisoSql: string | null = null;
  const scoreRes = await fetchAllRows<ScoreRow>(async (from, to) =>
    supabase
      .from("comercial_score")
      .select("profile_id, periodo, papel, prova, conteudo, treino, postura, saloes_prospectados, saloes_ativados, relatorio_ok, politica_ok, exclusividade, notas")
      .eq("periodo", periodo)
      .eq("papel", papel)
      .range(from, to)
  );
  if (scoreRes.error) {
    avisoSql = erroColunaFase4(scoreRes.error);
  }
  const manuais = new Map<string, ManualScore>();
  for (const row of scoreRes.rows) {
    manuais.set(row.profile_id, manualDe(row));
  }

  const lista = pessoas.map((p) => {
    const acc = atribuidos.get(p.id)!;
    const manual = manuais.get(p.id) || { ...MANUAL_VAZIO };
    const base = {
      profile_id: p.id,
      nome: p.full_name || "Sem nome",
      whatsapp: p.whatsapp,
      cidade: [p.city, p.state].filter(Boolean).join(" / ") || null,
      avatar_url: p.avatar_url,
      nivel_embaixador: p.nivel_embaixador,
      indicados: (redeDireta.get(p.id) || []).length,
      pedidos: acc.pedidos,
      receita: acc.receita,
      kits: acc.kits,
      leads: leadsMesPorPessoa.get(p.id) || 0,
      manual,
    };

    if (papel === "embaixadora") {
      const score = montarScoreEmbaixadora({
        pedidosRede: acc.pedidos,
        receitaRede: acc.receita,
        kitsRede: acc.kits,
        compraPropria: compraPropria.get(p.id) || 0,
        leadsMes: base.leads,
        postsComunidade: postsPorPessoa.get(p.id) || 0,
        manual,
      });
      return { ...base, score, compra_propria: compraPropria.get(p.id) || 0, posts_comunidade: postsPorPessoa.get(p.id) || 0 };
    }

    const visits = visitasPorDist.get(p.id)!;
    const ativos = new Set([
      ...visits.vendedores,
      ...(vendedorAtivoPedido.get(p.id) || []),
    ]);
    const score = montarScoreDistribuidor({
      pedidosRede: acc.pedidos,
      receitaRede: acc.receita,
      kitsRede: acc.kits,
      vendedores: (vendedoresDe.get(p.id) || []).length,
      vendedoresAtivos: ativos.size,
      visitas: visits.total,
      leadsMes: base.leads,
      manual,
    });
    return {
      ...base,
      score,
      vendedores: (vendedoresDe.get(p.id) || []).length,
      vendedores_ativos: ativos.size,
      visitas: visits.total,
    };
  });

  lista.sort((a, b) => b.score.total - a.score.total || a.nome.localeCompare(b.nome, "pt-BR"));

  const ativas = lista.filter((x) => x.score.ativa).length;
  const comVenda = lista.filter((x) => x.pedidos > 0).length;
  const media = lista.length ? Math.round(lista.reduce((s, x) => s + x.score.total, 0) / lista.length) : 0;

  return NextResponse.json({
    ok: true,
    fase: 4,
    periodo,
    papel,
    aviso: avisoSql,
    kpis: {
      total: lista.length,
      ativas,
      comVenda,
      scoreMedio: media,
      semNota: lista.filter((x) => x.score.manuaisVazios > 0).length,
    },
    pessoas: lista,
    definicoes: DEFINICOES_FASE4,
  });
}

export async function PATCH(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  }

  const periodoRaw = parsePeriodoScore(body.periodo);
  if (!periodoRaw.ok) return NextResponse.json({ ok: false, error: periodoRaw.error }, { status: 400 });
  const papelRaw = parsePapelScore(body.papel);
  if (!papelRaw.ok) return NextResponse.json({ ok: false, error: papelRaw.error }, { status: 400 });
  const profileId = String(body.profileId || "").trim();
  if (!profileId) {
    return NextResponse.json({ ok: false, error: "Informe a pessoa." }, { status: 400 });
  }
  const manual = parseManualScore(body);
  if (!manual.ok) return NextResponse.json({ ok: false, error: manual.error }, { status: 400 });

  const { data: perfil, error: perfilErr } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", profileId)
    .maybeSingle();
  if (perfilErr || !perfil) {
    return NextResponse.json({ ok: false, error: "Pessoa não encontrada." }, { status: 404 });
  }
  const role = roleNorm(perfil.role);
  const esperado = papelRaw.value === "embaixadora" ? "EMBAIXADOR" : "DISTRIBUIDOR";
  if (role !== esperado) {
    return NextResponse.json({ ok: false, error: "O papel não bate com o cadastro." }, { status: 400 });
  }

  const payload = {
    profile_id: profileId,
    periodo: periodoRaw.value,
    papel: papelRaw.value,
    prova: manual.value.prova,
    conteudo: manual.value.conteudo,
    treino: manual.value.treino,
    postura: manual.value.postura,
    saloes_prospectados: manual.value.saloes_prospectados,
    saloes_ativados: manual.value.saloes_ativados,
    relatorio_ok: manual.value.relatorio_ok,
    politica_ok: manual.value.politica_ok,
    exclusividade: manual.value.exclusividade,
    notas: manual.value.notas,
    updated_by: userId,
  };

  const { error } = await supabase.from("comercial_score").upsert(payload, {
    onConflict: "profile_id,periodo",
  });
  if (error) {
    return NextResponse.json({ ok: false, error: erroColunaFase4(error.message) }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
