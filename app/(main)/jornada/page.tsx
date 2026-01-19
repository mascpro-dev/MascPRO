"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import { Shield, Award, Star, GraduationCap, Lock, CheckCircle, AlertCircle } from "lucide-react";

const LEVELS = [
  { id: "MEMBRO", label: "Membro Iniciante", desc: "O início da caminhada.", reqs: ["Cadastro aprovado"], icon: Shield, color: "text-slate-400" },
  { id: "CERTIFIED", label: "CERTIFIED", desc: "O primeiro selo de autoridade.", reqs: ["Curso MASC Fundamentos", "Prova teórica"], icon: CheckCircle, color: "text-blue-400" },
  { id: "EXPERT", label: "EXPERT", desc: "Domínio avançado e casos complexos.", reqs: ["6 meses como Certified", "Avaliação Prática"], icon: Star, color: "text-[#C9A66B]" },
  { id: "MASTER", label: "MASTER TÉCNICO", desc: "Referência técnica.", reqs: ["Mentoria aprovada", "Defesa para banca"], icon: Award, color: "text-purple-400" },
  { id: "EDUCADOR", label: "EDUCADOR", desc: "O topo. Você forma novos profissionais.", reqs: ["Convite exclusivo"], icon: GraduationCap, color: "text-red-500" }
];

export default function JornadaPage() {
  const [currentLevel, setCurrentLevel] = useState("MEMBRO");
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function getData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("profiles").select("current_level").eq("id", session.user.id).single();
        if (data?.current_level) {
             const dbLevel = data.current_level.toUpperCase();
             const match = LEVELS.find(l => dbLevel.includes(l.id))?.id || "MEMBRO";
             setCurrentLevel(match);
        }
      }
    }
    getData();
  }, [supabase]);

  const currentIndex = LEVELS.findIndex(l => l.id === currentLevel) !== -1 ? LEVELS.findIndex(l => l.id === currentLevel) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="text-center md:text-left">
          <h1 className="text-3xl font-black text-white tracking-tighter italic">
            JORNADA DO <span className="text-[#C9A66B]">EMBAIXADOR</span>
          </h1>
          <p className="text-slate-400 mt-2 max-w-2xl">
            Sua evolução de carreira. Aqui o título se conquista.
          </p>
      </div>

      <div className="relative mt-12">
        <div className="hidden md:block absolute left-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#C9A66B] via-slate-800 to-slate-900 opacity-30"></div>
        <div className="space-y-6">
            {LEVELS.map((level, index) => {
                const isUnlocked = index <= currentIndex;
                const isCurrent = index === currentIndex;
                const Icon = level.icon;

                return (
                    <div key={level.id} className={`relative group md:pl-20 transition-all ${isUnlocked ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                        <div className={`hidden md:flex absolute left-0 top-6 w-14 h-14 rounded-full border-2 items-center justify-center z-10 bg-[#0A0A0A] ${isCurrent ? 'border-[#C9A66B]' : 'border-white/10'}`}>
                             {isUnlocked ? <Icon size={24} className={isCurrent ? level.color : "text-white"} /> : <Lock size={20} className="text-slate-600" />}
                        </div>
                        <div className={`rounded-2xl border p-6 ${isCurrent ? 'bg-[#0A0A0A] border-[#C9A66B]' : 'bg-black border-white/10'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <Icon size={24} className={`md:hidden ${level.color}`} />
                                <h3 className="text-xl font-black uppercase text-white">{level.label}</h3>
                            </div>
                            <p className="text-sm text-slate-400">{level.desc}</p>
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}