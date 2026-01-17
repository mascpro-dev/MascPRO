import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { Play, Lock, CheckCircle } from "lucide-react";

export default async function EvolucaoPage() {
  const supabase = createServerComponentClient({ cookies });

  // Pega as aulas
  const { data: modules } = await supabase
    .from("Module")
    .select("*")
    .order("id", { ascending: true });

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-white italic tracking-tighter">
          EVOLUÇÃO <span className="text-[#C9A66B]">PRO</span>
        </h1>
        <p className="text-slate-400 mt-2">Trilha de conhecimento técnico.</p>
      </div>

      <div className="grid gap-4">
        {modules?.map((lesson) => (
          <Link 
            key={lesson.id} 
            href={`/aula/${lesson.id}`}
            className="group block bg-slate-900/50 border border-white/5 hover:border-[#C9A66B]/50 p-6 rounded-2xl transition-all hover:bg-slate-900"
          >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#C9A66B]/10 flex items-center justify-center group-hover:bg-[#C9A66B] transition-colors">
                        <Play size={20} className="text-[#C9A66B] group-hover:text-black ml-1" fill="currentColor" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold group-hover:text-[#C9A66B] transition-colors">
                            {lesson.title}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1">Módulo Essencial</p>
                    </div>
                </div>
                <div className="bg-slate-800 px-3 py-1 rounded text-[10px] font-bold text-slate-400 uppercase">
                    50 PRO
                </div>
            </div>
          </Link>
        ))}
        
        {/* Card Bloqueado de Exemplo */}
        <div className="bg-slate-900/20 border border-white/5 p-6 rounded-2xl opacity-50 cursor-not-allowed flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <Lock size={20} className="text-slate-500" />
            </div>
            <div>
                <h3 className="text-slate-500 font-bold">Módulo Avançado</h3>
                <p className="text-slate-600 text-xs">Disponível em breve</p>
            </div>
        </div>
      </div>
    </div>
  );
}