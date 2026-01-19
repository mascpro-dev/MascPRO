"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Shield, Award, Star, GraduationCap, Lock, CheckCircle, ChevronDown, AlertCircle } from "lucide-react";

// A HIERARQUIA SAGRADA
const LEVELS = [
  {
    id: "MEMBRO",
    label: "Membro Iniciante",
    desc: "O início da caminhada. Acesso à comunidade e produtos.",
    reqs: ["Cadastro aprovado", "Onboarding concluído"],
    icon: Shield,
    color: "text-slate-400"
  },
  {
    id: "CERTIFIED",
    label: "CERTIFIED",
    desc: "O primeiro selo de autoridade. Você domina os fundamentos.",
    reqs: ["Curso MASC Fundamentos", "Envio de 3 casos práticos", "Prova teórica (Min. 80%)"],
    icon: CheckCircle,
    color: "text-blue-400"
  },
  {
    id: "EXPERT",
    label: "EXPERT",
    desc: "Domínio avançado e capacidade de resolver casos complexos.",
    reqs: ["6 meses como Certified", "Participação em Workshop Presencial", "Avaliação de Corte e Química"],
    icon: Star,
    color: "text-[#C9A66B]" // Gold
  },
  {
    id: "MASTER",
    label: "MASTER TÉCNICO",
    desc: "Referência técnica. Você não só faz, você cria padrões.",
    reqs: ["Mentoria aprovada", "Desenvolvimento de coleção autoral", "Defesa técnica para banca"],
    icon: Award,
    color: "text-purple-400"
  },
  {
    id: "EDUCADOR",
    label: "EDUCADOR MASC PRO",
    desc: "O topo. Você forma novos profissionais e representa a marca.",
    reqs: ["Convite exclusivo", "Formação de oratória", "Alinhamento pedagógico"],
    icon: GraduationCap,
    color: "text-red-500"
  }
];

