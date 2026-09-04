/**
 * Home care por ITENS do pedido (products.linha), não pelo pedido inteiro.
 *
 * Linhas MASC de manutenção em casa → home care.
 * Align³ e sem linha → não contam como home care automático.
 */

export const LINHAS_HOME_CARE = [
  "daily",
  "nutri",
  "repair",
  "scalp",
  "curls",
  "blond",
] as const;

export type LinhaHomeCare = (typeof LINHAS_HOME_CARE)[number];

const HOME_CARE_SET = new Set<string>(LINHAS_HOME_CARE);

export function linhaEhHomeCare(linha: string | null | undefined): boolean {
  if (!linha) return false;
  return HOME_CARE_SET.has(String(linha).toLowerCase().trim());
}

export type ItemParaHomeCare = {
  quantidade?: number | null;
  preco_unitario?: number | null;
  products?: {
    title?: string | null;
    linha?: string | null;
  } | null;
  /** fallback se products vier aninhado diferente */
  linha?: string | null;
};

export type ResumoHomeCarePedido = {
  temHomeCare: boolean;
  qtdItens: number;
  qtdUnidades: number;
  valor: number;
  titulos: string[];
};

export function analisarItensHomeCare(
  items: ItemParaHomeCare[] | null | undefined
): ResumoHomeCarePedido {
  let qtdItens = 0;
  let qtdUnidades = 0;
  let valor = 0;
  const titulos: string[] = [];

  for (const item of items || []) {
    const linha = item.products?.linha ?? item.linha ?? null;
    if (!linhaEhHomeCare(linha)) continue;

    const qtd = Math.max(0, Math.floor(Number(item.quantidade) || 0));
    const preco = Math.max(0, Number(item.preco_unitario) || 0);
    qtdItens += 1;
    qtdUnidades += qtd;
    valor += qtd * preco;
    const titulo = String(item.products?.title || "").trim();
    if (titulo && !titulos.includes(titulo)) titulos.push(titulo);
  }

  return {
    temHomeCare: qtdItens > 0,
    qtdItens,
    qtdUnidades,
    valor: Number(valor.toFixed(2)),
    titulos,
  };
}

export function formatarResumoHomeCare(r: ResumoHomeCarePedido): string {
  if (!r.temHomeCare) return "Sem itens home care";
  const partes = [
    `${r.qtdItens} item(ns)`,
    `${r.qtdUnidades} un.`,
    `R$ ${r.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
  ];
  return partes.join(" · ");
}

export const DEFINICAO_HOME_CARE_ITENS = {
  termo: "Home care (por item)",
  texto:
    "Conta só produtos com linha Daily, Nutri, Repair, Scalp, Curls ou Blond. Align³ e produto sem linha não entram. O pedido pode misturar profissional + home care.",
};

type Sb = {
  from: (table: string) => any;
};

/**
 * Sincroniza orders.eh_kit_home_care a partir dos itens (products.linha).
 * - Tem item home care → marca kit + cria régua
 * - Todos os itens classificados e nenhum home care → desmarca kit
 * - Itens sem linha → não altera (aguarda classificação em Produtos)
 */
export async function sincronizarKitsHomeCarePorItens(
  supabase: Sb,
  opts?: { limitPedidos?: number; garantirEtapas?: (order: { id: string; created_at: string; profile_id: string | null }) => Promise<unknown> }
): Promise<{ marcados: number; desmarcados: number; analisados: number }> {
  const limit = opts?.limitPedidos ?? 400;
  const STATUS_PAGO = ["paid", "separacao", "despachado", "entregue"];

  const { data: pedidos, error } = await supabase
    .from("orders")
    .select(
      "id, created_at, profile_id, status, eh_kit_home_care, order_items(quantidade, preco_unitario, products(title, linha))"
    )
    .in("status", STATUS_PAGO)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !pedidos) {
    return { marcados: 0, desmarcados: 0, analisados: 0 };
  }

  let marcados = 0;
  let desmarcados = 0;

  for (const ped of pedidos as any[]) {
    const items = ped.order_items || [];
    const resumo = analisarItensHomeCare(items);
    const algumSemLinha = items.some((it: any) => {
      const linha = it.products?.linha ?? null;
      return !linha;
    });
    const flagAtual = Boolean(ped.eh_kit_home_care);

    if (resumo.temHomeCare && !flagAtual) {
      await supabase.from("orders").update({ eh_kit_home_care: true }).eq("id", ped.id);
      if (opts?.garantirEtapas) {
        await opts.garantirEtapas({
          id: ped.id,
          created_at: ped.created_at,
          profile_id: ped.profile_id,
        });
      }
      marcados += 1;
      continue;
    }

    if (!resumo.temHomeCare && flagAtual && !algumSemLinha && items.length > 0) {
      await supabase.from("orders").update({ eh_kit_home_care: false }).eq("id", ped.id);
      await supabase.from("comercial_regua").delete().eq("order_id", ped.id);
      desmarcados += 1;
    }
  }

  return { marcados, desmarcados, analisados: pedidos.length };
}

/** IDs de pedidos pagos que têm pelo menos 1 item home care */
export async function idsPedidosComHomeCare(
  supabase: Sb,
  orderIds: string[]
): Promise<Set<string>> {
  const out = new Set<string>();
  if (!orderIds.length) return out;

  const chunk = 80;
  for (let i = 0; i < orderIds.length; i += chunk) {
    const slice = orderIds.slice(i, i + chunk);
    const { data } = await supabase
      .from("order_items")
      .select("order_id, products(linha)")
      .in("order_id", slice);

    for (const row of data || []) {
      const linha = Array.isArray(row.products)
        ? row.products[0]?.linha
        : row.products?.linha;
      if (linhaEhHomeCare(linha)) out.add(row.order_id);
    }
  }
  return out;
}
