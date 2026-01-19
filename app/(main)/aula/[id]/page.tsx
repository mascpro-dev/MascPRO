"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle, Trophy } from "lucide-react";

export default function AulaPlayerPage({ params }: { params: { id: string } }) {
  const [resgatado, setResgatado] = useState(false);
  const videoId = "uXWf_x_8L08"; 

  return (
    <div className="max-w-[1200px] mx-auto animate-in fade-in duration-700">
      <Link href="/evolucao" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase mb-6">
        <ChevronLeft size={16} /> Voltar para evolução
      </Link>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-black rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
            <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${videoId}?rel=0`} frameBorder="0" allowFullScreen></iframe>
          </div>

          <div className="bg-[#0A0A0A] border border-white/5 rounded-3xl p-8 flex justify-between items-center">
            <div><h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Módulo Masc PRO</h1><p className="text-slate-500 text-sm mt-1">Conclua o vídeo para liberar sua recompensa.</p></div>
            <button 
              onClick={() => setResgatado(true)}
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                resgatado ? "bg-green-500 text-black cursor-default" : "bg-[#C9A66B] text-black hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(201,166,107,0.2)]"
              }`}
            >
              {resgatado ? <span className="flex items-center gap-2"><CheckCircle size={18} /> +50 PRO RESGATADO</span> : "Resgatar 50 PRO"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}