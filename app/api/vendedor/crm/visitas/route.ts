import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";

export const dynamic = "force-dynamic";

const TIPOS = new Set(["visita", "demo", "amostra", "followup"]);
const RESULTADOS = new Set(["positivo", "neutro", "negativo", "reagendar"]);

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const mes = req.nextUrl.searchParams.get("periodo") || new Date().toISOString().slice(0, 7);
  const ini = `${mes}-01`;
  const fimDate = new Date(
    new Date(`${mes}-01`).getFullYear(),
    new Date(`${mes}-01`).getMonth() + 1,
    0
  );
  const fim = `${fimDate.toISOString().slice(0, 10)}T23:59:59`;

  let query = supabase
    .from("crm_visitas")
    .select("*")
    .eq("vendedor_id", userId)
    .gte("data_visita", ini)
    .lte("data_visita", fim)
    .order("data_visita", { ascending: false });

  const tipo = req.nextUrl.searchParams.get("tipo");
  if (tipo && TIPOS.has(tipo)) query = query.eq("tipo", tipo);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message.includes("crm_visitas") ? "Rode supabase/crm_vendedor_visitas_metas.sql" : error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, visitas: data || [] });
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
  const tipo = String(body?.tipo || "visita").toLowerCase();
  const clienteNome = String(body?.cliente_nome || "").trim();

  if (!clienteNome) {
    return NextResponse.json({ ok: false, error: "Nome do cliente é obrigatório." }, { status: 400 });
  }
  if (!TIPOS.has(tipo)) {
    return NextResponse.json({ ok: false, error: "Tipo de visita inválido." }, { status: 400 });
  }

  const resultado = body?.resultado ? String(body.resultado).toLowerCase() : null;
  if (resultado && !RESULTADOS.has(resultado)) {
    return NextResponse.json({ ok: false, error: "Resultado inválido." }, { status: 400 });
  }

  const row = {
    vendedor_id: userId,
    distribuidor_id: access.distribuidor_id,
    crm_lead_id: body?.crm_lead_id || null,
    tipo,
    cliente_nome: clienteNome,
    cliente_telefone: body?.cliente_telefone?.trim() || null,
    cliente_cidade: body?.cliente_cidade?.trim() || null,
    data_visita: body?.data_visita || new Date().toISOString(),
    produtos_amostra: body?.produtos_amostra?.trim() || null,
    resultado,
    proximo_passo: body?.proximo_passo?.trim() || null,
    notas: body?.notas?.trim() || null,
  };

  const { data: visita, error } = await supabase.from("crm_visitas").insert(row).select().single();
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (body?.crm_lead_id) {
    await supabase.from("crm_atividades").insert({
      lead_id: body.crm_lead_id,
      autor_id: userId,
      tipo: "contato",
      conteudo: `Visita em campo (${tipo}): ${clienteNome}${body?.notas ? ` — ${body.notas}` : ""}`,
    });
  }

  return NextResponse.json({ ok: true, visita });
}
