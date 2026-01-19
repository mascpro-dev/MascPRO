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

        // Busca quem indicou (invited_by = MEU_ID) OU o próprio perfil
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

  // Link de convite
  const inviteLink = typeof window !== 'undefined' && userId 
    ? `${window.location.origin}/login?ref=${userId}`
    : "Carregando link...";

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtrar para não mostrar eu mesmo na lista de "indicados" visualmente, se quiser
  const myNetwork = indicados.filter(p => p.id !== userId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* --- CABEÇALHO --- */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">
                MINHA <span className="text-[#C9A66B]">REDE</span>
            </h1>
            <p className="text-slate-400 mt-1">Gerencie seu time e acompanhe o crescimento.</p>
        </div>

        <div className="flex gap-4">
            <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase">Total na Rede</p>
                <p className="text-2xl font-black text-white">{myNetwork.length}</p>
            </div>
        </div>
      </div>

      {/* --- CARD DE CONVITE (NOVO DESIGN "SÓ A BORDA") --- */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-lg shadow-black/50">
          <div>
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Users size={20} className="text-[#C9A66B]" /> 
                  Link de Indicação
              </h2>
              {/* TEXTO AJUSTADO: Apenas PRO */}
              <p className="text-slate-400 max-w-lg text-sm leading-relaxed">
                  Envie este link para outros profissionais. Você ganha <span className="text-[#C9A66B] font-bold">PROs</span> a cada cadastro aprovado e qualificado na plataforma.
              </p>
          </div>

          <div className="flex w-full md:w-auto gap-2">
              <div className="flex-1 md:w-96 bg-black border border-white/10 rounded-xl px-4 py-3 text-slate-500 font-mono text-xs md:text-sm truncate flex items-center select-all">
                  {inviteLink}
              </div>
              <button
                  onClick={handleCopy}
                  className="bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 min-w-[110px] justify-center"
              >
                  {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                  {copied ? "Copiado" : "Copiar"}
              </button>
          </div>
      </div>

      {/* --- LISTA DA REDE --- */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-bold text-white">Membros da Equipe</h3>
              <div className="flex items-center gap-2 bg-black border border-white/10 px-3 py-1.5 rounded-lg">
                  <Search size={14} className="text-slate-500" />
                  <input type="text" placeholder="Buscar..." className="bg-transparent border-none outline-none text-xs text-white w-24 md:w-auto" />
              </div>
          </div>

          {loading ? (
              <div className="p-12 text-center text-slate-500">Carregando rede...</div>
          ) : myNetwork.length === 0 ? (
              <div className="p-12 text-center">
                  <Users size={40} className="text-slate-600 mx-auto mb-4 opacity-50" />
                  <p className="text-slate-400 font-medium">Você ainda não tem indicados.</p>
                  <p className="text-slate-600 text-sm mt-1">Use o link acima para começar.</p>
              </div>
          ) : (
              <div className="divide-y divide-white/5">
                  {myNetwork.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-[#111] border border-white/10 flex items-center justify-center font-bold text-[#C9A66B]">
                                  {user.full_name?.charAt(0) || user.email?.charAt(0)}
                              </div>
                              <div>
                                  <p className="font-bold text-white text-sm">{user.full_name || "Sem nome"}</p>
                                  <p className="text-xs text-slate-500">{user.email}</p>
                              </div>
                          </div>

                          <div className="flex items-center gap-6">
                              <div className="hidden md:block text-right">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Status</p>
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                                      <CheckCircle size={10} /> Ativo
                                  </div>
                              </div>
                              <div className="hidden md:block text-right">
                                  <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Entrou em</p>
                                  <div className="flex items-center gap-1 text-xs text-slate-400">
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