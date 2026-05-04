import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { registrarAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// GET /api/admin/returns?status=solicitado
export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const check = await assertAdmin(supabase, userId);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });

  const filtro = new URL(req.url).searchParams.get("status") || "solicitado";

  let query = supabase
    .from("returns")
    .select(`
      *, 
      profiles!returns_profile_id_fkey(id, full_name, email, whatsapp),
      orders!returns_order_id_fkey(id, total, status, created_at),
      return_items(*, products!return_items_product_id_fkey(id, title, image_url))
    `)
    .order("created_at", { ascending: false });

  if (filtro !== "todos") query = query.eq("status", filtro);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, returns: data || [] });
}

// POST /api/admin/returns — cria solicitação de devolução
export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const body = await req.json().catch(() => null);
  if (!body?.order_id || !body?.motivo) {
    return NextResponse.json({ ok: false, error: "order_id e motivo obrigatórios." }, { status: 400 });
  }

  const { data: ret, error } = await supabase
    .from("returns")
    .insert({
      order_id:      body.order_id,
      profile_id:    body.profile_id || null,
      motivo:        body.motivo,
      tipo:          body.tipo || "devolucao",
      status:        "solicitado",
      valor_estorno: body.valor_estorno ? Number(body.valor_estorno) : null,
      observacao:    body.observacao || null,
      created_by:    userId,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  if (body.itens?.length > 0) {
    await supabase.from("return_items").insert(
      body.itens.map((i: any) => ({
        return_id:    ret.id,
        product_id:   i.product_id,
        quantidade:   i.quantidade || 1,
        motivo_item:  i.motivo_item || null,
      }))
    );
  }

  await registrarAudit(supabase, {
    usuarioId: userId, acao: "CREATE_RETURN",
    entidade: "returns", entidadeId: ret.id,
    dadosApos: { order_id: body.order_id, motivo: body.motivo },
  });

  return NextResponse.json({ ok: true, return: ret });
}

// PATCH /api/admin/returns — aprova ou rejeita
export async function PATCH(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const check = await assertAdmin(supabase, userId);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.status) {
    return NextResponse.json({ ok: false, error: "id e status obrigatórios." }, { status: 400 });
  }

  const novoStatus = body.status;
  if (!["aprovado","rejeitado","concluido"].includes(novoStatus)) {
    return NextResponse.json({ ok: false, error: "Status inválido." }, { status: 400 });
  }

  const { data: ret, error } = await supabase
    .from("returns")
    .update({
      status:       novoStatus,
      observacao:   body.observacao || null,
      aprovado_por: userId,
      aprovado_em:  new Date().toISOString(),
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Se concluído: restaura estoque e estorna PRO coins
  if (novoStatus === "concluido" && ret.order_id) {
    const { data: items } = await supabase
      .from("return_items")
      .select("product_id, quantidade")
      .eq("return_id", body.id);

    for (const item of (items || []) as any[]) {
      if (!item.product_id) continue;
      const { data: prod } = await supabase.from("products").select("stock").eq("id", item.product_id).maybeSingle();
      await supabase.from("products")
        .update({ stock: (prod?.stock || 0) + Number(item.quantidade || 0) })
        .eq("id", item.product_id);
    }

    // Estorna PRO coins do comprador
    if (ret.valor_estorno && ret.profile_id) {
      const estorno = Math.round(Number(ret.valor_estorno));
      const { data: p } = await supabase.from("profiles").select("total_compras_proprias").eq("id", ret.profile_id).maybeSingle();
      const novoTotal = Math.max(0, (p?.total_compras_proprias || 0) - estorno);
      await supabase.from("profiles").update({ total_compras_proprias: novoTotal }).eq("id", ret.profile_id);
    }
  }

  await registrarAudit(supabase, {
    usuarioId: userId, acao: novoStatus === "aprovado" ? "APPROVE_RETURN" : "REJECT_RETURN",
    entidade: "returns", entidadeId: body.id,
    dadosApos: { status: novoStatus },
  });

  return NextResponse.json({ ok: true, return: ret });
}
