import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertForcaAcesso, listarLeadsDaForca } from "@/lib/forcaAcesso";
import {
  STATUS_PEDIDO_CONFIRMADO,
  dataHojeSaoPaulo,
  dataValida,
  intervaloDiaSaoPaulo,
} from "@/lib/forcaVendasDia";

export const dynamic = "force-dynamic";

type LeadResumo = {
  id: string;
  nome: string | null;
  empresa: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  bairro: string | null;
  proxima_acao: string | null;
  proxima_acao_em: string | null;
  data_followup: string | null;
  perfil_comercial: string | null;
  relacionamento: string | null;
};

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertForcaAcesso(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const data = dataValida(req.nextUrl.searchParams.get("data")) || dataHojeSaoPaulo();
  const cidade = String(req.nextUrl.searchParams.get("cidade") || "").trim();
  const { ini, fim } = intervaloDiaSaoPaulo(data);

  const carteiraRes = await listarLeadsDaForca(supabase, access, userId);
  if (carteiraRes.error) return NextResponse.json({ ok: false, error: carteiraRes.error }, { status: 500 });

  const carteira = carteiraRes.leads as Array<LeadResumo & { status?: string }>;
  const cidades = new Map<string, { cidade: string; uf: string | null; total: number }>();
  for (const lead of carteira) {
    const nome = String(lead.cidade || "").trim();
    if (!nome) continue;
    const chave = nome.toLowerCase();
    const atual = cidades.get(chave);
    if (atual) atual.total += 1;
    else cidades.set(chave, { cidade: nome, uf: lead.estado || null, total: 1 });
  }

  let visitasQuery = supabase
    .from("crm_visitas")
    .select("id, crm_lead_id, cliente_nome, cliente_cidade, data_visita, checkin_em, encerrada_em, resultado")
    .gte("data_visita", ini)
    .lt("data_visita", fim)
    .order("data_visita", { ascending: true });
  if (access.papel === "VENDEDOR") visitasQuery = visitasQuery.eq("vendedor_id", userId);
  if (access.papel === "DISTRIBUIDOR") visitasQuery = visitasQuery.eq("distribuidor_id", userId);
  const { data: visitas, error: erroVisitas } = await visitasQuery;

  if (erroVisitas) {
    return NextResponse.json({ ok: false, error: erroVisitas.message }, { status: 500 });
  }

  let pedidosQuery = supabase
    .from("orders")
    .select("id, total, status, origem_abastecimento, order_group_id, created_at")
    .gte("created_at", ini)
    .lt("created_at", fim);
  if (access.papel === "VENDEDOR") pedidosQuery = pedidosQuery.eq("vendedor_id", userId);
  if (access.papel === "DISTRIBUIDOR") {
    pedidosQuery = pedidosQuery.or(`vendedor_id.eq.${userId},distribuidor_gestor_id.eq.${userId}`);
  }
  const { data: pedidos, error: erroPedidos } = await pedidosQuery;

  if (erroPedidos) return NextResponse.json({ ok: false, error: erroPedidos.message }, { status: 500 });

  let paradas: Array<Record<string, unknown>> = [];
  let avisoRota: string | null = null;
  let rotasQuery = supabase
    .from("sales_routes")
    .select("id, cidade, uf, status")
    .eq("data_rota", data);
  if (access.papel === "VENDEDOR") rotasQuery = rotasQuery.eq("vendedor_id", userId);
  if (access.papel === "DISTRIBUIDOR") rotasQuery = rotasQuery.eq("distribuidor_id", userId);
  const { data: rotas, error: erroRota } = await rotasQuery;

  if (erroRota) {
    avisoRota = erroRota.message;
  } else {
    const ids = (rotas || [])
      .filter((r) => !cidade || String(r.cidade).toLowerCase() === cidade.toLowerCase())
      .map((r) => r.id);
    if (ids.length > 0) {
      const { data: stops } = await supabase
        .from("sales_route_stops")
        .select("id, route_id, crm_lead_id, ordem, planejada, status, crm_visita_id")
        .in("route_id", ids)
        .order("ordem", { ascending: true });
      const porId = new Map(carteira.map((l) => [l.id, l]));
      paradas = (stops || []).map((s) => {
        const lead = porId.get(s.crm_lead_id);
        return {
          ...s,
          nome: lead?.empresa || lead?.nome || "Salão",
          telefone: lead?.telefone || null,
          cidade: lead?.cidade || null,
          endereco: lead?.endereco || null,
          bairro: lead?.bairro || null,
        };
      });
    }
  }

  const listaPedidos = pedidos || [];
  const confirmados = listaPedidos.filter((p) => STATUS_PEDIDO_CONFIRMADO.includes(String(p.status)));
  const valorConfirmado = confirmados.reduce((acc, p) => acc + Number(p.total || 0), 0);
  const porOrigem = {
    distribuidor: confirmados
      .filter((p) => p.origem_abastecimento === "distribuidor")
      .reduce((acc, p) => acc + Number(p.total || 0), 0),
    empresa: confirmados
      .filter((p) => p.origem_abastecimento === "empresa")
      .reduce((acc, p) => acc + Number(p.total || 0), 0),
  };

  const followups = carteira
    .filter((l) => {
      if (l.status === "fechado" || l.status === "perdido") return false;
      const acao = l.proxima_acao_em || l.data_followup;
      return Boolean(acao && acao <= data);
    })
    .slice(0, 8)
    .map((l) => ({
      id: l.id,
      nome: l.empresa || l.nome,
      cidade: l.cidade,
      telefone: l.telefone,
      proxima_acao: l.proxima_acao,
      quando: l.proxima_acao_em || l.data_followup,
    }));

  const proxima = paradas.find((p) => p.status === "pendente" || p.status === "em_visita") || null;
  const realizadas = (visitas || []).filter((v) => v.checkin_em || v.encerrada_em).length;

  return NextResponse.json({
    ok: true,
    data,
    cidade: cidade || null,
    usuario: access.full_name,
    papel: access.papel,
    uf: access.uf,
    aviso: carteiraRes.aviso,
    cidades: [...cidades.values()].sort((a, b) => a.cidade.localeCompare(b.cidade, "pt-BR")),
    resumo: {
      planejadas: paradas.filter((p) => p.planejada !== false).length,
      realizadas,
      pedidos: listaPedidos.length,
      valor_confirmado: Math.round(valorConfirmado * 100) / 100,
      valor_distribuidor: Math.round(porOrigem.distribuidor * 100) / 100,
      valor_empresa: Math.round(porOrigem.empresa * 100) / 100,
      followups: followups.length,
    },
    proxima,
    paradas,
    visitas: visitas || [],
    followups,
    aviso_rota: avisoRota,
  });
}
