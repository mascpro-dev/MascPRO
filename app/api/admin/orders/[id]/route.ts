import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set([
  "novo",
  "pending",
  "paid",
  "separacao",
  "despachado",
  "entregue",
  "cancelled",
]);

type ItemInput = {
  product_id: string;
  quantidade: number;
  preco_unitario: number;
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const orderId = params.id;
    const { data: order, error: qerr } = await supabase
      .from("orders")
      .select(
        `*,
        profiles!orders_profile_id_fkey(id, full_name, email, role),
        order_items(id, product_id, quantidade, preco_unitario, products(id, title))`
      )
      .eq("id", orderId)
      .maybeSingle();

    if (qerr) {
      return NextResponse.json({ ok: false, error: qerr.message }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const orderId = params.id;
    const body = await req.json();

    const { data: existente, error: errExist } = await supabase
      .from("orders")
      .select("id, profile_id")
      .eq("id", orderId)
      .maybeSingle();

    if (errExist) {
      return NextResponse.json({ ok: false, error: errExist.message }, { status: 500 });
    }
    if (!existente) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};

    if (body.profile_id != null) {
      const pid = String(body.profile_id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", pid)
        .maybeSingle();
      if (!prof) {
        return NextResponse.json({ ok: false, error: "Cliente não encontrado." }, { status: 400 });
      }
      patch.profile_id = pid;
    }

    if (body.status != null) {
      const st = String(body.status).trim().toLowerCase();
      if (!ALLOWED_STATUS.has(st)) {
        return NextResponse.json({ ok: false, error: `Status inválido: ${st}` }, { status: 400 });
      }
      patch.status = st;
    }

    if (body.payment_method != null) {
      patch.payment_method = String(body.payment_method).trim() || "manual";
    }
    if (body.shipping_cost != null) {
      patch.shipping_cost = Math.max(0, Number(body.shipping_cost) || 0);
    }
    if (body.shipping_cep !== undefined) {
      patch.shipping_cep = body.shipping_cep ? String(body.shipping_cep) : null;
    }
    if (body.shipping_address !== undefined) {
      patch.shipping_address = body.shipping_address ? String(body.shipping_address) : null;
    }
    if (body.codigo_rastreio !== undefined) {
      patch.codigo_rastreio = body.codigo_rastreio ? String(body.codigo_rastreio) : null;
    }
    if (body.transportadora !== undefined) {
      patch.transportadora = body.transportadora ? String(body.transportadora) : null;
    }
    if (body.data_previsao !== undefined) {
      patch.data_previsao = body.data_previsao ? String(body.data_previsao) : null;
    }
    if (body.parcelas != null) {
      patch.parcelas = Math.max(1, Math.floor(Number(body.parcelas) || 1));
    }
    if (body.valor_parcela != null) {
      patch.valor_parcela = Number(body.valor_parcela) || null;
    }
    if (body.mp_payment_id !== undefined) {
      patch.mp_payment_id = body.mp_payment_id ? String(body.mp_payment_id) : null;
    }
    if (body.mp_preference_id !== undefined) {
      patch.mp_preference_id = body.mp_preference_id ? String(body.mp_preference_id) : null;
    }

    let subtotal = 0;
    const items: ItemInput[] | undefined = Array.isArray(body.items) ? body.items : undefined;

    if (items) {
      const itensLimpos = items
        .map((i) => ({
          product_id: String(i?.product_id || ""),
          quantidade: Math.max(1, Math.floor(Number(i?.quantidade) || 0)),
          preco_unitario: Math.max(0, Number(i?.preco_unitario) || 0),
        }))
        .filter((i) => i.product_id && i.quantidade > 0);

      if (itensLimpos.length === 0) {
        return NextResponse.json(
          { ok: false, error: "O pedido precisa ter pelo menos 1 item." },
          { status: 400 }
        );
      }

      const ids = [...new Set(itensLimpos.map((i) => i.product_id))];
      const { data: prods } = await supabase.from("products").select("id").in("id", ids);
      const valid = new Set((prods || []).map((p) => p.id));
      const faltando = ids.filter((id) => !valid.has(id));
      if (faltando.length) {
        return NextResponse.json(
          { ok: false, error: `Produto(s) inválido(s): ${faltando.join(", ")}` },
          { status: 400 }
        );
      }

      subtotal = itensLimpos.reduce(
        (acc, i) => acc + i.quantidade * i.preco_unitario,
        0
      );

      const { error: delErr } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);
      if (delErr) {
        return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
      }

      const { error: insErr } = await supabase.from("order_items").insert(
        itensLimpos.map((i) => ({
          order_id: orderId,
          product_id: i.product_id,
          quantidade: i.quantidade,
          preco_unitario: Number(i.preco_unitario.toFixed(2)),
        }))
      );
      if (insErr) {
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
      }
    }

    if (items || patch.shipping_cost != null) {
      let frete = patch.shipping_cost as number | undefined;
      if (frete === undefined && !items) {
        const { data: cur } = await supabase
          .from("orders")
          .select("shipping_cost")
          .eq("id", orderId)
          .single();
        frete = Number(cur?.shipping_cost || 0);
      }
      if (items) {
        patch.total = Number((subtotal + (frete ?? 0)).toFixed(2));
        if (patch.shipping_cost === undefined) {
          const { data: cur } = await supabase
            .from("orders")
            .select("shipping_cost")
            .eq("id", orderId)
            .single();
          patch.total = Number((subtotal + Number(cur?.shipping_cost || 0)).toFixed(2));
        }
      } else if (patch.shipping_cost != null) {
        const { data: curItems } = await supabase
          .from("order_items")
          .select("quantidade, preco_unitario")
          .eq("order_id", orderId);
        const sub = (curItems || []).reduce(
          (acc, row) =>
            acc + Number(row.quantidade || 0) * Number(row.preco_unitario || 0),
          0
        );
        patch.total = Number((sub + Number(patch.shipping_cost)).toFixed(2));
      }
    }

    if (Object.keys(patch).length > 0) {
      const { error: upErr } = await supabase
        .from("orders")
        .update(patch)
        .eq("id", orderId);
      if (upErr) {
        return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
      }
    }

    const { data: atualizado } = await supabase
      .from("orders")
      .select(
        `*,
        profiles!orders_profile_id_fkey(id, full_name, email, role),
        order_items(id, product_id, quantidade, preco_unitario, products(id, title))`
      )
      .eq("id", orderId)
      .single();

    return NextResponse.json({ ok: true, order: atualizado });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
