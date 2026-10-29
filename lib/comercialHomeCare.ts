/**
 * Uso comercial por ITEM (products.uso), não pelo pedido inteiro.
 * products.uso = home_care | profissional.
 * Sem uso preenchido, home care ainda cai nas linhas Daily/Nutri/Repair/Scalp/Curls/Blond.
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

export type UsoComercial = "home_care" | "profissional";

export type ItemParaHomeCare = {
  quantidade?: number | null;
  preco_unitario?: number | null;
  products?: {
    title?: string | null;
    linha?: string | null;
    uso?: string | null;
  } | null;
  linha?: string | null;
  uso?: string | null;
};

export function usoComercialDoItem(item: ItemParaHomeCare | null | undefined): UsoComercial | null {
  const uso = String(item?.products?.uso ?? item?.uso ?? "").toLowerCase().trim();
  if (uso === "home_care" || uso === "profissional") return uso;
  const linha = item?.products?.linha ?? item?.linha ?? null;
  if (linhaEhHomeCare(linha)) return "home_care";
  return null;
}

export function itemEhHomeCare(item: ItemParaHomeCare | null | undefined) {
  return usoComercialDoItem(item) === "home_care";
}

export function itemEhProfissional(item: ItemParaHomeCare | null | undefined) {
  return usoComercialDoItem(item) === "profissional";
}

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
    if (!itemEhHomeCare(item)) continue;

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
    "Conta o produto marcado como Home care em Admin → Produtos. Sem essa marca, ainda entram as linhas Daily, Nutri, Repair, Scalp, Curls ou Blond. Uso profissional vai para a aba Profissional.",
};

export const DEFINICAO_PROFISSIONAL_ITENS = {
  termo: "Profissional (por item)",
  texto:
    "Conta o produto marcado como Profissional em Admin → Produtos. O pedido pode misturar profissional + home care; cada item entra só na aba do uso dele.",
};

function itemSemClassificacao(item: any) {
  const uso = String(item?.products?.uso ?? item?.uso ?? "").trim();
  const linha = item?.products?.linha ?? item?.linha ?? null;
  return !uso && !linha;
}

type Sb = {
  from: (table: string) => any;
};

/**
 * Sincroniza orders.eh_kit_home_care e eh_kit_profissional a partir dos itens (products.uso).
 */
export async function sincronizarKitsHomeCarePorItens(
  supabase: Sb,
  opts?: { limitPedidos?: number; garantirEtapas?: (order: { id: string; created_at: string; profile_id: string | null }) => Promise<unknown> }
): Promise<{ marcados: number; desmarcados: number; analisados: number }> {
  const limit = opts?.limitPedidos ?? 400;
  const STATUS_PAGO = ["paid", "separacao", "despachado", "entregue"];

  let pedidos: any[] | null = null;
  let error: { message?: string } | null = null;
  const comUso = await supabase
    .from("orders")
    .select(
      "id, created_at, profile_id, status, eh_kit_home_care, eh_kit_profissional, order_items(quantidade, preco_unitario, products(title, linha, uso))"
    )
    .in("status", STATUS_PAGO)
    .order("created_at", { ascending: false })
    .limit(limit);
  error = comUso.error;
  pedidos = comUso.data;
  if (error && /uso|eh_kit_profissional/i.test(String(error.message || ""))) {
    const fb = await supabase
      .from("orders")
      .select(
        "id, created_at, profile_id, status, eh_kit_home_care, order_items(quantidade, preco_unitario, products(title, linha))"
      )
      .in("status", STATUS_PAGO)
      .order("created_at", { ascending: false })
      .limit(limit);
    error = fb.error;
    pedidos = fb.data;
  }

  if (error || !pedidos) {
    return { marcados: 0, desmarcados: 0, analisados: 0 };
  }

  let marcados = 0;
  let desmarcados = 0;

  for (const ped of pedidos) {
    const items = ped.order_items || [];
    const temHomeCare = items.some((it: ItemParaHomeCare) => itemEhHomeCare(it));
    const temProfissional = items.some((it: ItemParaHomeCare) => itemEhProfissional(it));
    const algumSemClasse = items.some(itemSemClassificacao);
    const flagHc = Boolean(ped.eh_kit_home_care);
    const flagProf = Boolean(ped.eh_kit_profissional);
    const patch: Record<string, boolean> = {};

    if (temHomeCare && !flagHc) {
      patch.eh_kit_home_care = true;
      marcados += 1;
    } else if (!temHomeCare && flagHc && !algumSemClasse && items.length > 0) {
      patch.eh_kit_home_care = false;
      desmarcados += 1;
    }

    if (temProfissional && !flagProf) {
      patch.eh_kit_profissional = true;
      marcados += 1;
    } else if (!temProfissional && flagProf && items.every((it: ItemParaHomeCare) => Boolean(it.products?.uso || it.uso))) {
      patch.eh_kit_profissional = false;
      desmarcados += 1;
    }

    if (Object.keys(patch).length === 0) continue;

    const { error: upErr } = await supabase.from("orders").update(patch).eq("id", ped.id);
    if (upErr && /eh_kit_profissional/i.test(upErr.message || "")) {
      const soHc: Record<string, boolean> = {};
      if ("eh_kit_home_care" in patch) soHc.eh_kit_home_care = patch.eh_kit_home_care;
      if (Object.keys(soHc).length) await supabase.from("orders").update(soHc).eq("id", ped.id);
    }

    const hcFinal = patch.eh_kit_home_care ?? flagHc;
    const profFinal = patch.eh_kit_profissional ?? flagProf;
    if ((patch.eh_kit_home_care === true || patch.eh_kit_profissional === true) && opts?.garantirEtapas) {
      await opts.garantirEtapas({
        id: ped.id,
        created_at: ped.created_at,
        profile_id: ped.profile_id,
      });
    }
    if (!hcFinal && !profFinal && (patch.eh_kit_home_care === false || patch.eh_kit_profissional === false)) {
      await supabase.from("comercial_regua").delete().eq("order_id", ped.id);
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
    let data = (
      await supabase.from("order_items").select("order_id, products(linha, uso)").in("order_id", slice)
    ).data;
    if (!data) {
      data = (await supabase.from("order_items").select("order_id, products(linha)").in("order_id", slice)).data;
    }

    for (const row of data || []) {
      const prod = Array.isArray(row.products) ? row.products[0] : row.products;
      if (itemEhHomeCare({ products: prod })) out.add(row.order_id);
    }
  }
  return out;
}
