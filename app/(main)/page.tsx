"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, TrendingUp, Users, ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Saldos
  const [totalCoins, setTotalCoins] = useState(0); 
  const [personalScore, setPersonalScore] = useState(0); 
  const [networkScore, setNetworkScore] = useState(0); 
  const [storeScore, setStoreScore] = useState(0); 

  useEffect(() => {
    async function init() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            fetchData(user.id);
        } else {
            setLoading(false);
        }
    }
    init();
  }, []);

  // REALTIME: Escuta alterações no MEU PERFIL (Ex: Ganhei moedas)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('home_realtime_coins')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${userId}` // Só escuta meu próprio ID
        }, (payload) => {
            console.log("💰 Saldo atualizado em tempo real!", payload.new);
            const p = payload.new;
            setTotalCoins(p.coins || 0);
            setPersonalScore(p.personal_coins || 0);
            setNetworkScore(p.network_coins || 0);
            setStoreScore(p.store_coins || 0);
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function fetchData(uid: string) {
      try {
        const { data: profile } = await supabase
            .from("profiles")
            .select("coins, personal_coins, network_coins, store_coins")
            .eq("id", uid)
            .single();

        if (profile) {
            setTotalCoins(profile.coins || 0);
            setPersonalScore(profile.personal_coins || 0);
            setNetworkScore(profile.network_coins || 0);
            setStoreScore(profile.store_coins || 0);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
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
          VISÃO <span className="text-[#C9A66B]">GERAL</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Acompanhe seu progresso e saldo total.</p>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="bg-gradient-to-r from-[#C9A66B] to-[#b08d55] rounded-2xl p-6 mb-8 shadow-lg shadow-[#C9A66B]/20 relative overflow-hidden">
         <div className="relative z-10">
            <p className="text-black font-bold uppercase text-xs tracking-widest mb-1">Saldo Disponível</p>
            <h2 className="text-5xl font-black text-black">{totalCoins} <span className="text-2xl">PRO</span></h2>
            <p className="text-black/70 text-xs mt-2 font-medium">Use este saldo na Loja MASC.</p>
         </div>
         <Trophy className="absolute -right-6 -bottom-6 text-black/10 w-48 h-48 rotate-12" />
      </div>

      {/* CARDS DETALHADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-[#222] p-5 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-900/20 text-blue-500 flex items-center justify-center"><TrendingUp size={24} /></div>
            <div><p className="text-gray-500 text-xs uppercase font-bold">Mérito Pessoal</p><p className="text-xl font-bold text-white">{personalScore}</p></div>
        </div>
        <div className="bg-[#111] border border-[#222] p-5 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-900/20 text-purple-500 flex items-center justify-center"><Users size={24} /></div>
            <div><p className="text-gray-500 text-xs uppercase font-bold">Bônus de Rede</p><p className="text-xl font-bold text-white">{networkScore}</p></div>
        </div>
        <div className="bg-[#111] border border-[#222] p-5 rounded-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-900/20 text-green-500 flex items-center justify-center"><ShoppingBag size={24} /></div>
            <div><p className="text-gray-500 text-xs uppercase font-bold">Cashback Loja</p><p className="text-xl font-bold text-white">{storeScore}</p></div>
        </div>
      </div>

      <div className="mt-8 flex gap-4">
          <Link href="/loja" className="flex-1 bg-[#222] hover:bg-[#333] text-white py-4 rounded-xl text-center font-bold text-sm transition-colors border border-[#333]">IR PARA LOJA</Link>
          <Link href="/evolucao" className="flex-1 bg-[#222] hover:bg-[#333] text-white py-4 rounded-xl text-center font-bold text-sm transition-colors border border-[#333]">VER AULAS</Link>
      </div>

    </div>
  );
}
