"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Trophy, Copy, Check } from "lucide-react";
import LoadingRespiro from "@/componentes/LoadingRespiro";

export default function VisaoGeralPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          
          setProfile(data);
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [supabase]);

  if (loading) return <LoadingRespiro />;

  const coins = profile?.coins || 0; // Busca o saldo real da coluna coins
  const balance = coins; // Usa o valor dinâmico
  const userName = "Membro Fundador"; // Conforme a imagem
  const referralCode = profile?.referral_code || "masc-pro";
  const referralLink = `mascpro.app/ref/${referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-24 md:pb-20">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter">
          Olá, {userName}
        </h1>
        <p className="text-white mt-2 text-sm md:text-base">
          Seu progresso é recompensado.
        </p>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CARD MASC COIN */}
          <div className="bg-black border border-white/10 p-6 md:p-8 rounded-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 md:p-8 opacity-10 pointer-events-none">
                <Trophy size={100} className="md:w-[120px] md:h-[120px] text-[#C9A66B]" />
             </div>
             <div className="relative z-10">
                 <div className="inline-flex items-center gap-2 border border-white/20 bg-white/5 rounded-full px-3 py-1 mb-4 md:mb-6">
                    <Trophy size={14} className="text-[#C9A66B]"/>
                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">MASC COIN</span>
                 </div>
                 <div className="flex items-baseline gap-1 mb-2">
                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter">
                        {formatNumber(balance)}
                    </h2>
                    <span className="text-lg md:text-xl lg:text-2xl font-bold text-[#C9A66B] ml-1">PRO</span>
                 </div>
                 <p className="text-white text-sm font-medium flex items-center gap-1">
                   <span className="text-[#C9A66B]">↗</span> Seu poder de compra na loja.
                 </p>
             </div>
          </div>

          {/* CARD PRÓXIMA PLACA */}
          <div className="bg-black border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col justify-between">
              <div>
                  <h3 className="text-lg md:text-xl font-bold text-white mb-1">Próxima Placa</h3>
                  <p className="text-white text-sm">Marco de 10k</p>
              </div>
              <div className="mt-6 md:mt-8">
                  <div className="flex justify-between text-xs font-bold text-white mb-2 uppercase tracking-wider">
                      <span>{formatNumber(balance)} PRO</span>
                      <span>10.000 PRO</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A66B]" style={{ width: `${Math.min((balance / 10000) * 100, 100)}%` }} /> 
                  </div>
              </div>
              <button className="mt-6 w-full border border-white/10 bg-transparent text-white font-bold py-3 rounded-lg hover:bg-white/5 transition-colors uppercase text-xs tracking-widest">
                  VER PLACAS
              </button>
          </div>
      </div>

      {/* CARD CONVITE EXCLUSIVO - Apenas Desktop */}
      <div className="hidden md:block bg-black border border-white/10 rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-white font-bold text-lg mb-1">Convite Exclusivo</h3>
          <p className="text-white text-sm">Ganhe PROs convidando profissionais.</p>
        </div>
        <div className="flex items-center gap-2 flex-col sm:flex-row">
          <div className="bg-slate-900 border border-white/10 px-4 py-3 rounded-xl font-mono text-xs text-white flex-1 w-full sm:w-auto text-center sm:text-left">
            {referralLink}
          </div>
          <button 
            onClick={handleCopy}
            className="bg-slate-900 border border-white/10 text-white hover:bg-slate-800 font-bold text-xs px-4 py-3 rounded-xl transition-all flex items-center gap-2 w-full sm:w-auto justify-center min-w-[100px]"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}