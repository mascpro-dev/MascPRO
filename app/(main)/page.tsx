"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, TrendingUp, Users, ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Membro MASC");
  
  // Saldos
  const [totalCoins, setTotalCoins] = useState(0); 
  const [personalScore, setPersonalScore] = useState(0); 
  const [networkScore, setNetworkScore] = useState(0); 
  const [storeScore, setStoreScore] = useState(0); 

  useEffect(() => {
    let channel: any = null;

    async function init() {
        console.log("🚀 Iniciando Dashboard...");
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
            console.log("👤 Usuário logado:", user.id);
            await fetchData(user.id);
            
            // CONECTA AO REALTIME
            console.log("🔌 Conectando ao Realtime para saldo...");
            channel = supabase.channel('dashboard_realtime')
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'profiles',
                    filter: `id=eq.${user.id}` 
                }, (payload) => {
                    console.log("💰 ATUALIZAÇÃO RECEBIDA:", payload.new);
                    updateStats(payload.new);
                })
                .subscribe((status) => {
                    console.log("Status da conexão Realtime:", status);
                });
        } else {
            console.log("❌ Nenhum usuário logado.");
            setLoading(false);
        }
    }
    
    init();

    // Cleanup function
    return () => {
        if (channel) {
            console.log("🧹 Limpando conexão Realtime...");
            supabase.removeChannel(channel);
        }
    };
  }, []);

  async function fetchData(uid: string) {
      try {
        const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", uid)
            .single();

        if (error) {
            console.error("🚨 Erro ao buscar perfil:", error);
            return;
        }

        if (profile) {
            console.log("✅ Dados recebidos do banco:", profile);
            setUserName(profile.full_name || "Membro MASC");
            updateStats(profile);
        } else {
            console.warn("⚠️ Perfil não encontrado no banco.");
        }
      } catch (error) {
        console.error("🚨 Erro crítico:", error);
      } finally {
        setLoading(false);
      }
  }

  function updateStats(data: any) {
      setTotalCoins(data.coins || 0);
      setPersonalScore(data.personal_coins || 0);
      setNetworkScore(data.network_coins || 0);
      setStoreScore(data.store_coins || 0);
  }

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-[#000000] text-white">
        <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
    </div>
  );

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#000000] text-white pb-20">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold italic tracking-wide">
          Olá, <span className="text-[#C9A66B]">{userName.split(' ')[0]}</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Seu progresso é recompensado.</p>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="bg-gradient-to-r from-[#1a1a1a] to-[#0a0a0a] border border-[#333] rounded-3xl p-8 mb-8 relative overflow-hidden group hover:border-[#C9A66B]/50 transition-colors shadow-2xl">
         <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4 bg-[#222] w-fit px-3 py-1 rounded-full border border-[#333]">
                <Trophy size={14} className="text-[#C9A66B]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white">MASC COIN</span>
            </div>
            
            <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter">
                {totalCoins} <span className="text-2xl text-gray-500 font-bold">PRO</span>
            </h2>
            <p className="text-gray-500 text-sm mt-4 flex items-center gap-2">
                <span className="text-[#C9A66B]">↗</span> Seu poder de compra na loja.
            </p>
         </div>
         <Trophy className="absolute -right-10 -bottom-10 text-[#C9A66B]/5 w-64 h-64 group-hover:scale-110 transition-transform duration-700" />
      </div>

      {/* DETALHES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] p-5 rounded-2xl border border-[#222] hover:bg-[#161616] transition-colors">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Mérito Pessoal</p>
            <p className="text-2xl font-bold text-white flex items-center gap-2"><TrendingUp size={18} className="text-blue-500"/> {personalScore}</p>
        </div>
        <div className="bg-[#111] p-5 rounded-2xl border border-[#222] hover:bg-[#161616] transition-colors">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Rede</p>
            <p className="text-2xl font-bold text-white flex items-center gap-2"><Users size={18} className="text-purple-500"/> {networkScore}</p>
        </div>
        <div className="bg-[#111] p-5 rounded-2xl border border-[#222] hover:bg-[#161616] transition-colors">
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Cashback Loja</p>
            <p className="text-2xl font-bold text-white flex items-center gap-2"><ShoppingBag size={18} className="text-green-500"/> {storeScore}</p>
        </div>
      </div>
      
      {/* Botões de Ação Rápida */}
      <div className="mt-8 grid grid-cols-2 gap-4">
          <Link href="/evolucao" className="bg-[#C9A66B] text-black py-4 rounded-xl font-bold text-center hover:bg-[#b08d55] transition-colors shadow-lg shadow-[#C9A66B]/10">EVOLUÇÃO</Link>
          <Link href="/loja" className="bg-[#222] text-white py-4 rounded-xl font-bold text-center border border-[#333] hover:bg-[#333] transition-colors">LOJA</Link>
      </div>

    </div>
  );
}
