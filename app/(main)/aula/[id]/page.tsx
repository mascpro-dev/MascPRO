"use client";

import Link from "next/link";
import { PlayCircle, Lock, CheckCircle, Clock, Search } from "lucide-react";

// Simulando seus vídeos (Isso aqui conecta com sua pasta 'aula/[id]')
const MODULES = [
  {
    id: 1,
    title: "Módulo 1: Fundamentos MASC",
    lessons: [
      // O ID 101 vai levar para /aula/101
      { id: 101, title: "Boas Vindas e Cultura", duration: "05:20", status: "concluido", thumb: "bg-zinc-800" },
      { id: 102, title: "O Mercado de Luxo", duration: "12:10", status: "pendente", thumb: "bg-zinc-800" },
    ]
  },
  {
    id: 2,
    title: "Módulo 2: Técnica Avançada",
    lessons: [
      { id: 201, title: "Colorimetria Exata", duration: "45:00", status: "bloqueado", thumb: "bg-zinc-900" },
    ]
  }
];

export default function AulasPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter">
                SALA DE <span className="text-[#C9A66B]">AULA</span>
            </h1>
            <p className="text-slate-400 mt-1">Conteúdo exclusivo para sua formação.</p>
        </div>
        
        <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-3 text-slate-500" size={18} />
            <input type="text" placeholder="Buscar aula..." className="w-full bg-[#111] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#C9A66B] outline-none" />
        </div>
      </div>

      {/* LISTA DE MÓDULOS */}
      <div className="space-y-8">
        {MODULES.map((module) => (
            <div key={module.id} className="space-y-4">
                <h3 className="text-xl font-bold text-white border-l-4 border-[#C9A66B] pl-3">
                    {module.title}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {module.lessons.map((lesson) => (
                        <Link 
                            key={lesson.id} 
                            // AQUI ESTÁ A MÁGICA: Linka para a pasta 'aula' (singular) que você já tem
                            href={lesson.status === 'bloqueado' ? '#' : `/aula/${lesson.id}`} 
                            className={`group bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden transition-all 
                                ${lesson.status === 'bloqueado' ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#C9A66B]/50 cursor-pointer'}
                            `}
                        >
                            <div className={`h-40 ${lesson.thumb} relative flex items-center justify-center`}>
                                {lesson.status === 'bloqueado' ? (
                                    <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm"><Lock size={20} className="text-slate-400" /></div>
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-[#C9A66B] text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform"><PlayCircle size={24} fill="black" className="text-[#C9A66B]" /></div>
                                )}
                                <div className="absolute bottom-2 right-2 bg-black/80 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 text-white"><Clock size={10} /> {lesson.duration}</div>
                            </div>

                            <div className="p-4">
                                <h4 className={`font-bold text-sm mb-2 ${lesson.status === 'bloqueado' ? 'text-slate-500' : 'text-white'}`}>{lesson.title}</h4>
                                <div className="flex items-center justify-between">
                                    {lesson.status === 'concluido' ? (
                                        <span className="text-[10px] text-green-500 flex items-center gap-1 font-bold bg-green-900/20 px-2 py-1 rounded-full"><CheckCircle size={10} /> Concluído</span>
                                    ) : lesson.status === 'bloqueado' ? (
                                        <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Bloqueado</span>
                                    ) : (
                                        <span className="text-[10px] text-[#C9A66B] font-bold uppercase tracking-wider">Assistir Agora</span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}