export default function JornadaPage() {
  const [currentLevel, setCurrentLevel] = useState("MEMBRO");
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("current_level")
          .eq("id", session.user.id)
          .single();
        
        if (data?.current_level) {
            // Ajusta caso venha do banco algo diferente ou minúsculo
            const dbLevel = data.current_level.toUpperCase().includes("MASTER") ? "MASTER" : 
                            data.current_level.toUpperCase().includes("EDUCADOR") ? "EDUCADOR" :
                            data.current_level.toUpperCase();
            setCurrentLevel(dbLevel);
        }
      }
      setLoading(false);
    }
    getData();
  }, [supabase]);

  // Lógica para saber onde o usuário está na escada (índice 0 a 4)
  const currentIndex = LEVELS.findIndex(l => l.id === currentLevel) !== -1 
    ? LEVELS.findIndex(l => l.id === currentLevel) 
    : 0;

  if (loading) return <div className="p-12 text-slate-500">Carregando jornada...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      
      <div className="text-center md:text-left">
          <h1 className="text-3xl font-black text-white tracking-tighter italic">
            JORNADA DO <span className="text-[#C9A66B]">EMBAIXADOR</span>
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Aqui o título pesa. A evolução não é por tempo, é por mérito, entrega e prova.
          </p>
      </div>

      <div className="relative mt-12">
        {/* LINHA CONECTORA VERTICAL (Escondida em Mobile, Visivel em Desktop) */}
        <div className="hidden md:block absolute left-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#C9A66B] via-slate-800 to-slate-900 opacity-30"></div>

        <div className="space-y-6">
            {LEVELS.map((level, index) => {
                const isUnlocked = index <= currentIndex;
                const isCurrent = index === currentIndex;
                const isNext = index === currentIndex + 1;
                const Icon = level.icon;

                return (
                    <div 
                        key={level.id}
                        className={`relative group md:pl-20 transition-all duration-500 ${isUnlocked ? 'opacity-100' : 'opacity-40 grayscale'}`}
                    >
                        {/* BOLINHA DA LINHA DO TEMPO */}
                        <div className={`hidden md:flex absolute left-0 top-6 w-14 h-14 rounded-full border-2 items-center justify-center z-10 bg-[#0A0A0A] transition-colors duration-500
                            ${isCurrent ? 'border-[#C9A66B] shadow-[0_0_20px_rgba(201,166,107,0.3)]' : isUnlocked ? 'border-white/20' : 'border-white/5'}
                        `}>
                             {isUnlocked ? (
                                <Icon size={24} className={isCurrent ? level.color : "text-white"} />
                             ) : (
                                <Lock size={20} className="text-slate-600" />
                             )}
                        </div>

                        {/* CARD DO NÍVEL */}
                        <div className={`
                            relative overflow-hidden rounded-2xl border p-6 md:p-8 transition-all duration-300
                            ${isCurrent 
                                ? 'bg-[#0A0A0A] border-[#C9A66B] shadow-[0_0_30px_rgba(201,166,107,0.1)] scale-[1.02]' 
                                : 'bg-black border-white/10 hover:border-white/20'
                            }
                        `}>
                            {/* Efeito de fundo para o nível atual */}
                            {isCurrent && <div className="absolute right-0 top-0 w-64 h-64 bg-[#C9A66B]/5 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none"></div>}

                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 relative z-10">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        {/* Ícone mobile */}
                                        <div className="md:hidden">
                                            {isUnlocked ? <Icon size={20} className={level.color} /> : <Lock size={20} />}
                                        </div>
                                        <h3 className={`text-xl md:text-2xl font-black tracking-wide uppercase ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                                            {level.label}
                                        </h3>
                                        {isCurrent && <span className="text-[10px] bg-[#C9A66B] text-black px-2 py-0.5 rounded font-bold uppercase">Atual</span>}
                                    </div>
                                    <p className="text-sm text-slate-400 font-medium max-w-xl leading-relaxed">
                                        {level.desc}
                                    </p>
                                </div>

                                {/* Botão de Ação ou Status */}
                                <div className="mt-4 md:mt-0 min-w-[180px]">
                                    {isCurrent ? (
                                        <div className="text-right">
                                            <p className="text-[#C9A66B] text-xs font-bold uppercase mb-1">Status</p>
                                            <p className="text-white font-mono text-sm">Vigente ✅</p>
                                        </div>
                                    ) : isNext ? (
                                        <button className="w-full bg-white/5 hover:bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
                                            <AlertCircle size={16} /> Ver Requisitos
                                        </button>
                                    ) : isUnlocked ? (
                                        <div className="text-right opacity-50">
                                            <p className="text-slate-500 text-xs font-bold uppercase">Concluído</p>
                                            <p className="text-slate-400 text-xs">Aprovado</p>
                                        </div>
                                    ) : (
                                        <div className="text-right opacity-30">
                                            <p className="text-slate-600 text-xs font-bold uppercase">Bloqueado</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ÁREA DE REQUISITOS (Só mostra se for o nível Atual ou o Próximo) */}
                            {(isCurrent || isNext) && (
                                <div className="mt-6 pt-6 border-t border-white/5 animate-in slide-in-from-top-2 duration-500">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                        {isCurrent ? "Para manter ou evoluir:" : "Critérios para conquistar:"}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {level.reqs.map((req, i) => (
                                            <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5 flex items-start gap-3">
                                                <div className={`mt-1 w-2 h-2 rounded-full ${isUnlocked ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                                                <span className={`text-xs ${isUnlocked ? 'text-slate-300' : 'text-slate-400'}`}>{req}</span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {isNext && (
                                        <div className="mt-4 flex justify-end">
                                            <button className="bg-[#C9A66B] hover:bg-[#b08d55] text-black text-sm font-bold px-6 py-3 rounded-lg shadow-lg shadow-[#C9A66B]/20 transition-all">
                                                Solicitar Avaliação da Banca
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}