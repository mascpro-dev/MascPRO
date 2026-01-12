"use client"

import { useState } from "react"
import { Play, Lock, CheckCircle, Zap } from "lucide-react"
import XPBar from "@/components/xp-bar"

export default function AcademyPage() {
  const [videoAtivo, setVideoAtivo] = useState("https://www.youtube.com/embed/videoseries?list=PLCob8Pdak9tArbNGl3ZATDiHF2gvaS34G")

  const aulas = [
    { id: 1, titulo: "Boas-vindas Embaixadores", duracao: "10 min", xp: 100, concluida: true },
    { id: 2, titulo: "Técnica de Corte Masc PRO", duracao: "25 min", xp: 500, concluida: false },
    { id: 3, titulo: "Colorimetria Avançada", duracao: "40 min", xp: 800, concluida: false },
  ]

  return (
    <div className="p-4 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none">Masc Academy</h1>
        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Conhecimento que gera Poder</p>
      </div>

      <XPBar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PLAYER DE VÍDEO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="aspect-video bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl border border-white/5">
            <iframe 
              width="100%" 
              height="100%" 
              src={videoAtivo} 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen
            ></iframe>
          </div>
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
             <h2 className="text-2xl font-black italic uppercase">Aula atual: Dominando a Marca</h2>
             <p className="text-slate-500 mt-2 font-medium">Assista até o final para coletar seus pontos de experiência e subir de patente.</p>
          </div>
        </div>

        {/* LISTA DE AULAS */}
        <div className="space-y-4">
          <h3 className="font-black uppercase italic text-slate-400 text-xs tracking-widest">Playlist de Aulas</h3>
          {aulas.map((aula) => (
            <div key={aula.id} className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between group hover:border-blue-500 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${aula.concluida ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {aula.concluida ? <CheckCircle size={20} /> : <Play size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 uppercase italic">{aula.titulo}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{aula.duracao} • +{aula.xp} XP</p>
                </div>
              </div>
              {!aula.concluida && <Zap size={16} className="text-slate-200 group-hover:text-blue-500 transition-colors" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}