import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin, assertAdminOrDistribuidor } from "@/lib/adminServer";
import { parseLinhaProduto } from "@/lib/comercialClassificacao";
import {
  notificarProdutoAlterado,
  notificarProdutoCriado,
  notificarProdutoRemovido,
} from "@/lib/notificarAlteracaoProduto";

/** Erro de configuração no Supabase: rode supabase/fix_products_admin_completo.sql (GRANTs + RLS) ou adicione SUPABASE_SERVICE_ROLE_KEY no Vercel. */
const MSG_DICA_DB = "Se o erro for permission denied, execute no Supabase o script fix_products_admin_completo.sql (pasta supabase) e adicione SUPABASE_SERVICE_ROLE_KEY no ambiente (API → service_role).";

export async function GET() {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: error || "Falha de autenticação." }, { status: status || 401 });
    }
    const acesso = await assertAdminOrDistribuidor(supabase, userId);
    if (!acesso.ok) {
      return NextResponse.json({ ok: false, error: acesso.error }, { status: 403 });
    }

    const { data, error: qerr } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (qerr) {
      return NextResponse.json(
        { ok: false, error: `${qerr.message}. ${MSG_DICA_DB}` },
        { status: 500 }
      );
    }
    const products = (data || []).map((p) => {
      if (acesso.role === "ADMIN") return p;
      const publico = { ...(p as Record<string, unknown>) };
      delete publico.custo_unitario;
      return publico;
    });
    return NextResponse.json({ ok: true, role: acesso.role, products });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: error || "Falha de autenticação." }, { status: status || 401 });
    }
    const admin = await assertAdmin(supabase, userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, how_to_use, image_url, video_url, volume, peso_gramas,
      price_hairdresser, price_ambassador, price_distributor, stock, ativo, linha } = body;
    if (!title) return NextResponse.json({ ok: false, error: "Título obrigatório" }, { status: 400 });
    const linhaOk = parseLinhaProduto(linha);
    if (!linhaOk.ok) return NextResponse.json({ ok: false, error: linhaOk.error }, { status: 400 });
    const pg = Math.round(Number(peso_gramas));
    const hairdresserPrice = Number(price_hairdresser) || 0;
    const { data, error: ierr } = await supabase
      .from("products")
      .insert({
        title, description, how_to_use, image_url, video_url, volume,
        // Compatibilidade com schema legado que ainda exige products.price NOT NULL.
        price: hairdresserPrice,
        price_hairdresser: hairdresserPrice,
        price_ambassador: Number(price_ambassador) || 0,
        price_distributor: Number(price_distributor) || 0,
        stock: Number(stock) || 0,
        ativo: ativo !== false,
        peso_gramas: Number.isFinite(pg) && pg > 0 ? pg : 500,
        linha: linhaOk.value,
      })
      .select()
      .single();
    if (ierr) {
      return NextResponse.json(
        { ok: false, error: `${ierr.message} ${MSG_DICA_DB}` },
        { status: 500 }
      );
    }
    await notificarProdutoCriado(supabase, {
      actorId: userId,
      title: String(title),
      price_hairdresser: hairdresserPrice,
    });
    return NextResponse.json({ ok: true, product: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: error || "Falha de autenticação." }, { status: status || 401 });
    }
    const admin = await assertAdmin(supabase, userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...campos } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    const patch = { ...campos } as Record<string, unknown>;
    if ("linha" in patch) {
      const linhaOk = parseLinhaProduto(patch.linha);
      if (!linhaOk.ok) return NextResponse.json({ ok: false, error: linhaOk.error }, { status: 400 });
      patch.linha = linhaOk.value;
    }
    ["price_hairdresser", "price_ambassador", "price_distributor", "stock"].forEach((k) => {
      if (patch[k] !== undefined) patch[k] = Number(patch[k]) || 0;
    });
    if (patch.price_hairdresser !== undefined && patch.price === undefined) {
      // Mantém products.price sincronizado para evitar erro em ambientes legados.
      patch.price = patch.price_hairdresser;
    }
    if (patch.peso_gramas !== undefined) {
      const pg = Math.round(Number(patch.peso_gramas));
      patch.peso_gramas = Number.isFinite(pg) && pg > 0 ? pg : 500;
    }
    const { data: antes } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
    const { error: uerr } = await supabase.from("products").update(patch).eq("id", id);
    if (uerr) {
      return NextResponse.json(
        { ok: false, error: `${uerr.message} ${MSG_DICA_DB}` },
        { status: 500 }
      );
    }
    if (antes) {
      await notificarProdutoAlterado(supabase, {
        actorId: userId,
        antes: antes as Record<string, unknown>,
        patch,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: error || "Falha de autenticação." }, { status: status || 401 });
    }
    const admin = await assertAdmin(supabase, userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    const { data: antes } = await supabase.from("products").select("title").eq("id", id).maybeSingle();
    const { error: derr } = await supabase.from("products").delete().eq("id", id);
    if (derr) {
      return NextResponse.json(
        { ok: false, error: `${derr.message} ${MSG_DICA_DB}` },
        { status: 500 }
      );
    }
    await notificarProdutoRemovido(supabase, {
      actorId: userId,
      title: String(antes?.title || "Produto"),
    });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
