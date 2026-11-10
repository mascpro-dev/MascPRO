import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertForcaAcesso, listarLeadsDaForca, normalizarUf, type ForcaAcesso } from "@/lib/forcaAcesso";
import { dataHojeSaoPaulo, dataValida } from "@/lib/forcaVendasDia";
import { enderecoDaParada, mesmaCidade, ordenarPorProximidade } from "@/lib/forcaRota";
import { geocodificar } from "@/lib/mapaSaloes";

export const dynamic = "force-dynamic";

type ParadaBody = { crm_lead_id?: string; planejada?: boolean };

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertForcaAcesso(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const data = dataValida(req.nextUrl.searchParams.get("data")) || dataHojeSaoPaulo();
  const cidade = String(req.nextUrl.searchParams.get("cidade") || "").trim();

  const carteiraRes = await listarLeadsDaForca(supabase, access, userId);
  if (carteiraRes.error) return NextResponse.json({ ok: false, error: carteiraRes.error }, { status: 500 });
  const daCarteira = (carteiraRes.leads as Array<Record<string, string | null>>).filter((l) =>
    mesmaCidade(l.cidade, cidade)
  );
  const doCrm = await leadsCrmDaCidade(supabase, access, cidade);
  if (doCrm.error) return NextResponse.json({ ok: false, error: doCrm.error }, { status: 500 });
  const mapaLeads = new Map<string, Record<string, string | null>>();
  for (const lead of [...daCarteira, ...doCrm.leads]) {
    if (lead.id) mapaLeads.set(String(lead.id), lead);
  }
  const daCidade = [...mapaLeads.values()];

  let rota: { id: string; cidade: string; uf: string | null; data_rota: string; status: string } | null = null;
  if (cidade) {
    const { data: rotaRow, error: erroRota } = await supabase
      .from("sales_routes")
      .select("id, cidade, uf, data_rota, status")
      .eq("vendedor_id", userId)
      .eq("data_rota", data)
      .ilike("cidade", cidade)
      .maybeSingle();
    if (erroRota) return NextResponse.json({ ok: false, error: erroRota.message }, { status: 500 });
    rota = rotaRow;
  }

  let paradas: Record<string, unknown>[] = [];
  if (rota?.id) {
    const { data: stops } = await supabase
      .from("sales_route_stops")
      .select("id, crm_lead_id, ordem, planejada, status, crm_visita_id")
      .eq("route_id", rota.id)
      .order("ordem", { ascending: true });
    const porId = new Map(daCidade.map((l) => [l.id, l]));
    const faltantes = (stops || []).map((s) => s.crm_lead_id).filter((id) => id && !porId.has(id));
    if (faltantes.length > 0) {
      const { data: extras } = await supabase
        .from("crm_leads")
        .select("id, nome, empresa, telefone, cidade, estado, endereco, bairro, cep")
        .in("id", faltantes);
      for (const lead of extras || []) porId.set(lead.id, lead);
    }
    paradas = (stops || []).map((s) => ({ ...s, lead: porId.get(s.crm_lead_id) || null }));
  }

  const naRota = new Set(paradas.map((p) => String(p.crm_lead_id)));
  return NextResponse.json({
    ok: true,
    data,
    cidade: cidade || null,
    rota: rota || null,
    paradas,
    disponiveis: daCidade.filter((l) => l.id && !naRota.has(l.id)),
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
  if (body?.acao === "sequencia") return sequenciar(body);
  const cidade = String(body?.cidade || "").trim();
  const data = dataValida(String(body?.data_rota || "")) || dataHojeSaoPaulo();
  const uf = String(body?.uf || "").trim().toUpperCase() || null;
  const itens = Array.isArray(body?.paradas) ? (body.paradas as ParadaBody[]) : [];
  if (!cidade) return NextResponse.json({ ok: false, error: "Escolha a cidade." }, { status: 400 });

  const ids = [...new Set(itens.map((i) => String(i.crm_lead_id || "")).filter(Boolean))];
  if (ids.length > 0) {
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, cidade, estado")
      .in("id", ids);
    const porId = new Map((leads || []).map((l) => [l.id, l]));
    const fora = ids.filter((id) => {
      const lead = porId.get(id);
      if (!lead || !mesmaCidade(lead.cidade, cidade)) return true;
      const ufLead = normalizarUf(lead.estado);
      return access.papel === "DISTRIBUIDOR" && access.uf && ufLead && ufLead !== access.uf;
    });
    if (fora.length > 0) {
      return NextResponse.json({ ok: false, error: "Há um salão fora desta cidade." }, { status: 403 });
    }
  }

  const { data: rota, error } = await supabase
    .from("sales_routes")
    .upsert(
      {
        vendedor_id: userId,
        distribuidor_id: access.distribuidor_id || userId,
        cidade,
        uf,
        data_rota: data,
        status: "ativa",
      },
      { onConflict: "vendedor_id,data_rota,cidade" }
    )
    .select("id")
    .single();
  if (error || !rota) {
    return NextResponse.json({ ok: false, error: error?.message || "Falha ao salvar a rota." }, { status: 500 });
  }

  const { error: erroDel } = await supabase.from("sales_route_stops").delete().eq("route_id", rota.id);
  if (erroDel) return NextResponse.json({ ok: false, error: erroDel.message }, { status: 500 });

  if (ids.length > 0) {
    const rows = ids.map((id, index) => {
      const item = itens.find((i) => i.crm_lead_id === id);
      return {
        route_id: rota.id,
        crm_lead_id: id,
        ordem: index + 1,
        planejada: item?.planejada !== false,
        status: "pendente",
      };
    });
    const { error: erroIns } = await supabase.from("sales_route_stops").insert(rows);
    if (erroIns) return NextResponse.json({ ok: false, error: erroIns.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, route_id: rota.id, paradas: ids.length });
}

const SELECT_CIDADE = "id, nome, empresa, telefone, cidade, estado, endereco, bairro, cep";

function filtroCidade(cidade: string) {
  const variantes = new Set([cidade.trim(), cidade.normalize("NFD").replace(/\p{M}/gu, "").trim()]);
  return [...variantes]
    .filter(Boolean)
    .map((valor) => `cidade.ilike."${valor.replace(/"/g, "")}"`)
    .join(",");
}

async function leadsCrmDaCidade(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminContext>>["supabase"]>,
  access: ForcaAcesso,
  cidade: string
) {
  if (!cidade.trim()) return { leads: [] as Array<Record<string, string | null>>, error: null as string | null };
  const { data, error } = await supabase
    .from("crm_leads")
    .select(SELECT_CIDADE)
    .or(filtroCidade(cidade))
    .limit(1000);
  if (error) return { leads: [], error: error.message };
  const leads = (data || []).filter((lead) => {
    if (!mesmaCidade(lead.cidade, cidade)) return false;
    if (access.papel !== "DISTRIBUIDOR" || !access.uf) return true;
    const ufLead = normalizarUf(lead.estado);
    return !ufLead || ufLead === access.uf;
  });
  return { leads, error: null as string | null };
}

async function emLotes<T, R>(itens: T[], tamanho: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = new Array(itens.length);
  let cursor = 0;
  async function worker() {
    while (cursor < itens.length) {
      const indice = cursor;
      cursor += 1;
      saida[indice] = await tarefa(itens[indice]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(tamanho, itens.length) }, () => worker()));
  return saida;
}

async function sequenciar(body: {
  paradas?: Array<Record<string, string | null>>;
  origem?: { lat?: number; lng?: number } | null;
}) {
  const paradas = Array.isArray(body?.paradas) ? body.paradas : [];
  const pontos = await emLotes(paradas, 4, async (parada) => {
    const endereco = enderecoDaParada(parada);
    const ponto = endereco ? await geocodificar(endereco) : null;
    return {
      id: String(parada.crm_lead_id || parada.id || ""),
      lat: ponto?.lat ?? null,
      lng: ponto?.lng ?? null,
    };
  });
  const origem = body?.origem;
  const inicio =
    origem && Number.isFinite(Number(origem.lat)) && Number.isFinite(Number(origem.lng))
      ? { lat: Number(origem.lat), lng: Number(origem.lng) }
      : null;
  const ordem = ordenarPorProximidade(pontos.filter((p) => p.id), inicio);
  return NextResponse.json({
    ok: true,
    ids: ordem.map((p) => p.id),
    sem_endereco: ordem.filter((p) => p.lat == null).length,
  });
}
