export const dynamic = "force-dynamic";

import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { Play, Lock, Zap, Trophy } from "lucide-react";

// Funçãozinha para pegar o ID do YouTube e montar a URL da capa
function getYoutubeThumbnail(url: string | null) {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://img.youtube.com/vi/${match[2]}/mqdefault.jpg`;
  }
  return null;
}

export default async function EvolucaoPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  // Busca saldo
  const { data: profile } = await supabase
    .from("profiles")
    .select("pro_balance")
    .eq("id", session?.user?.id)
    .single();

  const balance = profile?.pro_balance ?? 0;

  // Busca módulos
  const { data: modules } = await supabase
    .from("Module")
    .select("*")
    .order("id", { ascending: true });

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter">
            EVOLUÇÃO <span className="text-[#C9A66B]">PRO</span>
          </h1>
          <p className="text-slate-400 mt-2">Invista seus PROs para desbloquear conhecimento.</p>
        </div>

        {/* SALDO */}
        <div className="bg-transparent border border-[#C9A66B] px-6 py-3 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(201,166,107,0.1)]">
            <Trophy size={20} className="text-[#C9A66B]" />
            <div>
                <p className="text-[10px] text-[#C9A66B] font-bold uppercase tracking-widest leading-none">Seu Saldo</p>
                <p className="text-2xl font-black text-white leading-none mt-1">{balance} PRO</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {modules?.map((lesson) => {
          // Calcula a capa aqui
          const thumbnailUrl = getYoutubeThumbnail(lesson.video_url);

          return (
            <Link 
              key={lesson.id} 
              href={`/aula/${lesson.id}`}
              className="group relative bg-slate-900 border border-white/10 hover:border-[#C9A66B] rounded-2xl overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(201,166,107,0.15)] flex flex-col"
            >
              {/* Capa do Card (Agora Dinâmica) */}
              <div className="aspect-video relative bg-black group-hover:opacity-80 transition-opacity">
                  
                  {/* FOTO DE FUNDO (Se tiver link, mostra a foto. Se não, mostra fundo preto) */}
                  {thumbnailUrl ? (
                     <div 
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url(${thumbnailUrl})` }}
                     />
                  ) : (
                     <div className="absolute inset-0 bg-slate-800" />
                  )}

                  {/* Gradiente para o texto aparecer bem */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90 z-10" />
                  
                  {/* Ícone Play Outline */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 opacity-50 group-hover:opacity-100 transition-opacity">
                       <div className="w-14 h-14 rounded-full border-2 border-white flex items-center justify-center group-hover:border-[#C9A66B] group-hover:scale-110 transition-all backdrop-blur-sm">
                          <Play size={24} className="text-white ml-1 group-hover:text-[#C9A66B]" fill="currentColor" />
                       </div>
                  </div>
                  
                  {/* TAG DO MÓDULO */}
                  <div className="absolute top-4 left-4 z-20 border border-[#C9A66B] text-[#C9A66B] text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md bg-black/30">
                      MÓDULO {String(lesson.id).padStart(2, '0')}
                  </div>
              </div>

              <div className="relative z-20 p-6 flex flex-col flex-1 bg-slate-900">
                  <h3 className="text-lg font-bold text-white group-hover:text-[#C9A66B] transition-colors line-clamp-2 leading-tight mb-2">
                      {lesson.title}
                  </h3>
                  
                  <div className="mt-auto pt-4 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <Zap size={14} className="text-[#C9A66B]" />
                          <span className="text-xs text-white font-bold">Ganhe 50 PRO</span>
                      </div>
                  </div>
              </div>
            </Link>
          );
        })}

        {/* Card Bloqueado (Exemplo Visual) */}
        <div className="relative bg-slate-950 border border-white/5 rounded-2xl overflow-hidden opacity-40 cursor-not-allowed aspect-video md:aspect-auto flex flex-col grayscale">
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                <Lock size={24} className="text-slate-500" />
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Em Breve</p>
            </div>
        </div>

      </div>
    </div>
  );
}