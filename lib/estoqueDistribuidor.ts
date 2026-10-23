import type { SupabaseClient } from "@supabase/supabase-js";

const STATUS_PEDIDO = ["paid", "separacao", "despachado", "entregue"];

export type ItemEstoqueDist = {
  id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  custo_unitario: number;
  valor_total: number;
  notes: string | null;
  updated_at: string | null;
};

export type PedidoEstoqueResumo = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  itens: { product_id: string | null; title: string; quantidade: number; preco_unitario: number; valor: number }[];
};

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function custoDoEstoque(row: {
  custo_unitario?: unknown;
  notes?: string | null;
}) {
  const direto = num(row.custo_unitario);
  if (direto > 0) return direto;
  const m = String(row.notes || "").match(/VALOR=([0-9]+(?:\.[0-9]+)?)/);
  return m ? num(m[1]) : 0;
}

export function ehEstoqueGrupoRyo(nome: string | null | undefined) {
  const n = String(nome || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return n.includes("grupo ryo") || (n.includes("ryo") && (n.includes("wilian") || n.includes("willian") || n.includes("nakamura")));
}

export async function garantirEstoqueUltimoPedidoGrupoRyo(
  supabase: SupabaseClient,
  professionalId: string,
  fullName: string | null | undefined
): Promise<{ aplicado: boolean; ja_aplicado?: boolean; error?: string; linhas?: number; valor?: number }> {
  if (!ehEstoqueGrupoRyo(fullName)) return { aplicado: false };
  const ultimo = await buscarUltimoPedidoPago(supabase, professionalId);
  if (!ultimo.ok) return { aplicado: false, error: ultimo.error };

  const { data: mov } = await supabase
    .from("pro_inventory_movements")
    .select("id")
    .eq("professional_id", professionalId)
    .eq("order_id", ultimo.pedido.id)
    .eq("reason", "sincronizar_ultimo_pedido")
    .limit(1);

  if ((mov || []).length > 0) return { aplicado: false, ja_aplicado: true };

  const r = await resetarEstoquePeloUltimoPedido(supabase, professionalId);
  if (!r.ok) return { aplicado: false, error: r.error };
  return { aplicado: true, linhas: r.linhas, valor: r.valor };
}

export function notaComValor(notes: string | null | undefined, valor: number, extra?: string) {
  const limpo = String(notes || "")
    .replace(/\s*VALOR=[0-9.]+/g, "")
    .replace(/\s*\|\s*/g, " ")
    .trim();
  const partes = [`VALOR=${valor.toFixed(2)}`];
  if (extra) partes.push(extra);
  if (limpo) partes.push(limpo);
  return partes.join(" | ");
}

async function registrarMovimento(
  supabase: SupabaseClient,
  row: {
    professional_id: string;
    order_id?: string | null;
    product_id?: string | null;
    inventory_id?: string | null;
    quantity_delta: number;
    reason: string;
  }
) {
  const { error } = await supabase.from("pro_inventory_movements").insert(row);
  if (error) console.warn("[estoqueDistribuidor] movimento:", error.message);
}

export async function buscarUltimoPedidoPago(
  supabase: SupabaseClient,
  professionalId: string
): Promise<{ ok: true; pedido: PedidoEstoqueResumo } | { ok: false; error: string }> {
  const { data: pedido, error } = await supabase
    .from("orders")
    .select("id, total, status, created_at")
    .eq("profile_id", professionalId)
    .in("status", STATUS_PEDIDO)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!pedido) return { ok: false, error: "Nenhum pedido pago encontrado para este membro." };

  const { data: itens, error: eItens } = await supabase
    .from("order_items")
    .select("product_id, quantidade, preco_unitario")
    .eq("order_id", pedido.id);
  if (eItens) return { ok: false, error: eItens.message };

  const pids = [...new Set((itens || []).map((i) => i.product_id).filter(Boolean))] as string[];
  let titulos = new Map<string, string>();
  if (pids.length > 0) {
    const { data: prods } = await supabase.from("products").select("id, title").in("id", pids);
    titulos = new Map((prods || []).map((p: { id: string; title: string }) => [p.id, p.title]));
  }

  const agregados = new Map<string, { product_id: string | null; title: string; quantidade: number; preco_unitario: number; valor: number }>();
  for (const row of itens || []) {
    const pid = (row.product_id as string | null) || null;
    const key = pid || `avulso-${Math.random()}`;
    const qtd = num(row.quantidade);
    const preco = num(row.preco_unitario);
    const atual = agregados.get(key);
    if (atual) {
      atual.quantidade += qtd;
      atual.valor += qtd * preco;
      if (atual.quantidade > 0) atual.preco_unitario = atual.valor / atual.quantidade;
    } else {
      agregados.set(key, {
        product_id: pid,
        title: (pid && titulos.get(pid)) || "Produto",
        quantidade: qtd,
        preco_unitario: preco,
        valor: qtd * preco,
      });
    }
  }

  return {
    ok: true,
    pedido: {
      id: pedido.id,
      total: num(pedido.total),
      status: String(pedido.status || ""),
      created_at: pedido.created_at,
      itens: [...agregados.values()].filter((i) => i.quantidade > 0),
    },
  };
}

export function mapearItensEstoque(rows: Record<string, unknown>[]): ItemEstoqueDist[] {
  return (rows || []).map((r) => {
    const qtd = num(r.quantity);
    const custo = custoDoEstoque(r);
    return {
      id: String(r.id),
      product_id: (r.product_id as string | null) || null,
      name: String(r.name || "Produto"),
      quantity: qtd,
      unit: String(r.unit || "un"),
      custo_unitario: custo,
      valor_total: Math.round(qtd * custo * 100) / 100,
      notes: (r.notes as string | null) || null,
      updated_at: (r.updated_at as string | null) || null,
    };
  });
}

