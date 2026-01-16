import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { PlayCircle, Lock, CheckCircle } from "lucide-react";

export default async function EvolucaoPage() {
  const supabase = createServerComponentClient({ cookies });

  // Busca os módulos no Supabase (ordenados pela coluna 'order')
  // Nota: O print mostrava a tabela 'Module', então vamos usar esse nome.
  // Se der erro, verificamos se o nome é minúsculo 'module'.
  const { data: modules, error } = await supabase
    .from("Module") 
    .select("*")
    .order("order", { ascending: true });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Evolução</h1>
        <p className="text-slate-400">
          Domine a metodologia MASC PRO.
        </p>
      </div>

      <div className="grid gap-4">
        {modules && modules.length > 0 ? (
          modules.map((modulo: any) => (
            <div 
              key={modulo.id} 
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between hover:border-blue-500/50 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-900/20 text-blue-400 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <PlayCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                    {modulo.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Módulo Fundamental
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-2 text-slate-500 text-sm">
                <span>Assistir Aulas</span>
              </div>
            </div>
          ))
        ) : (
          // Caso não encontre nada ou dê erro (fallback)
          <div className="text-center py-12 bg-slate-900/50 rounded-xl border border-dashed border-slate-800">
            <p className="text-slate-400 mb-2">Nenhum módulo encontrado.</p>
            <p className="text-xs text-slate-600">
              (Se você tem dados no Supabase, verifique se o nome da tabela é 'Module' ou 'modules')
            </p>
          </div>
        )}
      </div>
    </div>
  );
}