export type PedidoPdfItem = {
  quantidade: number;
  preco_unitario: number;
  bonificado?: boolean;
  preco_tabela?: number | null;
  products?: { title?: string | null } | null;
};

export type PedidoPdfData = {
  id: string;
  created_at: string;
  total: number;
  payment_method: string | null;
  status: string;
  shipping_cost: number | null;
  shipping_cep: string | null;
  shipping_address: string | null;
  desconto_total?: number | null;
  aprovacao_status?: string | null;
  order_items?: PedidoPdfItem[];
  profiles?: { full_name?: string | null; email?: string | null; whatsapp?: string | null } | null;
  crm_leads?: { nome?: string; telefone?: string | null; email?: string | null; cidade?: string | null; estado?: string | null } | null;
  vendedor_nome?: string | null;
  distribuidor_nome?: string | null;
};

export function pagamentoLabelPedido(metodo: string | null | undefined): string {
  const m = String(metodo || "").toLowerCase();
  const map: Record<string, string> = {
    pix: "PIX",
    dinheiro: "Dinheiro",
    cartao: "Cartão",
    boleto: "Boleto",
    transferencia: "Transferência",
    manual: "Manual",
    mercadopago: "Mercado Pago",
    consignado: "Consignado",
    rede_embaixadora: "Rede Embaixadora",
    pendente: "Pendente",
  };
  return map[m] || metodo || "Não informado";
}

export function statusLabelPedido(status: string): string {
  const map: Record<string, string> = {
    novo: "Novo",
    pending: "Aguardando pagamento",
    paid: "Pago",
    separacao: "Em separação",
    despachado: "Despachado",
    entregue: "Entregue",
    cancelled: "Cancelado",
  };
  return map[String(status).toLowerCase()] || status;
}

function moeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function montarHtmlPedidoCliente(pedido: PedidoPdfData): string {
  const lead = pedido.crm_leads;
  const perfil = pedido.profiles;
  const clienteNome =
    lead?.nome || perfil?.full_name || "Cliente";
  const clienteTel = lead?.telefone || perfil?.whatsapp || "";
  const clienteEmail = lead?.email || perfil?.email || "";
  const clienteCidade = [lead?.cidade, lead?.estado].filter(Boolean).join(" / ");

  const itens = (pedido.order_items || [])
    .map((item) => {
      const nome = item.products?.title || "Produto";
      const qtd = Number(item.quantidade || 0);
      const bonificado = Boolean(item.bonificado);
      const unit = bonificado ? 0 : Number(item.preco_unitario || 0);
      const subtotal = unit * qtd;
      const obs = bonificado ? '<span style="color:#b8860b;font-size:11px"> · Bonificado</span>' : "";
      return `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee">${nome}${obs}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:center">${qtd}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">${bonificado ? "—" : moeda(unit)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;text-align:right">${bonificado ? "Bonificação" : moeda(subtotal)}</td>
      </tr>`;
    })
    .join("");

  const subtotalItens = (pedido.order_items || []).reduce((acc, i) => {
    if (i.bonificado) return acc;
    return acc + Number(i.preco_unitario || 0) * Number(i.quantidade || 0);
  }, 0);
  const frete = Number(pedido.shipping_cost || 0);
  const codigo = String(pedido.id).slice(0, 8).toUpperCase();

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Pedido MascPRO ${codigo}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;padding:28px;max-width:820px;margin:0 auto">
  <div style="border-bottom:3px solid #C9A66B;padding-bottom:16px;margin-bottom:24px">
    <h1 style="margin:0;font-size:26px;letter-spacing:2px;color:#C9A66B">MASCPRO</h1>
    <p style="margin:4px 0 0;font-size:12px;color:#666;text-transform:uppercase;letter-spacing:1px">Proposta / Pedido comercial</p>
  </div>

  <table style="width:100%;margin-bottom:20px;font-size:13px">
    <tr>
      <td style="vertical-align:top;width:50%">
        <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;font-weight:bold">Cliente</p>
        <p style="margin:0;font-size:16px;font-weight:bold">${clienteNome}</p>
        ${clienteTel ? `<p style="margin:4px 0 0;color:#444">${clienteTel}</p>` : ""}
        ${clienteEmail ? `<p style="margin:2px 0 0;color:#444">${clienteEmail}</p>` : ""}
        ${clienteCidade ? `<p style="margin:2px 0 0;color:#666">${clienteCidade}</p>` : ""}
      </td>
      <td style="vertical-align:top;text-align:right">
        <p style="margin:0 0 4px"><strong>Pedido:</strong> #${codigo}</p>
        <p style="margin:0 0 4px"><strong>Data:</strong> ${new Date(pedido.created_at).toLocaleString("pt-BR")}</p>
        <p style="margin:0 0 4px"><strong>Pagamento:</strong> ${pagamentoLabelPedido(pedido.payment_method)}</p>
        <p style="margin:0"><strong>Status:</strong> ${statusLabelPedido(pedido.status)}</p>
      </td>
    </tr>
  </table>

  ${pedido.vendedor_nome || pedido.distribuidor_nome ? `
  <p style="font-size:12px;color:#666;margin:0 0 18px">
    ${pedido.vendedor_nome ? `Vendedor: <strong>${pedido.vendedor_nome}</strong>` : ""}
    ${pedido.vendedor_nome && pedido.distribuidor_nome ? " · " : ""}
    ${pedido.distribuidor_nome ? `Distribuidor: <strong>${pedido.distribuidor_nome}</strong>` : ""}
  </p>` : ""}

  <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:13px">
    <thead>
      <tr style="background:#faf6ef">
        <th style="padding:10px 8px;text-align:left;border-bottom:2px solid #C9A66B">Produto</th>
        <th style="padding:10px 8px;text-align:center;border-bottom:2px solid #C9A66B;width:60px">Qtd</th>
        <th style="padding:10px 8px;text-align:right;border-bottom:2px solid #C9A66B;width:100px">Unit.</th>
        <th style="padding:10px 8px;text-align:right;border-bottom:2px solid #C9A66B;width:110px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${itens || `<tr><td colspan="4" style="padding:12px;color:#888">Sem itens</td></tr>`}</tbody>
  </table>

  <div style="margin-left:auto;width:280px;font-size:13px">
    <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Subtotal produtos</span><span>${moeda(subtotalItens)}</span></div>
    <div style="display:flex;justify-content:space-between;padding:4px 0"><span>Frete</span><span>${moeda(frete)}</span></div>
    ${Number(pedido.desconto_total || 0) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#b8860b"><span>Descontos</span><span>− ${moeda(Number(pedido.desconto_total))}</span></div>` : ""}
    <div style="display:flex;justify-content:space-between;padding:10px 0;margin-top:8px;border-top:2px solid #C9A66B;font-size:18px;font-weight:bold">
      <span>Total</span><span style="color:#C9A66B">${moeda(Number(pedido.total || 0))}</span>
    </div>
  </div>

  ${pedido.shipping_address ? `
  <div style="margin-top:28px;padding:14px;background:#f9f9f9;border-radius:8px;font-size:12px">
    <p style="margin:0 0 6px;font-weight:bold;text-transform:uppercase;color:#888;font-size:10px">Entrega</p>
    ${pedido.shipping_cep ? `<p style="margin:0 0 4px">CEP: ${pedido.shipping_cep}</p>` : ""}
    <p style="margin:0">${pedido.shipping_address}</p>
  </div>` : ""}

  <p style="margin-top:32px;font-size:11px;color:#999;line-height:1.5">
    Documento gerado pelo CRM MascPRO. Valores sujeitos à confirmação de pagamento e disponibilidade de estoque.
    ${pedido.payment_method === "consignado" ? " Modalidade consignada — condições acordadas com o representante." : ""}
  </p>

  <script>setTimeout(function(){ window.print(); }, 300);</script>
</body>
</html>`;
}

/** Abre janela de impressão / salvar como PDF (Ctrl+P → Salvar em PDF) */
export function imprimirPedidoClientePdf(pedido: PedidoPdfData): void {
  const html = montarHtmlPedidoCliente(pedido);
  const w = window.open("", "_blank", "width=900,height=760");
  if (!w) {
    alert("Não foi possível abrir a janela. Permita pop-ups para gerar o PDF.");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
