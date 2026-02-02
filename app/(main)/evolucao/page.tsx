"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { Trophy, PlayCircle, CheckCircle, Lock, Loader2 } from "lucide-react";

export default function EvolucaoPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [personalCoins, setPersonalCoins] = useState(0); // Este será o 1052
  const [modules, setModules] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. BUSCAR O SALDO CORRETO (1052)
        // Buscamos direto do perfil, sem somar histórico antigo
        const { data: profile } = await supabase
            .from("profiles")
            .select("personal_coins")
            .eq("id", user.id)
            .single();

        if (profile) {
            setPersonalCoins(profile.personal_coins || 0);
        }

        // 2. BUSCAR OS MÓDULOS (Cursos)
        // Usa a view 'modules' ou a tabela 'courses' dependendo do que está ativo
        // Fallback seguro para garantir que a lista carregue
        const { data: cursos } = await supabase
            .from("courses") // Tenta tabela nova
            .select("*")
            .order("sequence_order", { ascending: true });
            
        setModules(cursos || []);

      } catch (error) {
        console.error("Erro ao carregar evolução:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-[#C9A66B]"><Loader2 className="animate-spin mr-2"/> Carregando Evolução...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      {/* CABEÇALHO COM O SALDO CORRETO */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Minha Jornada</h1>
          <p className="text-gray-400 text-sm">Seu progresso pessoal</p>
        </div>
        <div className="bg-[#C9A66B]/10 border border-[#C9A66B] px-4 py-2 rounded-full flex items-center gap-2">
            <Trophy size={18} className="text-[#C9A66B]" />
            {/* AQUI VAI APARECER O 1052 */}
            <span className="font-bold text-[#C9A66B] text-lg">{personalCoins} PRO</span>
        </div>
      </div>

      {/* LISTA DE MÓDULOS */}
      <div className="space-y-4">
          {modules.length === 0 && <p className="text-gray-500 text-center py-10">Nenhum módulo encontrado.</p>}
          
          {modules.map((mod) => (
            <Link key={mod.id} href={`/evolucao/${mod.code || mod.slug}`} className="block group">
                <div className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#C9A66B] transition-colors relative">
                    {/* Imagem de Fundo (Opcional) ou Gradiente */}
                    <div className="h-32 bg-gradient-to-r from-gray-900 to-black p-6 flex flex-col justify-center relative">
                        {mod.image_url && <img src={mod.image_url} className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" />}
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-white mb-1">{mod.title}</h3>
                            <p className="text-gray-400 text-xs line-clamp-2 max-w-[80%]">{mod.description}</p>
                        </div>
                        <PlayCircle className="absolute right-6 top-1/2 -translate-y-1/2 text-[#C9A66B] opacity-80 group-hover:scale-110 transition-transform" size={40} />
                    </div>
                </div>
            </Link>
          ))}
      </div>
    </div>
  );
}
