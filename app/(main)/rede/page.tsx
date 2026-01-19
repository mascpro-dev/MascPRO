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

      {/* CARD DE CONVITE (Visual Premium + Texto Ajustado "PROs") */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-[#0A0A0A] to-[#111] p-8 group">
          
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-[#C9A66B]/5 blur-3xl rounded-full group-hover:bg-[#C9A66B]/10 transition-all duration-700"></div>

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-xl font-bold text-white">Convite Exclusivo</h2>
                      <span className="text-[10px] bg-[#C9A66B] text-black font-bold px-2 py-0.5 rounded uppercase">Embaixador</span>
                  </div>
                  
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
          </div>
      </div>

      {/* LISTA DA REDE */}
      <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Shield size={18} className="text-[#C9A66B]" />
                  Membros da Equipe
              </h3>
              
              <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Buscar membro..." 
                    className="bg-[#111] border border-white/10 rounded-full py-2 pl-9 pr-4 text-xs text-white focus:border-[#C9A66B] outline-none w-40 md:w-64 transition-all" 
                  />
              </div>
          </div>

          {loading ? (
              <div className="p-12 text-center text-slate-500 animate-pulse">Carregando sua rede...</div>
          ) : myNetwork.length === 0 ? (
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-12 text-center">
                  <Users size={40} className="text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">Sua rede está vazia.</p>
                  <p className="text-slate-600 text-sm mt-1">Comece convidando profissionais talentosos.</p>
              </div>
          ) : (
              <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                  {myNetwork.map((user) => (
                      <div key={user.id} className="p-5 hover:bg-white/5 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 group">
                          
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#111] to-black border border-white/10 flex items-center justify-center font-bold text-[#C9A66B] text-lg shadow-lg group-hover:border-[#C9A66B]/50 transition-colors">
                                  {user.full_name?.charAt(0) || user.email?.charAt(0)}
                              </div>
                              <div>
                                  <p className="font-bold text-white text-base">{user.full_name || "Membro MASC"}</p>
                                  <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                              </div>
                          </div>

                          <div className="flex items-center gap-8 pl-16 md:pl-0">
                              <div className="text-left md:text-right">
                                  <p className="text-[10px] text-slate-600 uppercase font-bold mb-1">Status</p>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/5 px-2 py-1 rounded border border-green-400/10">
                                      <CheckCircle size={10} /> Ativo
                                  </div>
                              </div>
                              <div className="text-left md:text-right">
                                  <p className="text-[10px] text-slate-600 uppercase font-bold mb-1">Entrou em</p>
                                  <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2 py-1 rounded border border-white/5">
                                      <Clock size={10} /> 
                                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
}