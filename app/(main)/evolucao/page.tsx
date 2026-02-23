"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Trophy, PlayCircle, Loader2, Lock } from "lucide-react";

export default function EvolucaoPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [meritCoins, setMeritCoins] = useState(0); 
  const [modules, setModules] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [aulasConcluidas, setAulasConcluidas] = useState<string[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);

      // Busca Saldo
      const { data: profile } = await supabase.from("profiles").select("personal_coins").eq("id", user.id).single();
      if (profile) setMeritCoins(profile.personal_coins || 0);

      // Busca Módulos na Ordem Certa
      const { data: cursos } = await supabase.from("courses").select("*").order("sequence_order", { ascending: true });
      setModules(cursos || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  // --- COLE O FOFOQUEIRO AQUI (DENTRO DA FUNÇÃO, ANTES DO RETURN) ---
  const marcarComoConcluida = async (aulaId: string) => {
    console.log("📢 FOFOQUEIRO: Tentando salvar a aula:", aulaId);
    console.log("👤 FOFOQUEIRO: Usuário que está assistindo:", currentUser?.id);

    if (!currentUser?.id) {
      console.error("❌ ERRO: Não achei o ID do usuário! O sistema não sabe pra quem salvar.");
      return;
    }

    const { data, error } = await supabase
      .from('user_progress')
      .upsert({ 
        user_id: currentUser.id, 
        lesson_id: aulaId, 
        completed: true 
      });

    if (error) {
      console.error("❌ ERRO NO BANCO:", error.message);
    } else {
      console.log("✅ SUCESSO: O banco de dados recebeu a informação!");
      // Aqui o cadeado some na hora:
      setAulasConcluidas(prev => [...prev, aulaId]);
    }
  };
  // -------------------------------------------------------------

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">EVOLUÇÃO <span className="text-[#C9A66B]">PRO</span></h1>
          <p className="text-gray-400 text-sm">Sua trilha de especialização.</p>
        </div>
        <div className="bg-[#111] border border-[#333] px-6 py-3 rounded-xl flex flex-col items-end">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">MÉRITO PESSOAL</span>
            <div className="flex items-center gap-2">
                <Trophy size={20} className="text-[#C9A66B]" />
                <span className="font-bold text-white text-2xl">{meritCoins} PRO</span>
            </div>
        </div>
      </div>

      {/* GRID DE MÓDULOS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.length === 0 && <p className="col-span-full text-gray-500 text-center py-10">Nenhum módulo encontrado.</p>}
          
          {modules.map((mod, index) => {
            // LÓGICA DO CADEADO:
            // const isUnlocked = index <= 1; // (Comentei a regra antiga)
            const isLocked = false; // AGORA TUDO ESTÁ ABERTO PARA TESTE 

            return (
                <Link 
                    key={mod.id} 
                    href={isLocked ? "#" : `/evolucao/${mod.code || mod.slug}`} 
                    className={`block group relative ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    onClick={(e) => {
                        if (isLocked) {
                            e.preventDefault();
                        }
                    }}
                >
                    {/* ASPECT RATIO VERTICAL (POSTER) */}
                    <div className={`aspect-[9/16] bg-[#111] border border-[#222] rounded-xl overflow-hidden transition-all duration-300 relative shadow-lg
                        ${isLocked ? 'grayscale opacity-60 border-transparent' : 'hover:border-[#C9A66B] hover:shadow-[#C9A66B]/20 hover:-translate-y-1'}
                    `}>
                        
                        {/* Imagem */}
                        {mod.image_url ? (
                            <img src={mod.image_url} className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-black"></div>
                        )}
                        
                        {/* Overlay Escuro */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90"></div>

                        {/* Ícone de Cadeado se estiver bloqueado */}
                        {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-20">
                                <div className="bg-black/50 p-4 rounded-full border border-white/10">
                                    <Lock size={24} className="text-gray-400" />
                                </div>
                            </div>
                        )}

                        {/* Conteúdo */}
                        <div className="absolute inset-0 p-4 flex flex-col justify-end z-10">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider w-fit mb-2
                                ${isLocked ? 'bg-gray-700 text-gray-400' : 'bg-[#C9A66B] text-black'}
                            `}>
                                {mod.sequence_order ? `Módulo ${String(mod.sequence_order).padStart(2, '0')}` : 'Extra'}
                            </span>
                            
                            <h3 className={`text-lg font-bold leading-tight mb-1 ${isLocked ? 'text-gray-400' : 'text-white group-hover:text-[#C9A66B]'} transition-colors`}>
                                {mod.title}
                            </h3>
                            
                            {/* Botão / Status */}
                            <div className={`flex items-center gap-2 text-xs font-bold border-t pt-3 mt-1
                                ${isLocked ? 'border-gray-700 text-gray-500' : 'border-white/10 text-white/80'}
                            `}>
                                 {isLocked ? (
                                    <span>Bloqueado</span>
                                 ) : (
                                    <> <PlayCircle size={14} className="text-[#C9A66B]" /> Assistir </>
                                 )}
                            </div>
                        </div>
                    </div>
                </Link>
            );
          })}
      </div>
    </div>
  );
}
