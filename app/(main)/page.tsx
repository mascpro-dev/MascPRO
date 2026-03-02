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

  // REALTIME: Escuta alterações no banco e atualiza a tela na hora
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('home_realtime_coins')
        .on('postgres_changes', { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'profiles',
            filter: `id=eq.${userId}` 
        }, (payload: any) => {
            console.log("💰 Saldo atualizado em tempo real!", payload.new);
            const p = payload.new;
            
            // AQUI ESTÁ O SEGREDO: Conectamos com o nome certo da coluna
            setTotalCoins(p.moedas_pro_acumuladas || 0);
            
            // Se você tiver essas colunas no futuro, elas funcionarão. 
            // Por enquanto, mantemos seguro para não quebrar.
            setPersonalScore(p.personal_coins || 0);
            setNetworkScore(p.network_coins || 0);
            setStoreScore(p.store_coins || 0);
        })
        .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function fetchData(uid: string) {
      try {
        // Buscamos TODOS os dados do perfil para garantir
        const { data: profile } = await supabase
            .from("profiles")
            .select("*") 
            .eq("id", uid)
            .single();

        if (profile) {
            // Conecta a coluna certa (moedas_pro_acumuladas) ao visual (totalCoins)
            setTotalCoins(profile.moedas_pro_acumuladas || 0);
            
            setPersonalScore(profile.personal_coins || 0);
            setNetworkScore(profile.network_coins || 0);
            setStoreScore(profile.store_coins || 0);
        }
      } catch (error) {
        console.error("Erro ao buscar saldo:", error);
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

      {/* CARD PRINCIPAL - Agora mostrando o valor REAL */}
      <div className="bg-gradient-to-r from-[#C9A66B] to-[#b08d55] rounded-2xl p-6 mb-8 shadow-lg shadow-[#C9A66B]/20 relative overflow-hidden">
         <div className="relative z-10">
            <p className="text-black font-bold uppercase text-xs tracking-widest mb-1">Saldo Disponível</p>
            <h2 className="text-5xl font-black text-black">
                {totalCoins} <span className="text-2xl">PRO</span>
            </h2>
            <p className="text-black/70 text-xs mt-2 font-medium">Use este saldo na Loja MASC.</p>
         </div>
         <Trophy className="absolute -right-6 -bottom-6 text-black/10 w-48 h-48 rotate-12" />
      </div>

      {/* CARDS DETALHADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className