import type { SupabaseClient } from "@supabase/supabase-js";

export type TabelaPrecoVendedor = {
  product_id: string;
  preco_final: number;
  preco_minimo: number;
  preco_cabeleireiro: number;
  title?: string;
};

export async function carregarTabelaPrecosDistribuidor(
  supabase: SupabaseClient,
  distribuidorId: string
): Promise<Map<string, TabelaPrecoVendedor>> {
  const { data: produtos } = await supabase
    .from("products")
    .select("id, title, price, price_hairdresser, ativo")
    .eq("ativo", true);

  const { data: custom } = await supabase
    .from("distribuidor_tabela_precos")
    .select("product_id, preco_final, preco_minimo")
    .eq("distribuidor_id", distribuidorId);

  const customMap = new Map(
    (custom || []).map((r) => [r.product_id, r])
  );

  const map = new Map<string, TabelaPrecoVendedor>();
  for (const p of produtos || []) {
    const base = Number(p.price_hairdresser) || Number(p.price) || 0;
    const row = customMap.get(p.id);
    const preco_final = row ? Number(row.preco_final) : base;
    const preco_minimo = row ? Number(row.preco_minimo) : base;
    map.set(p.id, {
      product_id: p.id,
      title: p.title,
      preco_cabeleireiro: base,
      preco_final,
      preco_minimo: Math.min(preco_minimo, preco_final),
    });
  }
  return map;
}

export type ItemPedidoVendedorInput = {
  product_id: string;
  quantidade: number;
  preco_unitario: number;
  bonificado?: boolean;
};

export type AvaliacaoPedidoVendedor = {
  precisa_aprovacao: boolean;
  motivos: string[];
  excluir_meta: boolean;
  excluir_comissao: boolean;
  itens: {
    product_id: string;
    preco_tabela: number;
    preco_praticado: number;
    bonificado: boolean;
    fora_faixa: boolean;
  }[];
};

export function avaliarPedidoVendedor(
  itens: ItemPedidoVendedorInput[],
  tabela: Map<string, TabelaPrecoVendedor>,
  paymentMethod: string
): AvaliacaoPedidoVendedor {
  const isConsignado = String(paymentMethod || "").toLowerCase() === "consignado";
  const motivos: string[] = [];
  let precisa_aprovacao = false;

  const itensOut = itens.map((i) => {
    const tab = tabela.get(i.product_id);
    const preco_tabela = tab?.preco_final ?? Number(i.preco_unitario);
    const preco_minimo = tab?.preco_minimo ?? preco_tabela;
    const bonificado = Boolean(i.bonificado) || Number(i.preco_unitario) === 0;
    const preco_praticado = bonificado ? 0 : Number(i.preco_unitario);
    let fora_faixa = false;

    if (bonificado) {
      fora_faixa = true;
      if (!motivos.includes("bonificação")) motivos.push("bonificação");
    } else if (preco_praticado < preco_minimo - 0.009) {
      fora_faixa = true;
      if (!motivos.includes("preço abaixo do mínimo")) motivos.push("preço abaixo do mínimo");
    } else if (preco_praticado > preco_tabela + 0.009) {
      fora_faixa = true;
      if (!motivos.includes("preço acima do tabelado")) motivos.push("preço acima do tabelado");
    }

    if (fora_faixa) precisa_aprovacao = true;

    return {
      product_id: i.product_id,
      preco_tabela,
      preco_praticado,
      bonificado,
      fora_faixa,
    };
  });

  return {
    precisa_aprovacao,
    motivos,
    excluir_meta: isConsignado,
    excluir_comissao: isConsignado,
    itens: itensOut,
  };
}

export async function calcularPercentualComissaoVendedor(
  supabase: SupabaseClient,
  distribuidorId: string,
  vendedorId: string,
  periodo: string
): Promise<number> {
  const iniMes = `${periodo}-01`;
  const fimDate = new Date(
    new Date(`${periodo}-01`).getFullYear(),
    new Date(`${periodo}-01`).getMonth() + 1,
    0
  );
  const fimMes = `${fimDate.toISOString().slice(0, 10)}T23:59:59`;

  const { data: pedidos2 } = await supabase
    .from("orders")
    .select("total, aprovacao_status, excluir_comissao, status")
    .eq("vendedor_id", vendedorId)
    .gte("created_at", iniMes)
    .lte("created_at", fimMes);

  let vendas = 0;
  for (const p of pedidos2 || []) {
    if (p.excluir_comissao) continue;
    if (!["paid", "separacao", "despachado", "entregue"].includes(String(p.status))) continue;
    const ap = p.aprovacao_status;
    if (ap === "pendente" || ap === "rejeitado") continue;
    vendas += Number(p.total || 0);
  }

  const { data: faixas } = await supabase
    .from("distribuidor_comissao_faixas")
    .select("venda_de, venda_ate, percentual")
    .eq("distribuidor_id", distribuidorId)
    .order("ordem", { ascending: true });

  if (!faixas?.length) return 0;

  let percentual = Number(faixas[0].percentual) || 0;
  for (const f of faixas) {
    const de = Number(f.venda_de) || 0;
    const ate = f.venda_ate != null ? Number(f.venda_ate) : null;
    if (vendas >= de && (ate == null || vendas <= ate)) {
      percentual = Number(f.percentual) || 0;
    }
  }
  return percentual;
}
