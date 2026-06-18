import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertEmbaixadoraCrmAccess, podeAcessarLeadEmbaixadora } from "@/lib/crmEmbaixadoraServer";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertEmbaixadoraCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const q = String(new URL(req.url).searchParams.get("q") || "").trim();

  let query = supabase
    .from("products")
    .select("id, title, price, price_hairdresser, price_ambassador, price_distributor, stock, ativo")
    .eq("ativo", true)
    .order("title", { ascending: true })
    .limit(60);

  if (q.length >= 2) query = query.ilike("title", `%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, produtos: data || [] });
}