export async function listarEstoqueProfissional(supabase: SupabaseClient, professionalId: string) {
  const { data, error } = await supabase
    .from("pro_inventory")
    .select("id, product_id, name, quantity, unit, notes, updated_at, custo_unitario")
    .eq("professional_id", professionalId)
    .order("name", { ascending: true });

  if (error) {
    if (String(error.message || "").includes("custo_unitario") || error.code === "42703") {
      const fallback = await supabase
        .from("pro_inventory")
        .select("id, product_id, name, quantity, unit, notes, updated_at")
        .eq("professional_id", professionalId)
        .order("name", { ascending: true });
      if (fallback.error) return { ok: false as const, error: fallback.error.message };
      return { ok: true as const, itens: mapearItensEstoque((fallback.data || []) as Record<string, unknown>[]) };
    }
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, itens: mapearItensEstoque((data || []) as Record<string, unknown>[]) };
}

export async function resetarEstoquePeloUltimoPedido(
  supabase: SupabaseClient,
  professionalId: string
): Promise<
  | { ok: true; pedido: PedidoEstoqueResumo; linhas: number; valor: number }
  | { ok: false; error: string }
> {
  const ultimo = await buscarUltimoPedidoPago(supabase, professionalId);
  if (!ultimo.ok) return ultimo;
  if (ultimo.pedido.itens.length === 0) {
    return { ok: false, error: "O último pedido não tem itens para montar o estoque." };
  }

  const { error: delErr } = await supabase.from("pro_inventory").delete().eq("professional_id", professionalId);
  if (delErr) return { ok: false, error: delErr.message };

  const agora = new Date().toISOString();
  const dataPedido = new Date(ultimo.pedido.created_at).toLocaleDateString("pt-BR");
  let linhas = 0;
  let valor = 0;

  for (const item of ultimo.pedido.itens) {
    const extra = `Último pedido ${dataPedido}`;
    const notes = notaComValor(null, item.preco_unitario, extra);
    const base = {
      professional_id: professionalId,
      product_id: item.product_id,
      name: item.title,
      category: "loja",
      quantity: item.quantidade,
      unit: "un",
      notes,
      updated_at: agora,
    };

    let inserted: { id: string } | null = null;
    const comCusto = await supabase
      .from("pro_inventory")
      .insert({ ...base, custo_unitario: item.preco_unitario })
      .select("id")
      .single();

    if (comCusto.error && (comCusto.error.code === "42703" || String(comCusto.error.message || "").includes("custo_unitario"))) {
      const semCusto = await supabase.from("pro_inventory").insert(base).select("id").single();
      if (semCusto.error) return { ok: false, error: semCusto.error.message };
      inserted = semCusto.data;
    } else if (comCusto.error) {
      return { ok: false, error: comCusto.error.message };
    } else {
      inserted = comCusto.data;
    }

    await registrarMovimento(supabase, {
      professional_id: professionalId,
      order_id: ultimo.pedido.id,
      product_id: item.product_id,
      inventory_id: inserted?.id ?? null,
      quantity_delta: item.quantidade,
      reason: "sincronizar_ultimo_pedido",
    });

    linhas += 1;
    valor += item.valor;
  }

  return { ok: true, pedido: ultimo.pedido, linhas, valor: Math.round(valor * 100) / 100 };
}

export async function aplicarContagemEstoque(
  supabase: SupabaseClient,
  professionalId: string,
  ajustes: { id: string; quantity: number; custo_unitario?: number }[]
): Promise<{ ok: true; alterados: number } | { ok: false; error: string }> {
  if (!Array.isArray(ajustes) || ajustes.length === 0) {
    return { ok: false, error: "Nenhum item para ajustar." };
  }

  const ids = ajustes.map((a) => a.id);
  const atual = await listarEstoqueProfissional(supabase, professionalId);
  if (!atual.ok) return atual;
  const mapa = new Map(atual.itens.filter((i) => ids.includes(i.id)).map((i) => [i.id, i]));

  let alterados = 0;
  const agora = new Date().toISOString();

  for (const a of ajustes) {
    const antes = mapa.get(a.id);
    if (!antes) continue;
    const qtd = Math.max(0, num(a.quantity));
    const custo = a.custo_unitario != null ? Math.max(0, num(a.custo_unitario)) : antes.custo_unitario;
    const delta = qtd - antes.quantity;
    if (delta === 0 && custo === antes.custo_unitario) continue;

    const notes = notaComValor(antes.notes, custo, "Contagem manual");
    const update: Record<string, unknown> = {
      quantity: qtd,
      notes,
      updated_at: agora,
    };

    let { error } = await supabase
      .from("pro_inventory")
      .update({ ...update, custo_unitario: custo })
      .eq("id", a.id)
      .eq("professional_id", professionalId);

    if (error && (error.code === "42703" || String(error.message || "").includes("custo_unitario"))) {
      const fb = await supabase
        .from("pro_inventory")
        .update(update)
        .eq("id", a.id)
        .eq("professional_id", professionalId);
      error = fb.error;
    }
    if (error) return { ok: false, error: error.message };

    if (delta !== 0) {
      await registrarMovimento(supabase, {
        professional_id: professionalId,
        product_id: antes.product_id,
        inventory_id: a.id,
        quantity_delta: delta,
        reason: "contagem",
      });
    }
    alterados += 1;
  }

  return { ok: true, alterados };
}
