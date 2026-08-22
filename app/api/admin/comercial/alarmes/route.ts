import { NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { STATUS_PEDIDO_PAGO } from "@/lib/comercialMetricas";
import { STATUS_LEAD_LABEL } from "@/lib/comercialClassificacao";
import {
  DEFINICOES_FASE6,
  TIPO_ALARME_DESTINO,
  TIPO_ALARME_LABEL,
  alarmeLead,
  alarmeRecompra,
  type TipoAlarme,
} from "@/lib/comercialAlarmes";
import {
  ETAPA_LABEL,
  erroColunaFase3,
  janelaFechada,
  statusExibidoEtapa,
  ymdDeIso,
  ymdSaoPaulo,
} from "@/lib/comercialRegua";
import { erroColunaFase5, eventoSemFollowup } from "@/lib/comercialProvas";

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

type Alarme = {
  id: string;
  tipo: TipoAlarme;
  label: string;
  gravidade: "ok" | "atencao" | "risco";
  titulo: string;
  detalhe: string;
  dias: number;
  destino: "pipeline" | "homecare" | "eventos";
  telefone: string | null;
  ref_id: string;
};

export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const hoje = ymdSaoPaulo();
  const avisos: string[] = [];
  const itens: Alarme[] = [];

  const leadsRes = await fetchAllRows<{
    id: string;
    nome: string;
    telefone: string | null;
    status: string;
    created_at: string;
    updated_at: string | null;
    data_followup: string | null;
    proximo_passo: string | null;
    valor_estimado: number | null;
  }>(async (from, to) =>
    supabase
      .from("crm_leads")
      .select("id, nome, telefone, status, created_at, updated_at, data_followup, proximo_passo, valor_estimado")
      .not("status", "in", "(fechado,perdido,nao_qualificado)")
      .order("updated_at", { ascending: true })
      .range(from, to)
  );

  if (leadsRes.error) {
    const fallback = await fetchAllRows<{
      id: string;
      nome: string;
      telefone: string | null;
      status: string;
      created_at: string;
      updated_at: string | null;
      data_followup: string | null;
      valor_estimado: number | null;
    }>(async (from, to) =>
      supabase
        .from("crm_leads")
        .select("id, nome, telefone, status, created_at, updated_at, data_followup, valor_estimado")
        .not("status", "in", "(fechado,perdido,nao_qualificado)")
        .order("created_at", { ascending: true })
        .range(from, to)
    );
    if (fallback.error) {
      return NextResponse.json({ ok: false, error: `leads: ${fallback.error}` }, { status: 500 });
    }
    for (const l of fallback.rows) {
      const a = alarmeLead({ ...l, proximo_passo: null, hoje });
      if (!a) continue;
      itens.push({
        id: `${a.tipo}:${l.id}`,
        tipo: a.tipo,
        label: TIPO_ALARME_LABEL[a.tipo],
        gravidade: a.gravidade,
        titulo: l.nome,
        detalhe: `${STATUS_LEAD_LABEL[l.status] || l.status} · ${a.detalhe}`,
        dias: a.dias,
        destino: TIPO_ALARME_DESTINO[a.tipo],
        telefone: l.telefone,
        ref_id: l.id,
      });
    }
  } else {
    for (const l of leadsRes.rows) {
      const a = alarmeLead({ ...l, hoje });
      if (!a) continue;
      itens.push({
        id: `${a.tipo}:${l.id}`,
        tipo: a.tipo,
        label: TIPO_ALARME_LABEL[a.tipo],
        gravidade: a.gravidade,
        titulo: l.nome,
        detalhe: `${STATUS_LEAD_LABEL[l.status] || l.status} · ${a.detalhe}`,
        dias: a.dias,
        destino: TIPO_ALARME_DESTINO[a.tipo],
        telefone: l.telefone,
        ref_id: l.id,
      });
    }
  }

  const kitsRes = await fetchAllRows<{
    id: string;
    created_at: string;
    profile_id: string | null;
    motivo_nao_recompra: string | null;
    profiles: { full_name: string | null; whatsapp: string | null } | { full_name: string | null; whatsapp: string | null }[] | null;
  }>(async (from, to) =>
    supabase
      .from("orders")
      .select("id, created_at, profile_id, motivo_nao_recompra, profiles!orders_profile_id_fkey(full_name, whatsapp)")
      .eq("eh_kit_home_care", true)
      .in("status", [...STATUS_PEDIDO_PAGO])
      .range(from, to)
  );

  if (kitsRes.error) {
    avisos.push(erroColunaFase3(kitsRes.error));
  } else {
    const profileIds = [...new Set(kitsRes.rows.map((k) => k.profile_id).filter(Boolean))] as string[];
    const pedidosPorPerfil = new Map<string, string[]>();
    if (profileIds.length) {
      const pagos = await fetchAllRows<{ profile_id: string | null; created_at: string }>(async (from, to) =>
        supabase
          .from("orders")
          .select("profile_id, created_at")
          .in("status", [...STATUS_PEDIDO_PAGO])
          .in("profile_id", profileIds)
          .order("created_at", { ascending: true })
          .range(from, to)
      );
      if (!pagos.error) {
        for (const p of pagos.rows) {
          if (!p.profile_id) continue;
          const arr = pedidosPorPerfil.get(p.profile_id) || [];
          arr.push(p.created_at);
          pedidosPorPerfil.set(p.profile_id, arr);
        }
      }
    }

    for (const k of kitsRes.rows) {
      if (!janelaFechada(k.created_at, 60, hoje)) continue;
      const lista = k.profile_id ? pedidosPorPerfil.get(k.profile_id) || [] : [];
      const kitYmd = ymdDeIso(k.created_at);
      const proximo = lista.find((iso) => ymdDeIso(iso) > kitYmd) || null;
      const a = alarmeRecompra({
        kitEm: k.created_at,
        proximoPedidoEm: proximo,
        motivo: k.motivo_nao_recompra,
        hoje,
      });
      if (!a) continue;
      const raw = k.profiles;
      const perfil = Array.isArray(raw) ? raw[0] || null : raw;
      itens.push({
        id: `recompra_vencida:${k.id}`,
        tipo: "recompra_vencida",
        label: TIPO_ALARME_LABEL.recompra_vencida,
        gravidade: a.gravidade,
        titulo: perfil?.full_name || "Kit sem cadastro",
        detalhe: a.detalhe,
        dias: a.dias,
        destino: "homecare",
        telefone: perfil?.whatsapp || null,
        ref_id: k.id,
      });
    }
  }

  const etapasRes = await fetchAllRows<{
    id: string;
    order_id: string;
    etapa: string;
    previsto_em: string;
    status: string;
  }>(async (from, to) =>
    supabase
      .from("comercial_regua")
      .select("id, order_id, etapa, previsto_em, status")
      .in("status", ["pendente", "atrasado"])
      .range(from, to)
  );

  if (etapasRes.error) {
    avisos.push(erroColunaFase3(etapasRes.error));
  } else {
    for (const e of etapasRes.rows) {
      const exibido = statusExibidoEtapa(e.status, e.previsto_em, hoje);
      if (exibido !== "atrasado") continue;
      itens.push({
        id: `regua_atrasada:${e.id}`,
        tipo: "regua_atrasada",
        label: TIPO_ALARME_LABEL.regua_atrasada,
        gravidade: e.etapa === "d7" ? "atencao" : "risco",
        titulo: `${ETAPA_LABEL[e.etapa] || e.etapa} atrasado`,
        detalhe: `Previsto em ${e.previsto_em.split("-").reverse().join("/")}`,
        dias: Math.max(0, Math.round((Date.parse(`${hoje}T12:00:00`) - Date.parse(`${e.previsto_em}T12:00:00`)) / 86_400_000)),
        destino: "homecare",
        telefone: null,
        ref_id: e.order_id,
      });
    }
  }

  const { data: eventos, error: evErr } = await supabase
    .from("events")
    .select("id, titulo, data_hora");
  if (!evErr) {
    const { data: resultados, error: resErr } = await supabase
      .from("comercial_evento_resultado")
      .select("event_id, followup_ok");
    if (resErr) avisos.push(erroColunaFase5(resErr.message));
    const ok = new Set((resultados || []).filter((r) => r.followup_ok).map((r) => r.event_id));
    const agora = new Date();
    for (const ev of eventos || []) {
      if (!eventoSemFollowup(ev.data_hora, ok.has(ev.id), agora)) continue;
      const dias = Math.max(0, Math.round((agora.getTime() - new Date(ev.data_hora).getTime()) / 86_400_000));
      itens.push({
        id: `evento_sem_followup:${ev.id}`,
        tipo: "evento_sem_followup",
        label: TIPO_ALARME_LABEL.evento_sem_followup,
        gravidade: "risco",
        titulo: ev.titulo,
        detalhe: "Evento ocorreu e o follow-up comercial não foi marcado",
        dias,
        destino: "eventos",
        telefone: null,
        ref_id: ev.id,
      });
    }
  }

  itens.sort((a, b) => {
    const g = { risco: 0, atencao: 1, ok: 2 };
    return g[a.gravidade] - g[b.gravidade] || b.dias - a.dias;
  });

  const contar = (tipo: TipoAlarme) => itens.filter((i) => i.tipo === tipo).length;
  const riscos = itens.filter((i) => i.gravidade === "risco").length;

  return NextResponse.json({
    ok: true,
    fase: 6,
    hoje,
    aviso: avisos[0] || null,
    kpis: {
      total: itens.length,
      riscos,
      lead_parado: contar("lead_parado"),
      proposta_parada: contar("proposta_parada"),
      recompra_vencida: contar("recompra_vencida"),
      regua_atrasada: contar("regua_atrasada"),
      evento_sem_followup: contar("evento_sem_followup"),
    },
    alarmes: itens,
    definicoes: DEFINICOES_FASE6,
  });
}
