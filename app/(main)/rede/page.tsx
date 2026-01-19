"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Users, Share2, Copy, CheckCircle, Search, TrendingUp, UserPlus, Briefcase, Scissors } from "lucide-react";

export default function RedePage() {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUserId(session.user.id);

        // Busca quem foi convidado por MIM (invited_by = meu id)
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("invited_by", session.user.id)
          .order("created_at", { ascending: false });
        
        if (data) setAffiliates(data);
      }
      setLoading(false);
    }
    getData();
  }, [supabase]);

  // Função para copiar Link
  const handleCopyLink = () => {
    // Pega a URL base do site (funciona local e produção)
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/cadastro?ref=${userId}`;
    
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtragem
  const filteredList = affiliates.filter(m => 
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalIndicados = affiliates.length;
  // Por enquanto "ativos" são todos, depois podemos criar regra de quem comprou algo
  const totalAtivos = affiliates.length; 
  // Simulação de ganho (ex: 10% de bonus fictício por pessoa)
  const estimativaGanhos = totalAtivos * 50; 

  if (loading) return <div className="p-12 text-slate-500">Carregando rede...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER E AÇÃO PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic">MINHA <span className="text-[#C9A66B]">REDE</span></h1>
            <p className="text-slate-400 mt-1">Gerencie sua equipe e amplie seus ganhos.</p>
        </div>

        {/* CARD DE CONVITE */}
        <div className="w-full md:w-auto bg-[#C9A66B] rounded-xl p-1 pr-2 flex items-center gap-2 shadow-[0_0_20px_rgba(201,166,107,0.3)]">
            <div className="bg-black/20 p-2 rounded-lg text-black">
                <Share2 size={20} />
            </div>
            <div className="flex-1 px-2">
                <p className="text-[10px] font-bold text-black uppercase tracking-widest">Seu Link de Convite</p>
                <p className="text-xs font-mono text-black truncate max-w-[150px]">mascpro.com/?ref=...</p>
            </div>
            <button 
                onClick={handleCopyLink}
                className="bg-black text-[#C9A66B] px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-2"
            >
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? "Copiado!" : "Copiar"}
            </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 rounded-xl text-blue-500">
                  <UserPlus size={24} />
              </div>
              <div>
                  <p className="text-slate-500 text-xs font-bold uppercase">Total Indicados</p>
                  <h3 className="text-2xl font-black text-white">{totalIndicados}</h3>
              </div>
          </div>

          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl flex items-center gap-4">
              <div className="p-4 bg-green-500/10 rounded-xl text-green-500">
                  <CheckCircle size={24} />
              </div>
              <div>
                  <p className="text-slate-500 text-xs font-bold uppercase">Membros Ativos</p>
                  <h3 className="text-2xl font-black text-white">{totalAtivos}</h3>
              </div>
          </div>

          <div className="bg-[#0A0A0A] border border-white/10 p-6 rounded-2xl flex items-center gap-4 relative overflow-hidden">
              <div className="absolute right-0 top-0 p-16 bg-[#C9A66B]/10 blur-2xl rounded-full"></div>
              <div className="p-4 bg-[#C9A66B]/10 rounded-xl text-[#C9A66B] relative z-10">
                  <TrendingUp size={24} />
              </div>
              <div className="relative z-10">
                  <p className="text-slate-500 text-xs font-bold uppercase">Comissão Estimada</p>
                  <h3 className="text-2xl font-black text-white">R$ {estimativaGanhos},00</h3>
              </div>
          </div>
      </div>

      {/* LISTA DE MEMBROS */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden min-h-[400px]">
          <div className="p-6 border-b border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users size={20} className="text-[#C9A66B]" /> Membros da Equipe
              </h2>
              
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                <input 
                    placeholder="Buscar indicado..."
                    className="w-full bg-black border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#C9A66B]"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
          </div>
          
          <div className="divide-y divide-white/5">
              {filteredList.length > 0 ? (
                  filteredList.map((member) => (
                      <div key={member.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                          <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-slate-300 uppercase relative">
                                  {member.full_name?.substring(0, 2)}
                                  <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 border border-white/10">
                                      {member.role === 'distribuidor' ? <Briefcase size={10} className="text-[#C9A66B]" /> : <Scissors size={10} className="text-slate-400" />}
                                  </div>
                              </div>
                              <div>
                                  <p className="text-white font-bold text-sm">{member.full_name}</p>
                                  <p className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-1">
                                      {member.role === 'distribuidor' ? 'Distribuidor' : 'Cabeleireiro'}
                                      <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                      {new Date(member.created_at).toLocaleDateString('pt-BR')}
                                  </p>
                              </div>
                          </div>

                          <div className="text-right">
                              <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[10px] font-bold uppercase">
                                  Ativo
                              </span>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="font-medium">Você ainda não tem indicados.</p>
                      <p className="text-sm mt-1">Use seu link acima para começar sua rede.</p>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
}