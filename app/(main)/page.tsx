"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Trophy, Users, Copy, Check } from "lucide-react";

export default function VisaoGeralPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 1. Pega dados do perfil
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(data);

        // 2. Gera o Link de Indicação
        if (typeof window !== "undefined") {
            const origin = window.location.origin;
            setInviteLink(`${origin}/cadastro?ref=${session.user.id}`);
        }
      }
      setLoading(false);
    }
    getData();
  }, [supabase]);

  const handleCopy = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8 text-slate-500">Carregando painel...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter">
            Olá, {profile?.full_name?.split(' ')[0] || "Membro"}
          </h1>
          <p className="text-slate-400 mt-1">Seu progresso é recompensado.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CARD 1: SALDO */}
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl relative overflow-hidden">
             <div className="relative z-10">
                 <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-3 py-1 mb-4">
                    <Trophy size={12} className="text-slate-300"/>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Masc Coin</span>
                 </div>
                 <h2 className="text-5xl font-black text-white mb-2 tracking-tighter">
                    {profile?.pro_balance || 0} <span className="text-2xl text-slate-600">PRO</span>
                 </h2>
                 <p className="text-slate-500 text-sm">Seu poder de compra na loja.</p>
             </div>
          </div>

          {/* CARD 2: META */}
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl flex flex-col justify-between">
              <div>
                  <h3 className="text-xl font-bold text-white mb-1">Próxima Placa</h3>
                  <p className="text-slate-500 text-sm">Marco de 10k</p>
              </div>
              
              <div className="mt-8">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">
                      <span>{profile?.pro_balance || 0} PRO</span>
                      <span>10.000 PRO</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#C9A66B]" 
                        style={{ width: `${Math.min(((profile?.pro_balance || 0) / 10000) * 100, 100)}%` }} 
                      /> 
                  </div>
              </div>

              <button className="mt-6 w-full border border-white/10 text-white font-bold py-3 rounded-lg hover:bg-white/5 transition-colors uppercase text-xs tracking-widest">
                  Ver Placas
              </button>
          </div>
      </div>

      {/* --- CARD 3: CONVITE (COM O BOTÃO FUNCIONANDO) --- */}
      <div className="border border-white/10 rounded-2xl p-1 bg-black">
        <div className="bg-[#0A0A0A] rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
                <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                    <Users size={18} className="text-[#C9A66B]"/>
                    Convite Exclusivo
                </h3>
                <p className="text-slate-500 text-sm max-w-sm">
                    Ganhe PROs convidando novos membros.
                </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                {/* CAMPO DO LINK */}
                <div className="bg-black border border-white/10 px-4 py-3 rounded-xl text-slate-400 font-mono text-xs w-full md:w-64 truncate">
                    {inviteLink || "Carregando..."}
                </div>
                
                {/* BOTÃO OUTLINE (BORDA) */}
                <button 
                    onClick={handleCopy}
                    className="bg-transparent border border-[#C9A66B] text-[#C9A66B] hover:bg-[#C9A66B] hover:text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap text-sm"
                >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? "Copiado" : "Copiar"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}