import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdminOrDistribuidor } from "@/lib/adminServer";
import {
  aplicarContagemEstoque,
  buscarUltimoPedidoPago,
  ehEstoqueGrupoRyo,
  garantirEstoqueUltimoPedidoGrupoRyo,
  listarEstoqueProfissional,
  resetarEstoquePeloUltimoPedido,
} from "@/lib/estoqueDistribuidor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function resolverAlvo(
  supabase: Awaited<ReturnType<typeof getAdminContext>>["supabase"],
  userId: string,
  role: "ADMIN" | "DISTRIBUIDOR",
  profissionalId: string | null
) {
  if (role === "DISTRIBUIDOR") return { ok: true as const, id: userId };
  if (profissionalId) return { ok: true as const, id: profissionalId };
  return { ok: false as const, error: "Informe o distribuidor." };
}

export async function GET(req: NextRequest) {
  const { supabase, userId, error, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: error || "Não autenticado." }, { status: status || 401 });
  }
  const acesso = await assertAdminOrDistribuidor(supabase, userId);
  if (!acesso.ok) return NextResponse.json({ ok: false, error: acesso.error }, { status: 403 });

  const profissionalId = req.nextUrl.searchParams.get("profissional_id");

  let distribuidores: { id: string; full_name: string | null; role: string | null }[] = [];
  if (acesso.role === "ADMIN") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .order("full_name", { ascending: true });
    distribuidores = (data || []).filter((p: { role?: string | null }) =>
      String(p.role || "").toUpperCase() === "DISTRIBUIDOR"
    );
  }

  const alvo = await resolverAlvo(supabase, userId, acesso.role, profissionalId);
  if (!alvo.ok) {
    const ryo = distribuidores.find((p) => ehEstoqueGrupoRyo(p.full_name));
    let avisoRyo: string | null = null;
    if (ryo) {
      const sync = await garantirEstoqueUltimoPedidoGrupoRyo(supabase, ryo.id, ryo.full_name);
      if (sync.aplicado) avisoRyo = `Estoque do Grupo Ryo alinhado ao último pedido (${sync.linhas} item(ns)).`;
      else if (sync.error) avisoRyo = sync.error;
    }
    return NextResponse.json({
      ok: true,
      role: acesso.role,
      distribuidores,
      itens: [],
      pedido: null,
      grupo_ryo: false,
      aviso_ryo: avisoRyo,
    });
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", alvo.id)
    .maybeSingle();

  const grupoRyo = ehEstoqueGrupoRyo(perfil?.full_name);
  let avisoRyo: string | null = null;
  if (grupoRyo) {
    const sync = await garantirEstoqueUltimoPedidoGrupoRyo(supabase, alvo.id, perfil?.full_name);
    if (sync.aplicado) {
      avisoRyo = `Estoque do Grupo Ryo alinhado ao último pedido (${sync.linhas} item(ns)).`;
    } else if (sync.error) {
      avisoRyo = sync.error;
    }
  }

  const estoque = await listarEstoqueProfissional(supabase, alvo.id);
  if (!estoque.ok) return NextResponse.json({ ok: false, error: estoque.error }, { status: 500 });

  let pedido = null;
  let pedido_erro: string | null = null;
  if (grupoRyo) {
    const ultimo = await buscarUltimoPedidoPago(supabase, alvo.id);
    if (ultimo.ok) pedido = ultimo.pedido;
    else pedido_erro = ultimo.error;
  }

  const valorEstoque = estoque.itens.reduce((s, i) => s + i.valor_total, 0);

  return NextResponse.json({
    ok: true,
    role: acesso.role,
    profissional: perfil,
    distribuidores,
    grupo_ryo: grupoRyo,
    aviso_ryo: avisoRyo,
    itens: estoque.itens,
    valor_estoque: Math.round(valorEstoque * 100) / 100,
    pedido,
    pedido_erro,
  });
}

export async function PATCH(req: NextRequest) {
  const { supabase, userId, error, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: error || "Não autenticado." }, { status: status || 401 });
  }
  const acesso = await assertAdminOrDistribuidor(supabase, userId);
  if (!acesso.ok) return NextResponse.json({ ok: false, error: acesso.error }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const profissionalId = typeof body.profissional_id === "string" ? body.profissional_id : null;
  const alvo = await resolverAlvo(supabase, userId, acesso.role, profissionalId);
  if (!alvo.ok) return NextResponse.json({ ok: false, error: alvo.error }, { status: 400 });

  const itens = Array.isArray(body.itens) ? body.itens : [];
  const r = await aplicarContagemEstoque(supabase, alvo.id, itens);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, alterados: r.alterados });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: error || "Não autenticado." }, { status: status || 401 });
  }
  const acesso = await assertAdminOrDistribuidor(supabase, userId);
  if (!acesso.ok) return NextResponse.json({ ok: false, error: acesso.error }, { status: 403 });
  if (acesso.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Só o estoque do Grupo Ryo é alinhado ao último pedido." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const profissionalId = typeof body.profissional_id === "string" ? body.profissional_id : "";
  if (!profissionalId) {
    return NextResponse.json({ ok: false, error: "Informe o distribuidor." }, { status: 400 });
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", profissionalId)
    .maybeSingle();
  if (!ehEstoqueGrupoRyo(perfil?.full_name)) {
    return NextResponse.json({
      ok: false,
      error: "Alinhar pelo último pedido vale somente para o Grupo Ryo | Wilian Nakamura.",
    }, { status: 400 });
  }

  const r = await resetarEstoquePeloUltimoPedido(supabase, profissionalId);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
  return NextResponse.json({ profissional_id: profissionalId, ...r });
}
