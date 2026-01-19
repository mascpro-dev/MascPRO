"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Check, ShieldCheck, AlertCircle } from "lucide-react";

const STEPS = [
  {
    title: "Performance que se mantém",
    desc: "Não buscamos hacks ou atalhos. Construímos resultados sólidos que não iludem e fidelizam no longo prazo.",
    bg: "from-black to-blue-900/20"
  },
  {
    title: "Tecnologia + Método",
    desc: "Você não está comprando um produto. Você está sustentando um sistema validado de crescimento.",
    bg: "from-black to-purple-900/20"
  },
  {
    title: "Experiência Premium",
    desc: "O visual, a linguagem e a entrega devem estar sempre no nível máximo. A mediocridade não mora aqui.",
    bg: "from-black to-emerald-900/20"
  },
  {
    title: "Embaixadores como Escola",
    desc: "Crescemos juntos. Indicação aqui não é apenas número, é responsabilidade e educação contínua.",
    bg: "from-black to-[#C9A66B]/20"
  },
  {
    title: "Comunidade e Carreira",
    desc: "O foco é o seu crescimento profissional completo, não apenas o resultado técnico.",
    bg: "from-black to-red-900/20"
  }
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function checkStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", session.user.id)
          .single();
        
        if (profile?.onboarding_completed) {
            router.push("/");
        } else {
            setChecking(false);
        }
      } else {
          setChecking(false);
      }
    }
    checkStatus();
  }, [supabase, router]);

  const handleFinish = async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão perdida.");

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", session.user.id);

      if (error) throw error;
      
      // MUDANÇA CRUCIAL: Força o recarregamento total da página
      // Isso limpa o cache e garante que o Layout.tsx veja que agora é TRUE
      window.location.href = "/";

    } catch (err: any) {
      setErrorMsg("Erro ao salvar. Tente atualizar a página.");
      setLoading(false);
    }
  };

  if (checking) return <div className="h-screen w-full bg-black" />;

  return (
    <div className={`h-screen w-full bg-gradient-to-br ${STEPS[currentStep].bg} flex flex-col items-center justify-center p-6 text-center transition-colors duration-700`}>
      
      {/* BARRA DE PROGRESSO */}
      <div className="absolute top-10 flex gap-2 w-full max-w-xs justify-center">
        {STEPS.map((_, i) => (
            <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= currentStep ? "bg-[#C9A66B]" : "bg-white/10"}`} 
            />
        ))}
      </div>

      <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700 key={currentStep}">
          <div className="mx-auto w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_30px_rgba(201,166,107,0.1)]">
             <ShieldCheck size={32} className="text-[#C9A66B]" />
          </div>

          <h1 className="text-3xl font-black text-white tracking-tighter mb-4 italic">
            {STEPS[currentStep].title}
          </h1>
          
          <p className="text-slate-400 text-lg leading-relaxed">
            {STEPS[currentStep].desc}
          </p>
      </div>

      <div className="absolute bottom-10 w-full px-6 max-w-md space-y-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {currentStep < STEPS.length - 1 ? (
              <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Próximo <ChevronRight size={18} />
              </button>
          ) : (
              <button 
                onClick={handleFinish}
                disabled={loading}
                className="w-full bg-[#C9A66B] text-black font-bold py-4 rounded-xl hover:bg-[#b5925a] transition-all active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(201,166,107,0.4)]"
              >
                {loading ? "Firmando pacto..." : "Aceitar e Entrar"} <Check size={18} />
              </button>
          )}
      </div>
    </div>
  );
}