"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { imprimirPedidoClientePdf, type PedidoPdfData } from "@/lib/pedidoPdfCliente";

type Props = {
  orderId: string;
  label?: string;
  className?: string;
  compacto?: boolean;
  /** Se já tiver os dados completos, evita fetch */
  pedido?: PedidoPdfData | null;
};

export default function PedidoPdfClienteButton({
  orderId,
  label = "PDF para cliente",
  className = "",
  compacto = false,
  pedido: pedidoInicial,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function gerar() {
    if (!orderId) return;
    setLoading(true);
    try {
      let pedido = pedidoInicial;
      if (!pedido?.order_items?.length) {
        const res = await fetch(`/api/crm/pedidos/${orderId}`, { cache: "no-store" });
        const d = await res.json().catch(() => null);
        if (!res.ok || !d?.ok) {
          alert(d?.error || "Não foi possível carregar o pedido.");
          return;
        }
        pedido = d.pedido;
      }
      imprimirPedidoClientePdf(pedido as PedidoPdfData);
    } finally {
      setLoading(false);
    }
  }

  if (compacto) {
    return (
      <button
        type="button"
        onClick={() => void gerar()}
        disabled={loading || !orderId}
        title={label}
        className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#C9A66B] hover:text-white disabled:opacity-50 ${className}`}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
        PDF
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void gerar()}
      disabled={loading || !orderId}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[#C9A66B]/40 bg-[#C9A66B]/10 text-[#C9A66B] hover:bg-[#C9A66B]/20 text-xs font-black uppercase tracking-widest disabled:opacity-50 ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
      {label}
    </button>
  );
}
