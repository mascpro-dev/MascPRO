import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";

export const dynamic = "force-dynamic";

/**
 * Lista pedidos para o painel admin usando service role (ignora RLS).
 * Sem esta rota, /admin/pedidos só mostraria pedidos que a RLS deixa o
 * usuário logado ver — o que normalmente é só os próprios.
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json(
        { ok: false, error: error || "Falha de autenticação." },
        { status: status || 401 }
      );
    }
    const { data: perfil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const role = String(perfil?.role || "").trim().toUpperCase();
    if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "Acesso restrito a administradores e distribuidores." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filtro = String(searchParams.get("filtro") || "todos").toLowerCase();
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

    let query = supabase
      .from("orders")
      .select(
        `*,
        profiles!orders_profile_id_fkey(full_name, nivel, avatar_url, email),
        order_items(quantidade, preco_unitario, products(title))`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (role === "DISTRIBUIDOR") {
      query = query
        .eq("gestor_tipo", "distribuidor")
        .eq("distribuidor_gestor_id", userId);
    } else {
      const gestao = searchParams.get("gestao");
      if (gestao === "empresa") {
        query = query.eq("gestor_tipo", "empresa");
      } else if (gestao === "distribuidor") {
        query = query.eq("gestor_tipo", "distribuidor");
      }
    }

    if (filtro === "pending") {
      query = query.in("status", ["pending", "novo"]);
    } else if (filtro !== "todos" && filtro !== "abandonados") {
      query = query.eq("status", filtro);
    }

    const { data, error: qerr } = await query;
    if (qerr) {
      return NextResponse.json(
        {
          ok: false,
          error: `${qerr.message}. Dica: confira se a tabela orders tem policy para ADMIN, ou configure SUPABASE_SERVICE_ROLE_KEY no Vercel para o painel admin ler tudo.`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, pedidos: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
