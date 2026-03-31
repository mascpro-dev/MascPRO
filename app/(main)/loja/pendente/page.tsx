"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, Loader2, ShoppingBag } from "lucide-react";

function PendentePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [checando, setChecando] = useState(false);
  const [tentativas, setTentativas] = useState(0);
  const orderId = searchParams.get("order_id");

  async function verificarPagamento() {
    if (!orderId || checando) return;
    setChecando(true);
    try {
      const res = await fetch("/api/orders/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data?.order?.status === "paid") {
        router.push(`/loja/sucesso?order_id=${orderId}`);
        return;
      }
      setTentativas((t) => t + 1);
    } catch {
      setTentativas((t) => t + 1);
    } finally {
      setChecando(false);
    }
  }

  // Verifica automaticamente a cada 5 segundos por até 20 minutos
  useEffect(() => {
    if (!orderId) return;
    const interval = setInterval(verificarPagamento, 5000);
    const stop = setTimeout(() => clearInterval(interval), 20 * 60 * 1000);
    return () => { clearInterval(interval); clearTimeout(stop); };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-3xl p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-900/20 border border-yellow-500/30 flex items-center justify-center">
          <Clock className="text-yellow-400" size={36} />
        </div>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
          Aguardando a Masc PRO
        </h1>
        <p className="text-zinc-400 text-sm mb-6">
          Seu pedido foi criado. Já avisamos a Masc PRO — assim que eles confirmarem no banco, o status será atualizado.
        </p>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 text-left">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">O que fazer agora</p>
          <ul className="text-sm text-zinc-300 space-y-2">
            <li>✅ Clique em ver meus pedidos</li>
            <li>✅ Aguarde a confirmação da empresa</li>
            <li>☕ Tome um café que já já atualizaremos</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/loja/pedidos"
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <ShoppingBag size={14} /> Ver meus pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PendentePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-yellow-400" size={32} /></div>}>
      <PendentePage />
    </Suspense>
  );
}
