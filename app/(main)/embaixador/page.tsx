"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Share2, Copy, Check, Users, Trophy } from "lucide-react";

export default function EmbaixadorPage() {
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, earnings: 0 });
  const supabase = createClientComponentClient();

  // --- LÓGICA DO LINK CHARMOSO ---
  const formatRefCode = (userProfile: any, userId: string) => {
    if (userProfile?.username) return userProfile.username;
    if (userProfile?.full_name) {
      return userProfile.full_name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '-');
    }
    return userId;
  };

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        
        // Pega o perfil para formatar o nome
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, username")
            .eq("id", session.user.id)
            .single();

        // Gera o link
        if (typeof window !== "undefined") {
            const code = formatRefCode(profile, session.user.id);
            setInviteLink(`${window.location.origin}/cadastro?ref=${code}`);
        }
        
        setStats({ total: 12, active: 8, earnings: 450 }); // Dados fictícios
      }
    }
    getData();
  }, [supabase]);

  // --- LÓGICA DE COPIAR BLINDADA ---
  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
        await navigator.clipboard.writeText(inviteLink);
        setCopied(true);
    } catch (err) {
        const textArea = document.createElement("textarea");
        textArea.value = inviteLink;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            setCopied(true);
        } catch (e) {
            console.error('Erro ao copiar', e);
        }
        document.body.removeChild(textArea);
    }

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-[#C9A66B]/10 rounded-2xl border border-[#C9A66B]/20">
            <Share2 size={32} className="text-[#C9A66B]" />
        </div>
        <div>
            <h1 className="text-3xl font-black text-white tracking-tighter">Área de Rede</h1>
            <p className="text-slate-400">Gerencie suas indicações e ganhos.</p>
        </div>
      </div>

      {/* ÁREA DE COPIAR LINK */}
      <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-2xl">
          <h2 className="text-xl font-bold text-white mb-4">Seu Link de Indicação</h2>
          <div className="flex flex-col md:flex-row gap-4">
              <input 
                readOnly 
                value={inviteLink}
                className="flex-1 bg-black border border-white/10 rounded-xl px-6 py-4 text-slate-300 font-mono text-sm focus:outline-none focus:border-[#C9A66B]"
              />
              
              {/* BOTÃO ESTILO OUTLINE (BORDA) */}
              <button 
                onClick={handleCopy}
                className="bg-transparent border border-[#C9A66B] text-[#C9A66B] hover:bg-[#C9A66B] hover:text-black font-bold px-8 py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
                {copied ? "Link Copiado" : "Copiar Link"}
              </button>
          </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                  <Users size={18} className="text-slate-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Indicados</span>
              </div>
              <p className="text-3xl font-black text-white">{stats.total}</p>
          </div>

          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                  <Check size={18} className="text-green-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Ativos</span>
              </div>
              <p className="text-3xl font-black text-white">{stats.active}</p>
          </div>

          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                  <Trophy size={18} className="text-[#C9A66B]" />
                  <span className="text-xs font-bold text-slate-500 uppercase">Ganhos (PRO)</span>
              </div>
              <p className="text-3xl font-black text-[#C9A66B]">{stats.earnings}</p>
          </div>
      </div>

    </div>
  );
}