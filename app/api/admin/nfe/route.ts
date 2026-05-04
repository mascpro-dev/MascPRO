import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { buscarLinkNfe } from "@/lib/blingNfe";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/admin/nfe?status=emitida&order_id=xxx
export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const check = await assertAdmin(supabase, userId);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const filtroStatus = params.get("status");
  const orderId      = params.get("order_id");

  let query = supabase
    .from("notas_fiscais")
    .select(`
      *,
      emitidor:profiles!notas_fiscais_emitido_por_fkey(id, full_name),
      orders!notas_fiscais_order_id_fkey(
        id, total, status, created_at,
        profiles!orders_profile_id_fkey(full_name, email)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filtroStatus) query = query.eq("status", filtroStatus);
  if (orderId) query = query.eq("order_id", orderId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, notas: data || [] });
}

// PATCH /api/admin/nfe — atualiza links PDF/XML do Bling
export async function PATCH(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const check = await assertAdmin(supabase, userId);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.nfe_id) return NextResponse.json({ ok: false, error: "nfe_id obrigatório." }, { status: 400 });

  const { data: nfe } = await supabase
    .from("notas_fiscais").select("bling_id").eq("id", body.nfe_id).maybeSingle();

  if (!nfe?.bling_id) return NextResponse.json({ ok: false, error: "NF-e sem bling_id." }, { status: 400 });

  const links = await buscarLinkNfe(nfe.bling_id);
  if (!links.ok) return NextResponse.json({ ok: false, error: links.error }, { status: 422 });

  await supabase.from("notas_fiscais").update({
    xml_url:      links.xml_url || null,
    pdf_url:      links.pdf_url || null,
    chave_acesso: links.chave_acesso || null,
  }).eq("id", body.nfe_id);

  return NextResponse.json({ ok: true, xml_url: links.xml_url, pdf_url: links.pdf_url });
}
