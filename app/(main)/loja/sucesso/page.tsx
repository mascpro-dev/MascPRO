"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { CheckCircle2, Loader2, ArrowRight, ShoppingBag } from "lucide-react";

export default function SucessoPage() {
  const supabase = createClientComponentClient();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [mensagem, setMensagem] = useState("Confirmando pagamento...");

  useEffect(() => {
    async function confirmar() {
      const orderId = searchParams.get("order_id");
      if (!orderId) {
        setStatus("error");
        setMensagem("Pedido não encontrado.");
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        setStatus("error");
        setMensagem("Faça login para visualizar seu pedido.");
        return;
      }

      const { error } = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", orderId)
        .eq("profile_id", session.user.id);

      if (error) {
        console.error("Erro ao atualizar pedido como pago:", error);
        setStatus("error");
        setMensagem("Pagamento aprovado, mas não conseguimos atualizar o pedido. Avise o suporte.");
        return;
      }

      setStatus("ok");
      setMensagem("Pagamento confirmado! Seu pedido foi registrado e as comissões calculadas.");
    }
    confirmar();
  }, [searchParams, supabase]);

  const loading = status === "loading";

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-3xl p-8 text-center">
        {loading ? (
          <Loader2 className="mx-auto mb-4 text-[#C9A66B] animate-spin" size={40} />
        ) : status === "ok" ? (
          <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={40} />
        ) : (
          <CheckCircle2 className="mx-auto mb-4 text-red-500" size={40} />
        )}

        <h1 className="text-2xl font-black mb-2 uppercase tracking-tight">
          {status === "ok" ? "Pagamento aprovado" : loading ? "Processando" : "Algo deu errado"}
        </h1>
        <p className="text-sm text-zinc-400 mb-6">{mensagem}</p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push("/loja/pedidos")}
            className="w-full bg-white text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#C9A66B] transition-all"
          >
            <ShoppingBag size={16} /> Ver meus pedidos
          </button>
          <Link
            href="/loja"
            className="w-full bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold uppercase text-[11px] tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 hover:border-zinc-400 transition-all"
          >
            Continuar comprando <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

