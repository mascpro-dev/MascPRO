"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Trophy, Instagram, Phone, Search, Users } from "lucide-react";

export default function ComunidadePage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("pro_balance", { ascending: false })
        .limit(50); 
      
      if (data) setMembers(data);
      setLoading(false);
    }
    getData();
  }, [supabase]);

  const filteredMembers = members.filter(m => 
    m.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const top3 = members.slice(0, 3);

  if (loading) return <div className="p-12 text-slate-500">Carregando ranking...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER COM ÍCONE (NOVO) */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        
        <div className="flex items-center gap-4">
            {/* Ícone Padronizado */}
            <div className="p-4 bg-[#C9A66B]/10 rounded-2xl border border-[#C9A66B]/20">
                <Users size={32} className="text-[#C9A66B]" />
            </div>
            <div>
                <h1 className="text-3xl font-black text-white tracking-tighter">Comunidade</h1>
                <p className="text-slate-400 mt-1">Ranking e conexões entre membros.</p>
            </div>
        </div>
        
        {/* Barra de Busca */}
        <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 text-slate-500" size={18} />
            <input 
                placeholder="Buscar membro..." 
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#C9A66B]"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* --- PODIUM (TOP 3) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((member, index) => (
              <div key={member.id} className={`relative p-1 rounded-2xl ${index === 0 ? 'bg-gradient-to-b from-[#C9A66B] to-black order-first md:order-2 md:-mt-6' : 'bg-white/10 md:order-last'}`}>
                  <div className="bg-[#0A0A0A] h-full p-6 rounded-xl flex flex-col items-center text-center relative overflow-hidden">
                      <div className={`mb-4 w-12 h-12 flex items-center justify-center rounded-full font-black text-lg ${index === 0 ? 'bg-[#C9A66B] text-black' : 'bg-white/10 text-white'}`}>
                          {index + 1}º
                      </div>
                      <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center text-2xl font-bold text-slate-500 mb-3 uppercase">
                          {member.full_name?.substring(0, 2) || "??"}
                      </div>
                      <h3 className="text-white font-bold truncate w-full">{member.full_name}</h3>
                      <p className="text-[#C9A66B] font-black text-xl mt-1">{member.pro_balance || 0} PRO</p>
                      <div className="flex gap-2 mt-4">
                          {member.instagram && (
                             <a href={`https://instagram.com/${member.instagram.replace('@','')}`} target="_blank" className="p-2 bg-white/5 hover:bg-[#C9A66B] hover:text-black rounded-lg transition-colors">
                                <Instagram size={16} />
                             </a>
                          )}
                      </div>
                  </div>
              </div>
          ))}
      </div>

      {/* --- LISTA DE TODOS OS MEMBROS --- */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">Membros da Rede</h2>
          </div>
          
          <div className="divide-y divide-white/5">
              {filteredMembers.map((member, i) => (
                  <div key={member.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-4">
                          <span className="text-slate-500 font-mono text-xs w-6 text-center">{i + 1}º</span>
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
                              {member.full_name?.substring(0, 2)}
                          </div>
                          <div>
                              <p className="text-white font-bold text-sm">{member.full_name}</p>
                              <p className="text-[#C9A66B] text-xs font-bold">{member.pro_balance || 0} PRO</p>
                          </div>
                      </div>

                      <div className="flex items-center gap-2">
                          {member.instagram && (
                              <a href={`https://instagram.com/${member.instagram.replace('@', '')}`} target="_blank" className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-[#C9A66B] hover:border-[#C9A66B] text-xs font-bold transition-all">
                                  <Instagram size={14} />
                                  <span className="hidden md:inline">Insta</span>
                              </a>
                          )}
                          {member.whatsapp && (
                              <a href={`https://wa.me/55${member.whatsapp.replace(/\D/g, '')}`} target="_blank" className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-green-500 hover:border-green-500 text-xs font-bold transition-all">
                                  <Phone size={14} />
                                  <span className="hidden md:inline">Zap</span>
                              </a>
                          )}
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}