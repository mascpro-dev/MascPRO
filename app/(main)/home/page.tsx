"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, Users, ShoppingBag, Loader2 } from "lucide-react";

export default function HomePage() {
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    own: 0,     // Evolução
    network: 0, // Rede
    store: 0    // Loja
  });

  useEffect(() => {
    async function fetchTotals() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // AQUI ESTÁ O SEGREDO DA ORIENTAÇÃO:
        // Lemos da VIEW (v_pro_totals), não da tabela profiles direta.
        // O banco já entrega a soma pronta.
        const { data, error } = await supabase
          .from("v_pro_totals")
          .select("pro_total, pro_own, pro_network, pro_store")
          .eq("profile_id", user.id)
          .single();

        if (data) {
          setStats({
            total: data.pro_total || 0,
            own: data.pro_own || 0,
            network: data.pro_network || 0,
            store: data.pro_store || 0
          });
        }
      } catch (error) {
        console.error("Erro ao carregar totais:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTotals();
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      {/* CABEÇALHO */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Olá, Mestre!</h1>
          <p className="text-gray-400 text-sm">Bem-vindo ao MascPRO</p>
        </div>
        <div className="bg-[#C9A66B]/10 border border-[#C9A66B] px-4 py-2 rounded-full flex items-center gap-2">
            <Trophy size={18} className="text-[#C9A66B]" />
            <span className="font-bold text-[#C9A66B] text-lg">{stats.total} PRO</span>
        </div>
      </div>

      {/* CARDS DE RESUMO (Baseado na View) */}
      <div className="grid grid-cols-2 gap-4">
        {/* CARD EVOLUÇÃO (Mérito Próprio) */}
        <div className="bg-[#111] border border-[#222] p-4 rounded-xl flex flex-col justify-between h-32">
            <div className="p-2 bg-blue-500/10 w-fit rounded-lg"><Trophy size={20} className="text-blue-500"/></div>
            <div>
                <span className="text-gray-400 text-xs uppercase font-bold">Mérito Próprio</span>
                <h3 className="text-2xl font-bold text-white">{stats.own}</h3>
            </div>
        </div>

        {/* CARD REDE (Indicações) */}
        <div className="bg-[#111] border border-[#222] p-4 rounded-xl flex flex-col justify-between h-32">
            <div className="p-2 bg-green-500/10 w-fit rounded-lg"><Users size={20} className="text-green-500"/></div>
            <div>
                <span className="text-gray-400 text-xs uppercase font-bold">Rede</span>
                <h3 className="text-2xl font-bold text-white">{stats.network}</h3>
            </div>
        </div>
      </div>

      {/* CARD GRANDE INFERIOR (Loja ou Info) */}
      <div className="mt-4 bg-[#111] border border-[#222] p-6 rounded-xl">
          <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-purple-500/10 rounded-full"><ShoppingBag size={24} className="text-purple-500"/></div>
              <div>
                  <h3 className="font-bold text-lg">Marketplace</h3>
                  <p className="text-gray-400 text-sm">Use seu saldo na loja</p>
              </div>
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.store} <span className="text-sm font-normal text-gray-500">disponíveis</span></div>
      </div>
    </div>
  );
}
