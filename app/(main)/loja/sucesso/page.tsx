"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, ArrowRight, ShoppingBag, XCircle } from "lucide-react";

type PedidoInfo = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  shipping_address?: string | null;
  shipping_cost?: number | null;
} | null;

export default function SucessoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [mensagem, setMensagem] = useState("Confirmando pagamento...");
  const [pedido, setPedido] = useState<PedidoInfo>(null);

  useEffect(() => {
    async function confirmar() {
      const orderId = searchParams.get("order_id");
      const paymentId = searchParams.get("payment_id") || searchParams.get("collection_id");
      if (!orderId) {
        setStatus("error");
        setMensagem("Pedido não encontrado.");
        return;
      }

      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentId }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        console.error("Erro ao confirmar pedido:", data);
        setStatus("error");
        setMensagem(
          data?.error || "Pagamento aprovado, mas não conseguimos atualizar o pedido. Avise o suporte."
        );
        return;
      }

      setPedido(data.order || null);
      setStatus("ok");
      setMensagem(
        "Pagamento confirmado! Seu pedido foi atualizado e sua comissão de rede foi processada."
      );
    }
    confirmar();
  }, [searchParams]);

  const isLoading = status === "loading";

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-3xl p-8 text-center">
        {isLoading ? (
          <Loader2 className="mx-auto mb-4 text-[#C9A66B] animate-spin" size={40} />
        ) : status === "ok" ? (
          <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={40} />
        ) : (
          <XCircle className="mx-auto mb-4 text-red-500" size={40} />
        )}

        <h1 className="text-2xl font-black mb-2 uppercase tracking-tight">
          {status === "ok"
            ? "Pagamento aprovado"
            : isLoading
            ? "Processando"
            : "Algo deu errado"}
        </h1>
        <p className="text-sm text-zinc-400 mb-6">{mensagem}</p>

        {status === "ok" && pedido && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left mb-6">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Resumo do pedido</p>
            <p className="text-sm text-white font-bold">
              Pedido: {pedido.id.slice(0, 8)}...
            </p>
            <p className="text-sm text-white">
              Total: R$ {Number(pedido.total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-zinc-400">
              Status: {pedido.status} · {new Date(pedido.created_at).toLocaleDateString("pt-BR")}
            </p>
            {pedido.shipping_address && (
              <p className="text-xs text-zinc-500 mt-2">
                Entrega: {pedido.shipping_address}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/loja/pedidos")}
            className="w-full bg-white text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#C9A66B] transition-all"
          >
            <ShoppingBag size={16} /> Ver meus pedidos
          </button>
          <Link
            href="/loja"
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 hover:border-zinc-400 transition-all"
          >
            Continuar comprando <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
