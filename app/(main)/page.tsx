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

  // --- LÓGICA DO LINK CHARMOSO ---
  const formatRefCode = (userProfile: any, userId: string) => {
    // 1. Tenta usar o username
    if (userProfile?.username) return userProfile.username;
    
    // 2. Tenta usar o Nome Completo (formatado: joao-silva)
    if (userProfile?.full_name) {
      return userProfile.full_name
        .toLowerCase()
        .normalize("NFD")             // Separa os acentos
        .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
        .replace(/\s+/g, '-');        // Troca espaço por traço
    }
    
    // 3. Último caso: usa o ID
    return userId;
  };

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

          // Gera o link assim que tiver os dados
          if (typeof window !== "undefined") {
              const code = formatRefCode(data, session.user.id);
              const origin = window.location.origin;
              setInviteLink(`${origin}/cadastro?ref=${code}`);
          }
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [supabase]);

  // --- LÓGICA DE COPIAR (FUNCIONA EM CELULAR) ---
  const handleCopy = async () => {
    if (!inviteLink) return;
    
    try {
        // Tenta o jeito moderno
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
    } catch (err) {
        // Se falhar (comum em alguns Androids), tenta o jeito antigo "na força bruta"
        const textArea = document.createElement("textarea");
        textArea.value = inviteLink;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
        } catch (e) {
            console.error('Falha ao copiar', e);
        }
        document.body.removeChild(textArea);
    }
    
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="p-12 text-slate-500">Carregando painel...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tighter">
          Olá, {profile?.full_name?.split(' ')[0] || "Membro"}
        </h1>
        <p className="text-slate-400 mt-1">Seu progresso é recompensado.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CARD SALDO */}
          <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 p-20 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
             <div className="relative z-10">
                 <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 rounded-full px-3 py-1 mb-4">
                    <Trophy size={12} className="text-slate-300"/>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Masc Coin</span>
                 </div>
                 <h2 className="text-5xl font-black text-white mb-2 tracking-tighter">
                    {profile?.pro_balance || 0} <span className="text-2xl text-slate-600">PRO</span>
                 </h2>
                 <p className="text-slate-500 text-sm font-medium">Seu poder de compra na loja.</p>
             </div>
          </div>

          {/* CARD META */}
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

      {/* CARD CONVITE */}
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
                <div className="bg-black border border-white/10 px-4 py-3 rounded-lg text-slate-400 font-mono text-xs w-full md:w-64 truncate">
                    {inviteLink || "Carregando..."}
                </div>
                
                <button 
                    onClick={handleCopy}
                    className="bg-transparent border border-[#C9A66B] text-[#C9A66B] hover:bg-[#C9A66B] hover:text-black font-bold px-6 py-3 rounded-lg flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap text-sm cursor-pointer"
                >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copiado" : "Copiar"}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}