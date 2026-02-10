"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Copy, UserPlus, CheckCircle, TrendingUp, Search, Filter, Instagram, MessageCircle } from "lucide-react";

export default function RedePage() {
  const [indicados, setIndicados] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState<any>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        
        // Buscar perfil do usuário logado (para saldo residual)
        const { data: profile } = await supabase
          .from("profiles")
          .select("residual_rede_total, network_coins, passive_pro")
          .eq("id", session.user.id)
          .single();
        if (profile) setUser(profile);
        
        // Buscar indicados
        const { data } = await supabase
          .from("profiles")
          .select("full_name, created_at, city_state, specialty, instagram, phone")
          .eq('invited_by', session.user.id)
          .order('created_at', { ascending: false });
        if (data) setIndicados(data);
      }
    }
    getData();
  }, [supabase]);

  // Monta o link de convite dinamicamente
  useEffect(() => {
    if (userId && typeof window !== "undefined") {
      const link = `${window.location.origin}/cadastro?ref=${userId}`;
      setInviteLink(link);
    }
  }, [userId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Função para formatar profissão
  const formatSpecialty = (specialty: string | null) => {
    if (!specialty) return "";
    const specialties: { [key: string]: string } = {
      cabeleireiro: "CABELEIREIRO",
      barbeiro: "BARBEIRO",
      esteticista: "ESTETICISTA",
      manicure: "MANICURE",
      outro: "OUTRO"
    };
    return specialties[specialty] || specialty.toUpperCase();
  };

  // Função para obter inicial do nome
  const getInitial = (name: string | null) => {
    if (!name) return "?";
    return name.charAt(0).toUpperCase();
  };

  // Função para formatar data
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Filtrar indicados pela busca
  const filteredIndicados = indicados.filter(indicado => 
    indicado.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Função para formatar link do Instagram
  const getInstagramLink = (instagram: string | null) => {
    if (!instagram) return null;
    const handle = instagram.replace(/^@/, ""); // Remove @ se existir
    return `https://instagram.com/${handle}`;
  };

  // Função para formatar link do WhatsApp
  const getWhatsAppLink = (phone: string | null) => {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\s|\(|\)|-/g, ""); // Remove espaços, parênteses e traços
    return `https://wa.me/55${cleanPhone}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
            MINHA <span className="text-[#C9A66B]">REDE</span>
          </h1>
          <p className="text-slate-400 text-sm">Gerencie sua equipe e amplie seus ganhos.</p>
        </div>
        
        {/* Card do Link de Convite */}
        <div className="bg-[#111] border border-white/10 rounded-2xl p-5 w-full lg:w-auto">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
            SEU LINK DE CONVITE
          </p>
          <div className="flex items-center gap-3">
            <p className="text-sm text-white font-mono flex-1 truncate min-w-0" title={inviteLink}>
              {inviteLink || "Carregando..."}
            </p>
            <button 
              onClick={handleCopy} 
              disabled={!inviteLink}
              className="bg-[#C9A66B] text-black px-6 py-2 rounded-lg font-black text-xs uppercase hover:opacity-90 transition-opacity whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <UserPlus size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TOTAL INDICADOS</p>
              <p className="text-3xl font-black text-white">{indicados.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#111] border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">MEMBROS ATIVOS</p>
              <p className="text-3xl font-black text-white">{indicados.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-[#111] border border-white/5 p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C9A66B]/10 flex items-center justify-center text-[#C9A66B]">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PROS GERADOS</p>
              <p className="text-3xl font-black text-white">{indicados.length * 50} PRO</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card de Saldo Residual */}
      <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">
          Saldo Residual (Rede)
        </p>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-black text-green-500">
            {Number(user?.residual_rede_total || (user?.network_coins || 0) + (user?.passive_pro || 0)).toLocaleString('pt-BR')}
          </span>
          <span className="text-xs font-bold text-green-700 mb-1 tracking-tighter">PRO</span>
        </div>
        <p className="text-[9px] text-zinc-600 mt-2 italic">
          *Este valor é a soma de network_coins e passive_pro.
        </p>
      </div>

      {/* Seção de Membros da Equipe */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
            Membros da <span className="text-[#C9A66B]">Equipe</span>
          </h2>
          
          {/* Barra de Busca */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Buscar indicado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#C9A66B] transition-colors text-sm"
              />
            </div>
            <button className="bg-[#111] border border-white/10 rounded-xl p-2.5 hover:border-[#C9A66B] transition-colors">
              <Filter size={18} className="text-slate-500" />
            </button>
          </div>
        </div>

        {/* Lista de Membros */}
        {filteredIndicados.length > 0 ? (
          <div className="space-y-3">
            {filteredIndicados.map((indicado, index) => (
              <div
                key={index}
                className="bg-[#111] border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-colors"
              >
                {/* Avatar com Inicial */}
                <div className="w-12 h-12 rounded-xl bg-[#C9A66B]/20 flex items-center justify-center text-[#C9A66B] font-black text-lg flex-shrink-0">
                  {getInitial(indicado.full_name)}
                </div>
                
                {/* Informações do Membro */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-white truncate">
                    {indicado.full_name || "Usuário sem nome"}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mt-1">
                    {indicado.specialty && (
                      <>
                        <span className="font-semibold">{formatSpecialty(indicado.specialty)}</span>
                        <span>•</span>
                      </>
                    )}
                    <span>{formatDate(indicado.created_at)}</span>
                  </div>
                </div>
                
                {/* Botões de Ação Social e Badge ATIVO */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Botão Instagram */}
                  {indicado.instagram && (
                    <a
                      href={getInstagramLink(indicado.instagram) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-pink-500 transition-colors rounded-lg hover:bg-pink-500/10"
                      title={`Instagram: @${indicado.instagram.replace(/^@/, "")}`}
                    >
                      <Instagram size={18} />
                    </a>
                  )}
                  
                  {/* Botão WhatsApp */}
                  {indicado.phone && (
                    <a
                      href={getWhatsAppLink(indicado.phone) || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-emerald-500 transition-colors rounded-lg hover:bg-emerald-500/10"
                      title={`WhatsApp: ${indicado.phone}`}
                    >
                      <MessageCircle size={18} />
                    </a>
                  )}
                  
                  {/* Badge ATIVO */}
                  <span className="bg-green-500/20 text-green-400 px-4 py-1.5 rounded-lg text-xs font-bold uppercase">
                    ATIVO
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#111] border border-white/5 rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-lg">
              {searchTerm ? "Nenhum indicado encontrado." : "Você ainda não indicou ninguém."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
