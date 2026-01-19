"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle, Trophy } from "lucide-react";

export default function AulaPlayerPage({ params }: { params: { id: string } }) {
  const [resgatado, setResgatado] = useState(false);

  // CAPTURA DE INDICAÇÃO: Salva o ID do indicador se ele vier na URL da aula
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      localStorage.setItem("masc_referrer", ref);
    }
  }, []);

  // IDs de exemplo baseados na sua estrutura
  const videoMap: { [key: string]: string } = {
    blonde: "uXWf_x_8L08", 
    curls: "uXWf_x_8L08",
    repair: "uXWf_x_8L08"
  };

  const videoId = videoMap[params.id] || "uXWf_x_8L08";

  return (
    <div className="max-w-[1200px] mx-auto animate-in fade-in duration-700 pb-20">
      {/* NAVEGAÇÃO SUPERIOR MANTIDA */}
      <Link href="/evolucao" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase mb-6 tracking-widest">
        <ChevronLeft size={16} /> Voltar para evolução
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* PLAYER DE VÍDEO */}
          <div className="aspect-video bg-black rounded-3xl border border-white/5 overflow-hidden shadow-2xl relative">
            <iframe 
                width="100%" 
                height="100%" 
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`} 
                title="Player Masc PRO"
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="absolute inset-0"
            ></iframe>
          </div>

          {/* ÁREA DE INFORMAÇÕES E RESGATE */}
          <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Módulo Especialista: {params.id.toUpperCase()}</h1>
              <p className="text-slate-500 text-sm mt-1">Conclua o vídeo para liberar seu reconhecimento profissional.</p>
            </div>
            
            {/* BOTÃO DE RESGATE DE 50 PRO */}
            <button 
              onClick={() => setResgatado(true)}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                resgatado 
                ? "bg-green-500 text-black cursor-default" 
                : "bg-[#C9A66B] text-black hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(201,166,107,0.2)]"
              }`}
            >
              {resgatado ? (
                <span className="flex items-center gap-2"><CheckCircle size={18} /> +50 PRO RESGATADO</span>
              ) : (
                "Resgatar 50 PRO"
              )}
            </button>
          </div>
        </div>

        {/* PLAYLIST LATERAL MANTIDA */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-6 h-fit space-y-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-4 italic">Conteúdo do Módulo</p>
          <div className="p-4 bg-white/5 border border-[#C9A66B]/30 rounded-2xl">
            <p className="text-xs font-bold text-white uppercase tracking-tighter italic">01. Introdução e Conceitos</p>
            <p className="text-[10px] text-[#C9A66B] font-black uppercase mt-1">Assistindo agora</p>
          </div>
        </div>
      </div>
    </div>
  );
}