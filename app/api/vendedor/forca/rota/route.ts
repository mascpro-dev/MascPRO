import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";
import { dataHojeSaoPaulo, dataValida } from "@/lib/forcaVendasDia";

export const dynamic = "force-dynamic";

type ParadaBody = { crm_lead_id?: string; planejada?: boolean };

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const data = dataValida(req.nextUrl.searchParams.get("data")) || dataHojeSaoPaulo();
  const cidade = String(req.nextUrl.searchParams.get("cidade") || "").trim();

  const { data: leads, error } = await supabase
    .from("crm_leads")
    .select("id, nome, empresa, telefone, dono_nome, dono_telefone, cidade, estado, endereco, bairro, cep, perfil_comercial, relacionamento, proxima_acao, proxima_acao_em")
    .or(`created_by.eq.${userId},responsavel_id.eq.${userId}`)
    .limit(1000);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const daCidade = (leads || []).filter((l) => {
    if (!cidade) return true;
    return String(l.cidade || "").trim().toLowerCase() === cidade.toLowerCase();
  });

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
    paradas = (stops || []).map((s) => ({ ...s, lead: porId.get(s.crm_lead_id) || null }));
  }

  const naRota = new Set(paradas.map((p) => String(p.crm_lead_id)));
  return NextResponse.json({
    ok: true,
    data,
    cidade: cidade || null,
    rota: rota || null,
    paradas,
    disponiveis: daCidade.filter((l) => !naRota.has(l.id)),
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  const cidade = String(body?.cidade || "").trim();
  const data = dataValida(String(body?.data_rota || "")) || dataHojeSaoPaulo();
  const uf = String(body?.uf || "").trim().toUpperCase() || null;
  const itens = Array.isArray(body?.paradas) ? (body.paradas as ParadaBody[]) : [];
  if (!cidade) return NextResponse.json({ ok: false, error: "Escolha a cidade." }, { status: 400 });

  const ids = [...new Set(itens.map((i) => String(i.crm_lead_id || "")).filter(Boolean))];
  if (ids.length > 0) {
    const { data: leads } = await supabase
      .from("crm_leads")
      .select("id, created_by, responsavel_id")
      .in("id", ids);
    const permitidos = new Set(
      (leads || [])
        .filter((l) => l.created_by === userId || l.responsavel_id === userId)
        .map((l) => l.id)
    );
    if (ids.some((id) => !permitidos.has(id))) {
      return NextResponse.json({ ok: false, error: "Há um salão fora da sua carteira." }, { status: 403 });
    }
  }

  const { data: rota, error } = await supabase
    .from("sales_routes")
    .upsert(
      {
        vendedor_id: userId,
        distribuidor_id: access.distribuidor_id,
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
