import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import {
  DEFINICOES_FASE5,
  erroColunaFase5,
  eventoSemFollowup,
  parsePeriodoScore,
  parseResultadoEvento,
  roiEvento,
} from "@/lib/comercialProvas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function ymOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ymDeIso(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  flyer_url: string | null;
  local: string | null;
  cidade: string | null;
  estado: string | null;
  organizador: string | null;
  valor: number | null;
  data_hora: string;
  ativo: boolean;
};

type Resultado = {
  event_id: string;
  leads_gerados: number;
  pedidos: number;
  receita: unknown;
  custo: unknown;
  followup_ok: boolean;
  followup_em: string | null;
  notas: string | null;
};

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
  const periodo = periodoRaw.value;
  const agora = new Date();

  const { data: eventos, error: evErr } = await supabase
    .from("events")
    .select("id, titulo, descricao, flyer_url, local, cidade, estado, organizador, valor, data_hora, ativo")
    .order("data_hora", { ascending: false });
  if (evErr) {
    return NextResponse.json({ ok: false, error: evErr.message }, { status: 500 });
  }

  const { data: resultados, error: resErr } = await supabase
    .from("comercial_evento_resultado")
    .select("event_id, leads_gerados, pedidos, receita, custo, followup_ok, followup_em, notas");
  const aviso = resErr ? erroColunaFase5(resErr.message) : null;
  const resMap = new Map((resultados || []).map((r) => [r.event_id, r as Resultado]));

  const { data: provas } = await supabase
    .from("comercial_provas")
    .select("event_id")
    .not("event_id", "is", null);
  const provasPorEvento = new Map<string, number>();
  for (const p of provas || []) {
    if (!p.event_id) continue;
    provasPorEvento.set(p.event_id, (provasPorEvento.get(p.event_id) || 0) + 1);
  }

  let leadsPorEvento = new Map<string, number>();
  const leadsRes = await supabase
    .from("crm_leads")
    .select("evento_id")
    .not("evento_id", "is", null);
  if (!leadsRes.error) {
    for (const l of leadsRes.data || []) {
      if (!l.evento_id) continue;
      leadsPorEvento.set(l.evento_id, (leadsPorEvento.get(l.evento_id) || 0) + 1);
    }
  }

  const lista = ((eventos || []) as Evento[]).map((e) => {
    const r = resMap.get(e.id);
    const receita = Number(r?.receita || 0);
    const custo = Number(r?.custo || 0);
    const followup_ok = Boolean(r?.followup_ok);
    return {
      ...e,
      resultado: {
        leads_gerados: Number(r?.leads_gerados || 0),
        pedidos: Number(r?.pedidos || 0),
        receita,
        custo,
        followup_ok,
        followup_em: r?.followup_em || null,
        notas: r?.notas || null,
        roi: roiEvento(receita, custo),
      },
      provas: provasPorEvento.get(e.id) || 0,
      leads_vinculados: leadsPorEvento.get(e.id) || 0,
      passou: new Date(e.data_hora).getTime() < agora.getTime(),
      vazamento: eventoSemFollowup(e.data_hora, followup_ok, agora),
      no_mes: ymDeIso(e.data_hora) === periodo,
    };
  });

  const doMes = lista.filter((e) => e.no_mes);
  const vazamentos = lista.filter((e) => e.vazamento);
  const comRoi = doMes.filter((e) => e.resultado.roi != null);
  const roiMedio = comRoi.length
    ? Math.round((comRoi.reduce((s, e) => s + (e.resultado.roi || 0), 0) / comRoi.length) * 100) / 100
    : null;

  return NextResponse.json({
    ok: true,
    fase: 5,
    periodo,
    aviso,
    kpis: {
      eventosMes: doMes.length,
      vazamentos: vazamentos.length,
      leads: doMes.reduce((s, e) => s + e.resultado.leads_gerados, 0),
      receita: doMes.reduce((s, e) => s + e.resultado.receita, 0),
      custo: doMes.reduce((s, e) => s + e.resultado.custo, 0),
      provas: doMes.reduce((s, e) => s + e.provas, 0),
      roiMedio,
    },
    eventos: lista,
    definicoes: DEFINICOES_FASE5,
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
  if (!body) return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  const eventId = String(body.eventId || body.event_id || "").trim();
  if (!eventId) return NextResponse.json({ ok: false, error: "Informe o evento." }, { status: 400 });

  const parsed = parseResultadoEvento(body);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  const { data: evento } = await supabase.from("events").select("id").eq("id", eventId).maybeSingle();
  if (!evento) {
    return NextResponse.json({ ok: false, error: "Evento do calendário não encontrado." }, { status: 404 });
  }

  const { error } = await supabase.from("comercial_evento_resultado").upsert(
    {
      event_id: eventId,
      ...parsed.value,
      updated_by: userId,
    },
    { onConflict: "event_id" }
  );
  if (error) {
    return NextResponse.json({ ok: false, error: erroColunaFase5(error.message) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
