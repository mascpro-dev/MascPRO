"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2, Coins } from "lucide-react";

export default function LessonButton({ amount = 50 }: { amount?: number }) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleComplete = async () => {
    if (completed) return; // Evita clique duplo
    setLoading(true);

    try {
      // 1. Chama a função segura do Banco de Dados
      const { error } = await supabase.rpc('add_pros', { amount });

      if (error) throw error;

      // 2. Sucesso!
      setCompleted(true);
      
      // 3. Atualiza o saldo na tela sem recarregar a página
      router.refresh(); 

      // Opcional: Tocar um som de "Ca-ching" aqui futuramente
      
    } catch (err) {
      console.error("Erro ao depositar:", err);
      alert("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <button disabled className="flex-1 md:flex-none bg-slate-800 text-slate-400 font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-3 cursor-default border border-slate-700">
        <CheckCircle size={20} className="text-[#A6CE44]" />
        <span>AULA CONCLUÍDA</span>
      </button>
    );
  }

  return (
    <button 
      onClick={handleComplete}
      disabled={loading}
      className="flex-1 md:flex-none bg-[#A6CE44] hover:bg-[#95b93d] text-black font-black px-8 py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(166,206,68,0.2)] hover:-translate-y-1 active:scale-95 disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <>
          <Coins size={20} strokeWidth={2.5} />
          <span>RESGATAR +{amount} PRO</span>
        </>
      )}
    </button>
  );
}