import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { registrarAudit } from "@/lib/auditLog";
import { STATUS_PEDIDO_PAGO, pctSeguro } from "@/lib/comercialMetricas";
import {
  DEFINICOES_FASE3,
  ETAPAS_REGUA,
  JANELAS_RECOMPRA,
  STATUS_ETAPA_REGUA,
  erroColunaFase3,
  etapasParaPedido,
  janelaFechada,
  parseMotivoNaoRecompra,
  pedidoPodeSerKit,
  recompraNaJanela,
  statusExibidoEtapa,
  ymdSaoPaulo,
} from "@/lib/comercialRegua";

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

type PedidoKit = {
  id: string;
  created_at: string;
  total: unknown;
  status: string;
  profile_id: string | null;
  eh_kit_home_care?: boolean | null;
  motivo_nao_recompra?: string | null;
  profiles?: { full_name: string | null; whatsapp: string | null } | { full_name: string | null; whatsapp: string | null }[] | null;
};

type EtapaRow = {
  id: string;
  order_id: string;
  profile_id: string | null;
  etapa: string;
  previsto_em: string;
  status: string;
  feito_em: string | null;
  notas: string | null;
};

function perfilDe(p: PedidoKit) {
  const raw = p.profiles;
  return Array.isArray(raw) ? raw[0] || null : raw || null;
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

  const agora = new Date();
  const periodo = req.nextUrl.searchParams.get("periodo") || ymOf(agora);
  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ ok: false, error: "Período inválido." }, { status: 400 });
  }
  const { ini: iniMes, fim: fimMes } = boundsMes(periodo);
  const hoje = ymdSaoPaulo(agora);

  const kitsRes = await fetchAllRows<PedidoKit>(async (from, to) =>
    supabase
      .from("orders")
      .select("id, created_at, total, status, profile_id, eh_kit_home_care, motivo_nao_recompra, profiles!orders_profile_id_fkey(full_name, whatsapp)")
      .eq("eh_kit_home_care", true)
      .in("status", [...STATUS_PEDIDO_PAGO])
      .order("created_at", { ascending: false })
      .range(from, to)
  );

  if (kitsRes.error) {
    return NextResponse.json({ ok: false, error: erroColunaFase3(kitsRes.error) }, { status: 500 });
  }

  const hoje0 = hoje;
  await supabase
    .from("comercial_regua")
    .update({ status: "atrasado" })
    .eq("status", "pendente")
    .lt("previsto_em", hoje0);

  const etapasRes = await fetchAllRows<EtapaRow>(async (from, to) =>
    supabase
      .from("comercial_regua")
      .select("id, order_id, profile_id, etapa, previsto_em, status, feito_em, notas")
      .order("previsto_em", { ascending: true })
      .range(from, to)
  );
  if (etapasRes.error) {
    return NextResponse.json({ ok: false, error: erroColunaFase3(etapasRes.error) }, { status: 500 });
  }

  const etapasPorPedido = new Map<string, EtapaRow[]>();
  for (const e of etapasRes.rows) {
    const list = etapasPorPedido.get(e.order_id) || [];
    list.push(e);
    etapasPorPedido.set(e.order_id, list);
  }

  const kitsSemEtapa = kitsRes.rows.filter((k) => (etapasPorPedido.get(k.id) || []).length < 3);
  if (kitsSemEtapa.length) {
    const rows = kitsSemEtapa.flatMap((k) =>
      etapasParaPedido(k.created_at).map((e) => ({
        order_id: k.id,
        profile_id: k.profile_id,
        etapa: e.etapa,
        previsto_em: e.previsto_em,
        status: "pendente",
      }))
    );
    await supabase.from("comercial_regua").upsert(rows, {
      onConflict: "order_id,etapa",
      ignoreDuplicates: true,
    });
    const refill = await fetchAllRows<EtapaRow>(async (from, to) =>
      supabase
        .from("comercial_regua")
        .select("id, order_id, profile_id, etapa, previsto_em, status, feito_em, notas")
        .order("previsto_em", { ascending: true })
        .range(from, to)
    );
    if (!refill.error) {
      etapasPorPedido.clear();
      for (const e of refill.rows) {
        const list = etapasPorPedido.get(e.order_id) || [];
        list.push(e);
        etapasPorPedido.set(e.order_id, list);
      }
    }
  }

  const profileIds = [...new Set(kitsRes.rows.map((k) => k.profile_id).filter(Boolean) as string[])];
  const pagosDepois: { id: string; profile_id: string; created_at: string }[] = [];
  for (let i = 0; i < profileIds.length; i += 80) {
    const chunk = profileIds.slice(i, i + 80);
    const { data, error } = await supabase
      .from("orders")
      .select("id, profile_id, created_at")
      .in("profile_id", chunk)
      .in("status", [...STATUS_PEDIDO_PAGO])
      .order("created_at", { ascending: true });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    pagosDepois.push(...((data || []) as typeof pagosDepois));
  }

  const pedidosPorPerfil = new Map<string, { id: string; created_at: string }[]>();
  for (const p of pagosDepois) {
    const list = pedidosPorPerfil.get(p.profile_id) || [];
    list.push({ id: p.id, created_at: p.created_at });
    pedidosPorPerfil.set(p.profile_id, list);
  }

  function proximoPedido(kit: PedidoKit) {
    if (!kit.profile_id) return null;
    const lista = pedidosPorPerfil.get(kit.profile_id) || [];
    return lista.find((p) => p.id !== kit.id && p.created_at > kit.created_at) || null;
  }

  const kits = kitsRes.rows.map((k) => {
    const etapas = (etapasPorPedido.get(k.id) || []).map((e) => ({
      ...e,
      status: statusExibidoEtapa(e.status, e.previsto_em, hoje),
    }));
    const prox = etapas.find((e) => e.status === "pendente" || e.status === "atrasado") || null;
    const seguinte = proximoPedido(k);
    const recompras = Object.fromEntries(
      JANELAS_RECOMPRA.map((dias) => [
        `d${dias}`,
        recompraNaJanela({
          kitEm: k.created_at,
          proximoPedidoEm: seguinte?.created_at || null,
          dias,
        }),
      ])
    ) as { d30: boolean; d45: boolean; d60: boolean };
    const perfil = perfilDe(k);
    return {
      order_id: k.id,
      created_at: k.created_at,
      total: Number(k.total || 0),
      status: k.status,
      profile_id: k.profile_id,
      cliente: perfil?.full_name || "Sem cadastro",
      whatsapp: perfil?.whatsapp || null,
      motivo_nao_recompra: k.motivo_nao_recompra || null,
      etapas,
      proximo: prox,
      recompras,
      proximo_pedido_em: seguinte?.created_at || null,
    };
  });

  const noMes = (iso: string) => iso >= iniMes && iso <= fimMes;
  const kitsMes = kits.filter((k) => noMes(k.created_at));
  const [y, m] = periodo.split("-").map(Number);
  const prevYm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
  const prevBounds = boundsMes(prevYm);
  const kitsPrev = kits.filter((k) => k.created_at >= prevBounds.ini && k.created_at <= prevBounds.fim);

  const todasEtapas = kits.flatMap((k) => k.etapas);
  const atrasados = todasEtapas.filter((e) => e.status === "atrasado").length;
  const pendentesHoje = todasEtapas.filter((e) => e.status === "pendente" && e.previsto_em === hoje).length;
  const feitosMes = todasEtapas.filter((e) => e.feito_em && e.feito_em >= iniMes && e.feito_em <= fimMes).length;
  const kitsComEtapaVencida = kits.filter((k) => k.etapas.some((e) => e.previsto_em <= hoje));
  const kitsEmDia = kitsComEtapaVencida.filter((k) => !k.etapas.some((e) => e.status === "atrasado")).length;

  function taxaJanela(dias: number) {
    const elegiveis = kits.filter((k) => k.profile_id && janelaFechada(k.created_at, dias, hoje));
    const ok = elegiveis.filter((k) =>
      recompraNaJanela({
        kitEm: k.created_at,
        proximoPedidoEm: k.proximo_pedido_em,
        dias,
      })
    );
    return { num: ok.length, den: elegiveis.length, pct: pctSeguro(ok.length, elegiveis.length) };
  }

  const { data: candidatosRaw, error: candErr } = await supabase
    .from("orders")
    .select("id, created_at, total, status, profile_id, eh_kit_home_care, profiles!orders_profile_id_fkey(full_name)")
    .eq("eh_kit_home_care", false)
    .in("status", [...STATUS_PEDIDO_PAGO])
    .gte("created_at", new Date(agora.getTime() - 90 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(40);

  if (candErr && !/eh_kit_home_care/i.test(candErr.message)) {
    return NextResponse.json({ ok: false, error: candErr.message }, { status: 500 });
  }

  const candidatos = ((candidatosRaw || []) as PedidoKit[]).map((p) => {
    const perfil = perfilDe(p);
    return {
      order_id: p.id,
      created_at: p.created_at,
      total: Number(p.total || 0),
      status: p.status,
      cliente: perfil?.full_name || "Sem cadastro",
    };
  });

  return NextResponse.json({
    ok: true,
    fase: 3,
    periodo,
    periodoAnterior: prevYm,
    hoje,
    kpis: {
      kitsMes: kitsMes.length,
      kitsPrev: kitsPrev.length,
      atrasados,
      pendentesHoje,
      feitosMes,
      taxaEmDia: pctSeguro(kitsEmDia, kitsComEtapaVencida.length),
      recompra30: taxaJanela(30),
      recompra45: taxaJanela(45),
      recompra60: taxaJanela(60),
    },
    kits,
    candidatos,
    etapas: ETAPAS_REGUA,
    definicoes: DEFINICOES_FASE3,
  });
}

async function garantirEtapas(
  supabase: any,
  order: { id: string; created_at: string; profile_id: string | null }
) {
  const etapas = etapasParaPedido(order.created_at);
  const rows = etapas.map((e) => ({
    order_id: order.id,
    profile_id: order.profile_id,
    etapa: e.etapa,
    previsto_em: e.previsto_em,
    status: "pendente",
  }));
  const { error } = await supabase.from("comercial_regua").upsert(rows, {
    onConflict: "order_id,etapa",
    ignoreDuplicates: true,
  });
  return error;
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    orderId?: string;
    eh_kit_home_care?: boolean;
  } | null;
  const orderId = String(body?.orderId || "");
  if (!orderId) {
    return NextResponse.json({ ok: false, error: "Pedido obrigatório." }, { status: 400 });
  }

  const marcar = body?.eh_kit_home_care !== false;

  const { data: order, error: errOrder } = await supabase
    .from("orders")
    .select("id, created_at, status, profile_id, eh_kit_home_care")
    .eq("id", orderId)
    .maybeSingle();
  if (errOrder) {
    return NextResponse.json({ ok: false, error: erroColunaFase3(errOrder.message) }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
  }

  if (marcar && !pedidoPodeSerKit(order.status)) {
    return NextResponse.json(
      { ok: false, error: "Só pedido pago, em separação, despachado ou entregue vira kit." },
      { status: 400 }
    );
  }

  const { error: errUp } = await supabase
    .from("orders")
    .update({ eh_kit_home_care: marcar })
    .eq("id", orderId);
  if (errUp) {
    return NextResponse.json({ ok: false, error: erroColunaFase3(errUp.message) }, { status: 500 });
  }

  if (marcar) {
    const errEtapas = await garantirEtapas(supabase, order);
    if (errEtapas) {
      return NextResponse.json({ ok: false, error: erroColunaFase3(errEtapas.message) }, { status: 500 });
    }
  } else {
    await supabase.from("comercial_regua").delete().eq("order_id", orderId);
  }

  await registrarAudit(supabase, {
    usuarioId: userId,
    acao: "UPDATE_ORDER",
    entidade: "orders",
    entidadeId: orderId,
    dadosAntes: { eh_kit_home_care: order.eh_kit_home_care },
    dadosApos: { eh_kit_home_care: marcar },
  });

  return NextResponse.json({ ok: true, orderId, eh_kit_home_care: marcar });
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

  const body = (await req.json().catch(() => null)) as {
    etapaId?: string;
    status?: string;
    notas?: string;
    orderId?: string;
    motivo_nao_recompra?: string | null;
  } | null;

  if (body?.orderId && "motivo_nao_recompra" in (body || {})) {
    const motivo = parseMotivoNaoRecompra(body.motivo_nao_recompra);
    if (!motivo.ok) return NextResponse.json({ ok: false, error: motivo.error }, { status: 400 });
    const { error } = await supabase
      .from("orders")
      .update({ motivo_nao_recompra: motivo.value })
      .eq("id", body.orderId)
      .eq("eh_kit_home_care", true);
    if (error) return NextResponse.json({ ok: false, error: erroColunaFase3(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, orderId: body.orderId, motivo_nao_recompra: motivo.value });
  }

  const etapaId = String(body?.etapaId || "");
  const novoStatus = String(body?.status || "");
  if (!etapaId || !(STATUS_ETAPA_REGUA as readonly string[]).includes(novoStatus) || novoStatus === "pendente") {
    return NextResponse.json({ ok: false, error: "Etapa e status (feito ou pulado) são obrigatórios." }, { status: 400 });
  }
  if (novoStatus === "atrasado") {
    return NextResponse.json({ ok: false, error: "Atraso é calculado pela data. Marque feito ou pulado." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {
    status: novoStatus,
    notas: body?.notas?.trim() || null,
  };
  if (novoStatus === "feito" || novoStatus === "pulado") {
    patch.feito_em = new Date().toISOString();
    patch.feito_por = userId;
  }

  const { data, error } = await supabase
    .from("comercial_regua")
    .update(patch)
    .eq("id", etapaId)
    .select("id, order_id, etapa, status")
    .single();
  if (error) return NextResponse.json({ ok: false, error: erroColunaFase3(error.message) }, { status: 500 });

  return NextResponse.json({ ok: true, etapa: data });
}
