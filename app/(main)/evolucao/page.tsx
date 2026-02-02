"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Trophy, PlayCircle, Loader2 } from "lucide-react";

export default function EvolucaoPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [meritCoins, setMeritCoins] = useState(0); 
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles").select("personal_coins").eq("id", user.id).single();
      if (profile) setMeritCoins(profile.personal_coins || 0);

      const { data: cursos } = await supabase.from("courses").select("*").order("sequence_order", { ascending: true });
      setModules(cursos || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">EVOLUÇÃO <span className="text-[#C9A66B]">PRO</span></h1>
          <p className="text-gray-400 text-sm">Trilhas de especialização técnica.</p>
        </div>
        <div className="bg-[#111] border border-[#333] px-6 py-3 rounded-xl flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">MÉRITO PESSOAL</span>
            <div className="flex items-center gap-2">
                <Trophy size={20} className="text-[#C9A66B]" />
                <span className="font-bold text-white text-2xl">{meritCoins} PRO</span>
            </div>
        </div>
      </div>

      {/* GRID NETFLIX (VERTICAL / POSTER) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.length === 0 && <p className="col-span-full text-gray-500 text-center py-10">Nenhum módulo encontrado.</p>}
          
          {modules.map((mod) => (
            <Link key={mod.id} href={`/evolucao/${mod.code || mod.slug}`} className="block group">
                {/* ASPECT RATIO VERTICAL (POSTER) */}
                <div className="aspect-[9/16] bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#C9A66B] transition-all relative shadow-lg group-hover:shadow-[#C9A66B]/20 group-hover:-translate-y-1 duration-300">
                    
                    {/* Imagem de Fundo Full */}
                    {mod.image_url ? (
                        <img src={mod.image_url} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black opacity-50"></div>
                    )}
                    
                    {/* Gradiente para Texto (Vignette) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90"></div>

                    {/* Conteúdo */}
                    <div className="absolute inset-0 p-4 flex flex-col justify-end z-10">
                        <span className="bg-[#C9A66B] text-black px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider w-fit mb-2">
                            {mod.sequence_order ? `Módulo 0${mod.sequence_order}` : 'Extra'}
                        </span>
                        
                        <h3 className="text-lg font-bold text-white leading-tight mb-1 group-hover:text-[#C9A66B] transition-colors">{mod.title}</h3>
                        <p className="text-gray-400 text-[10px] line-clamp-2 mb-3">{mod.description}</p>
                        
                        <div className="flex items-center gap-2 text-xs font-bold text-white/80 border-t border-white/10 pt-3 mt-1">
                             <PlayCircle size={14} className="text-[#C9A66B]" /> Assistir Agora
                        </div>
                    </div>
                </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
