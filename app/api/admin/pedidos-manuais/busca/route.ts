import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";

export const dynamic = "force-dynamic";

/** Busca rápida de clientes e produtos para a tela de pedido manual. */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json(
        { ok: false, error: error || "Falha de autenticação." },
        { status: status || 401 }
      );
    }
    const adm = await assertAdmin(supabase, userId);
    if (!adm.ok) {
      return NextResponse.json({ ok: false, error: adm.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = (searchParams.get("tipo") || "").toLowerCase();
    const q = String(searchParams.get("q") || "").trim();

    if (tipo === "clientes") {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, role, cep, logradouro, numero, complemento, bairro, municipio, uf")
        .order("full_name", { ascending: true })
        .limit(30);

      if (q.length >= 2) {
        query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
      }

      const { data, error: err } = await query;
      if (err) return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
      return NextResponse.json({ ok: true, clientes: data || [] });
    }

    if (tipo === "produtos") {
      let query = supabase
        .from("products")
        .select("id, title, price, price_hairdresser, price_ambassador, price_distributor, stock, ativo")
        .order("title", { ascending: true })
        .limit(60);

      if (q.length >= 2) {
        query = query.ilike("title", `%${q}%`);
      }

      const { data, error: err } = await query;
      if (err) return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
      return NextResponse.json({ ok: true, produtos: data || [] });
    }

    return NextResponse.json(
      { ok: false, error: "Use ?tipo=clientes ou ?tipo=produtos" },
      { status: 400 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
