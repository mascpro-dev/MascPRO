"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import PedidoPdfClienteButton from "@/componentes/PedidoPdfClienteButton";
import { montarLinkWhatsApp, normalizarWhatsAppBr } from "@/lib/catalogoVendedor";
import { pagamentoLabelPedido, statusLabelPedido, type PedidoPdfData } from "@/lib/pedidoPdfCliente";

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PedidoDetalhePage() {
  const params = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<PedidoPdfData | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, [params.id]);

  async function carregar() {
    const res = await fetch(`/api/crm/pedidos/${params.id}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir o pedido.");
    else setPedido(d.pedido);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" />
      </div>
    );
  }

  if (!pedido) return <p className="text-sm text-red-400">{erro || "Pedido não encontrado."}</p>;

  const nome = pedido.profiles?.full_name || pedido.crm_leads?.nome || "Cliente";
  const telefone = normalizarWhatsAppBr(pedido.profiles?.whatsapp || pedido.crm_leads?.telefone);
  const linhas = (pedido.order_items || [])
    .map((item) => `• ${item.products?.title || "Produto"} — ${item.quantidade} × ${moeda(Number(item.preco_unitario || 0))}`)
    .join("\n");
  const texto = `Pedido MASC PRO\n${nome}\n${linhas}\nTotal: ${moeda(Number(pedido.total || 0))}\nPagamento: ${pagamentoLabelPedido(pedido.payment_method)}`;
  const zap = telefone
    ? montarLinkWhatsApp(telefone, texto)
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;

  return (
    <div className="space-y-4">
      <Link href="/forca/pedidos" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      <header>
        <p className="font-bold">{nome}</p>
        <p className="text-sm text-zinc-400">
          {statusLabelPedido(pedido.status)} · {new Date(pedido.created_at).toLocaleDateString("pt-BR")}
        </p>
      </header>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      <div className="space-y-2">
        {(pedido.order_items || []).map((item, index) => (
          <div key={`${item.products?.title}-${index}`} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-3">
            <div>
              <p className="font-bold">{item.products?.title || "Produto"}</p>
              <p className="text-xs text-zinc-500">{item.quantidade} × {moeda(Number(item.preco_unitario || 0))}</p>
            </div>
            <p className="font-black">{moeda(Number(item.quantidade || 0) * Number(item.preco_unitario || 0))}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/10 px-3 py-3">
        <p className="text-xs text-zinc-500">{pagamentoLabelPedido(pedido.payment_method)}</p>
        <p className="text-2xl font-black">{moeda(Number(pedido.total || 0))}</p>
      </div>
      <a href={zap} target="_blank" rel="noreferrer" className="block rounded-xl bg-emerald-600 py-3 text-center text-sm font-black text-white">
        Enviar para a cliente
      </a>
      <PedidoPdfClienteButton orderId={pedido.id} pedido={pedido} className="w-full" />
    </div>
  );
}
