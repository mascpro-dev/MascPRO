"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2, Lock, ShieldCheck, Users, Zap } from "lucide-react";

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  
  // Dados do Usuário
  const [nome, setNome] = useState("Embaixador");
  
  // Matemática da Gamificação
  const [scoreTotal, setScoreTotal] = useState(0);      // O valor real (Ex: 4620)
  const [scoreRede, setScoreRede] = useState(0);        // O valor da rede (Ex: 700)
  const [scorePessoal, setScorePessoal] = useState(0);  // A diferença (Ex: 3920)

  // Metas
  const META_CERTIFIED = 10000;
  const META_REDE = 20000; // Exemplo de meta para rede

  useEffect(() => {
    async function carregarDados() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, moedas_pro_acumuladas, network_coins, personal_coins")
          .eq("id", user.id)
          .single();

        if (profile) {
          setNome(profile.full_name || "Marcelo");

          // moedas_pro_acumuladas JÁ É a soma de tudo (personal + rede + compras)
          const totalGeral = profile.moedas_pro_acumuladas || 0;

          // Rede: só os PROs de entrada dos indicados (50 por indicado)
          const redeEntrada = profile.network_coins || 0;

          // Esforço pessoal: só os PROs de aulas assistidas pelo próprio usuário
          const pessoal = profile.personal_coins || 0;

          setScoreTotal(totalGeral);   // card: RUMO AO CERTIFIED
          setScoreRede(redeEntrada);   // card: POTENCIAL DA REDE (16 × 50 = 800)
          setScorePessoal(pessoal);    // card: EVOLUÇÃO TÉCNICA (só aulas próprias)
        }
      }
      setLoading(false);
    }
    
    carregarDados();
  }, []);

  // Calcula porcentagem para a barra de progresso
  const progressoCertified = Math.min((scoreTotal / META_CERTIFIED) * 100, 100);

  if (loading) return (
    <div className="flex justify-center items-center h-screen bg-black text-white">
        <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
    </div>
  );

  return (
    <div className="p-6 md:p-10 min-h-screen bg-black text-white">
      
      {/* CABEÇALHO */}
      <div className="mb-10 flex justify-between items-end">
        <div>
            <h1 className="text-4xl font-black italic tracking-tighter">
            OLÁ, <span className="text-white">{nome}</span>
            </h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">Painel de Controle</p>
        </div>
        
        {/* Badge de Nível Atual */}
        <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#C9A66B] animate-pulse"></div>
            <span className="text-[#C9A66B] font-bold text-xs uppercase">Rumo ao Certified</span>
        </div>
      </div>

      {/* GRID DE CARDS (VISUAL GAMIFICADO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         
         {/* CARD 1: O PRINCIPAL (RUMO AO CERTIFIED) */}
         <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl relative overflow-hidden group hover:border-[#C9A66B]/50 transition-all">
            <div className="flex justify-between items-start mb-6">
                <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Rumo ao Certified</span>
                <ShieldCheck className="text-[#C9A66B]" size={24} />
            </div>
            
            <div className="relative z-10">
                <h2 className="text-5xl font-black text-white mb-1">{scoreTotal}</h2>
                <p className="text-gray-500 text-xs font-bold uppercase">Meta: {META_CERTIFIED.toLocaleString()} PRO</p>
                
                {/* Barra de Progresso */}
                <div className="w-full h-2 bg-zinc-800 rounded-full mt-6 overflow-hidden">
                    <div 
                        className="h-full bg-[#C9A66B] shadow-[0_0_15px_rgba(201,166,107,0.5)] transition-all duration-1000 ease-out"
                        style={{ width: `${progressoCertified}%` }}
                    ></div>
                </div>
                <p className="text-right text-[10px] text-[#C9A66B] mt-2 font-bold">{progressoCertified.toFixed(1)}% do objetivo</p>
            </div>
         </div>

         {/* CARD 2: POTENCIAL DA REDE */}
         <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl group hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start mb-6">
                <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Potencial da Rede</span>
                <Users className="text-purple-500" size={24} />
            </div>
            <div>
                <h2 className="text-4xl font-black text-white mb-1">{scoreRede}</h2>
                <p className="text-gray-500 text-xs font-bold uppercase">Ganhos por indicação</p>
                <div className="w-full h-1 bg-zinc-800 rounded-full mt-6">
                    <div className="h-full bg-purple-500 w-[10%]"></div> 
                </div>
            </div>
         </div>

         {/* CARD 3: EVOLUÇÃO TÉCNICA (SEU ESFORÇO) */}
         <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-3xl group hover:border-zinc-700 transition-all">
            <div className="flex justify-between items-start mb-6">
                <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Evolução Técnica</span>
                <Zap className="text-blue-500" size={24} />
            </div>
            <div>
                {/* AQUI MOSTRAMOS O VALOR CALCULADO (Total - Rede) */}
                <h2 className="text-4xl font-black text-white mb-1">{scorePessoal}</h2>
                <p className="text-gray-500 text-xs font-bold uppercase">Seu esforço pessoal</p>
                <div className="w-full h-1 bg-zinc-800 rounded-full mt-6">
                     {/* Barra simples baseada no total */}
                    <div className="h-full bg-blue-500" style={{ width: `${(scorePessoal/META_CERTIFIED)*100}%` }}></div> 
                </div>
            </div>
         </div>

      </div>

      {/* BANNER VERDE: PRÓXIMA PLACA (MANTIDO E PROTEGIDO) */}
      <div className="w-full bg-green-900/10 border border-green-900/30 p-6 rounded-2xl flex items-center justify-between">
         <div>
            <h3 className="text-green-500 font-bold text-lg mb-1">Próxima Placa: CERTIFIED</h3>
            <p className="text-gray-400 text-sm">
                Atingir <span className="text-white font-bold">10.000 PRO</span> para desbloquear este status exclusivo.
            </p>
         </div>
         <div className="h-12 w-12 rounded-full bg-green-900/20 border border-green-500/30 flex items-center justify-center text-green-500">
            <Lock size={20} />
         </div>
      </div>

    </div>
  );
}