"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState } from "react";
import { CheckCircle, Zap, Loader2, Lock } from "lucide-react"; 
import { useRouter } from "next/navigation";

export default function LessonButton({ amount, locked = false }: { amount: number, locked?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleCollect = async () => {
    if (locked || completed) return;
    
    setLoading(true);

    // CHAMA A FUNÇÃO INTELIGENTE DO BANCO (RPC)
    // Ela já dá os 100% pro aluno e 10% pro padrinho automaticamente
    const { error } = await supabase.rpc('redeem_points', { 
      amount: amount 
    });

    if (!error) {
      setCompleted(true);
      router.refresh(); // Atualiza o saldo na tela
    } else {
      console.error(error);
      alert("Erro ao resgatar. Tente novamente.");
    }
    setLoading(false);
  };

  // 1. ESTADO: JÁ RESGATADO
  if (completed) {
    return (
      <button disabled className="w-full flex-1 border border-green-500 text-green-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-default bg-transparent opacity-50 transition-all">
        <CheckCircle size={20} />
        Resgatado (+{amount} PRO)
      </button>
    );
  }

  // 2. ESTADO: TRAVADO (AGUARDANDO VÍDEO)
  if (locked) {
      return (
        <button disabled className="w-full flex-1 border border-slate-700 text-slate-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed bg-transparent opacity-50 transition-all">
            <Lock size={20} />
            Assista até o final
        </button>
      );
  }

  // 3. ESTADO: PRONTO PARA RESGATAR
  return (
    <button 
      onClick={handleCollect}
      disabled={loading}
      className="w-full flex-1 group bg-[#A6CE44]/10 hover:bg-[#A6CE44] border border-[#A6CE44] text-[#A6CE44] hover:text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(166,206,68,0.1)] hover:shadow-[0_0_30px_rgba(166,206,68,0.6)] active:scale-95"
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <>
            <Zap size={20} className="group-hover:fill-black transition-transform" /> 
            RESGATAR +{amount} PRO
        </>
      )}
    </button>
  );
}