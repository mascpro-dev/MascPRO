import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertForcaAcesso } from "@/lib/forcaAcesso";
import { carregarTabelaPrecosDistribuidor } from "@/lib/vendedorPrecos";

export const dynamic = "force-dynamic";

export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });
  const access = await assertForcaAcesso(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const { data, error } = await supabase
    .from("products")
    .select("id, title, image_url, linha, price, price_hairdresser, ativo")
    .order("title", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  let tabela: Awaited<ReturnType<typeof carregarTabelaPrecosDistribuidor>> | null = null;
  if (access.distribuidor_id) {
    try {
      tabela = await carregarTabelaPrecosDistribuidor(supabase, access.distribuidor_id);
    } catch {
      tabela = null;
    }
  }

  const produtos = (data || [])
    .filter((p) => p.ativo !== false)
    .map((p) => {
      const base = Number(p.price_hairdresser) || Number(p.price) || 0;
      return {
        id: p.id,
        title: p.title,
        image_url: p.image_url || null,
        linha: p.linha || null,
        preco: tabela?.get(p.id)?.preco_final ?? base,
      };
    });

  return NextResponse.json({ ok: true, papel: access.papel, produtos });
}
