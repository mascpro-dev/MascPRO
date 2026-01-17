"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Trophy, Users, Copy, Check, ExternalLink } from "lucide-react";

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
        // Busca Perfil
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(data);

        // Gera Link
        if (typeof window !== "undefined") {
            setInviteLink(`${window.location.origin}/cadastro?ref=${session.user.id}`);
        }
      }
      setLoading(false);
    }
    getData();
  }, [supabase]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-8 text-white">Carregando painel...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
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
          
          {/* CARD DE SALDO */}
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl flex flex-col justify-center relative overflow-hidden">
             <div className="absolute top-0 right-0 p-16 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
             <div className="relative z-10">
                 <div className="inline-flex items-center gap-2 border border-white/20 rounded-full px-3 py-1 mb-4">
                    <Trophy size={14} className="text-slate-300"/>
                    <span className="text-xs font-bold text-slate-300 uppercase">Masc Coin</span>
                 </div>
                 <h2 className="text-5xl font-black text-white mb-2">
                    {profile?.pro_balance || 0} <span className="text-xl text-slate-500">PRO</span>
                 </h2>
                 <p className="text-slate-500 text-sm">Seu poder de compra na loja.</p>
             </div>
             <Trophy className="absolute right-8 bottom-8 text-slate-800 opacity-50" size={120} />
          </div>

          {/* CARD PRÓXIMA PLACA */}
          <div className="bg-slate-900 border border-white/10 p-8 rounded-2xl flex flex-col justify-between">
              <div>
                  <h3 className="text-xl font-bold text-white mb-1">Próxima Placa</h3>
                  <p className="text-slate-400 text-sm">Marco de 10k</p>
              </div>
              
              <div className="mt-8">
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                      <span>{profile?.pro_balance || 0} PRO</span>
                      <span>10.000 PRO</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-[#C9A66B]" style={{ width: `${Math.min(((profile?.pro_balance || 0) / 10000) * 100, 100)}%` }} /> 
                  </div>
              </div>

              <button className="mt-6 w-full border border-white/10 text-white font-bold py-3 rounded-lg hover:bg-white/5 transition-colors uppercase text-sm tracking-widest">
                  Ver Placas
              </button>
          </div>
      </div>

      {/* --- CARD CONVITE --- */}
      <div className="border border-white/10 rounded-2xl p-6 bg-black flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
              <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                  <Users size={18} className="text-[#C9A66B]"/>
                  Convite Exclusivo
              </h3>
              <p className="text-slate-500 text-sm max-w-sm">
                  Ganhe <span className="text-white font-bold">10% das moedas PRO</span> geradas pelos seus indicados.
              </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-slate-900 border border-white/10 px-4 py-3 rounded-xl text-slate-400 font-mono text-xs w-full md:w-64 truncate">
                  {inviteLink || "Carregando..."}
              </div>
              
              {/* BOTÃO ESTILO OUTLINE (Borda Dourada, Fundo Transparente) */}
              <button 
                  onClick={handleCopy}
                  className="bg-transparent border border-[#C9A66B] text-[#C9A66B] hover:bg-[#C9A66B] hover:text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
              >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? "Copiado" : "Copiar"}
              </button>

              {/* Botão Testar (Abre Nova Aba) */}
              {inviteLink && (
                  <a 
                      href={inviteLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-slate-900 hover:bg-slate-800 text-white p-3 rounded-xl transition-colors border border-white/10"
                  >
                      <ExternalLink size={20} />
                  </a>
              )}
          </div>
      </div>
    </div>
  );
}