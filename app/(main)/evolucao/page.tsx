"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Trophy, PlayCircle, Lock, Loader2, CheckCircle } from "lucide-react";

export default function EvolucaoPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  
  // ESTE É O VALOR QUE VAI APARECER NA TELA
  const [personalCoins, setPersonalCoins] = useState(0); 
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. BUSCA ESPECÍFICA DO SALDO PESSOAL (PERSONAL_COINS)
      // Não busca 'coins' (total), busca apenas o mérito.
      const { data: profile } = await supabase
          .from("profiles")
          .select("personal_coins")
          .eq("id", user.id)
          .single();

      if (profile) {
          console.log("💰 Saldo Pessoal Carregado:", profile.personal_coins);
          setPersonalCoins(profile.personal_coins || 0);
      }

      // 2. BUSCA MÓDULOS
      const { data: cursos } = await supabase
          .from("courses") // Ou 'modules' se sua view estiver ativa
          .select("*")
          .order("sequence_order", { ascending: true });
          
      setModules(cursos || []);

    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-wider">EVOLUÇÃO <span className="text-[#C9A66B]">PRO</span></h1>
          <p className="text-gray-400 text-sm">Invista seus PROs para desbloquear conhecimento.</p>
        </div>
        
        {/* CAIXA DE SALDO - DEVE MOSTRAR 1052 */}
        <div className="bg-[#111] border border-[#333] px-6 py-3 rounded-xl flex flex-col items-end min-w-[150px]">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">SEU SALDO</span>
            <div className="flex items-center gap-2">
                <Trophy size={20} className="text-[#C9A66B]" />
                <span className="font-bold text-white text-2xl">{personalCoins} PRO</span>
            </div>
        </div>
      </div>

      {/* LISTA DE MÓDULOS */}
      <div className="space-y-4">
          {modules.length === 0 && <p className="text-gray-500 text-center py-10">Nenhum módulo encontrado.</p>}
          
          {modules.map((mod) => (
            <Link key={mod.id} href={`/evolucao/${mod.code || mod.slug}`} className="block group">
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#C9A66B] transition-all relative h-[200px]">
                    {/* Imagem */}
                    {mod.image_url ? (
                        <img src={mod.image_url} className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black opacity-50"></div>
                    )}
                    
                    {/* Conteúdo */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                        <span className="bg-black/50 backdrop-blur-md px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider w-fit text-[#C9A66B] border border-[#C9A66B]/30">
                            Módulo {mod.code?.replace('MOD_', '') || 'Extra'}
                        </span>
                        
                        <div>
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-[#C9A66B] transition-colors">{mod.title}</h3>
                            <div className="flex items-center gap-2 text-gray-300 text-xs">
                                <span>por Marcelo Conelheiros</span>
                            </div>
                        </div>
                    </div>
                </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
