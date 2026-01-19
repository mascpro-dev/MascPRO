"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Users, Copy, CheckCircle, Clock, Search, Shield } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  avatar_url?: string;
}

export default function RedePage() {
  const [indicados, setIndicados] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserId(session.user.id);
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .or(`invited_by.eq.${session.user.id},id.eq.${session.user.id}`)
          .order('created_at', { ascending: false });

        if (data) setIndicados(data);
      }
      setLoading(false);
    }
    getData();
  }, [supabase]);

  const inviteLink = typeof window !== 'undefined' && userId 
    ? `${window.location.origin}/login?ref=${userId}`
    : "Carregando link...";

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const myNetwork = indicados.filter(p => p.id !== userId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">
                MINHA <span className="text-[#C9A66B]">REDE</span>
            </h1>
            <p className="text-slate-400 mt-1">
                Expanda sua influência e acompanhe seus indicados.
            </p>
        </div>

        <div className="flex items-center gap-4 bg-[#111] border border-white/10 px-5 py-3 rounded-xl">
            <div className="bg-[#C9A66B]/10 p-2 rounded-lg text-[#C9A66B]">
                <Users size={20} />
            </div>
            <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total na Rede</p>
                <p className="text-xl font-black text-white">{myNetwork.length} <span className="text-xs font-normal text-slate-500">Membros</span></p>
            </div>
        </div>
      </div>

      {/* CARD DE CONVITE (Visual Premium Restaurado) */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0A0A0A] to-[#111] p-8 group">
          
          {/* Efeito de brilho sutil no fundo */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#C9A66B]/5 blur-3xl rounded-full group-hover:bg-[#C9A66B]/10 transition-all duration-700"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-xl font-bold text-white">Convite Exclusivo</h2>
                      <span className="text-[10px] bg-[#C9A66B] text-black font-bold px-2 py-0.5 rounded uppercase">Embaixador</span>
                  </div>
                  
                  {/* TEXTO AJUSTADO: PROs */}
                  <p className="text-slate-400 leading-relaxed max-w-xl">
                      Envie seu link exclusivo para outros profissionais. 
                      Você ganha <span className="text-[#C9A66B] font-bold">PROs</span> a cada cadastro aprovado e qualificado na plataforma.
                  </p>
              </div>

              <div className="flex w-full md:w-auto gap-2">
                  <div className="flex-1 md:w-80 bg-black border border-white/10 rounded-xl px-4 py-4 text-slate-400 font-mono text-xs md:text-sm truncate flex items-center select-all shadow-inner">
                      {inviteLink}
                  </div>
                  <button
                      onClick={handleCopy}
                      className="bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 min-w-[120px] justify-center shadow-[0_0_20px_rgba(201,166,107,0.2)] hover:shadow-[0_0_30px_rgba(201,166,107,0.4)]"
                  >
                      {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                      {copied ? "Copiado" : "Copiar"}
                  </button>
              </div>