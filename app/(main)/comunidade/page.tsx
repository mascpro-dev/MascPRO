"use client";

import { useState } from "react";
import { Trophy, MessageSquare, Share2, Heart, Instagram, MapPin, Send } from "lucide-react";

const TOP_3 = [
  { id: 1, name: "Ricardo Silva", cidade: "São Paulo/SP", pro: "2.450", insta: "@ricardo_hair" },
  { id: 2, name: "Ana Beatriz", cidade: "Curitiba/PR", pro: "2.100", insta: "@ana_style" },
  { id: 3, name: "Marcos Paulo", cidade: "Rio de Janeiro/RJ", pro: "1.980", insta: "@marcos_pro" },
];

const TOP_7 = [
  { rank: 4, name: "Julia Lins", cidade: "BH", pro: "1.850" },
  { rank: 5, name: "Bruno Costa", cidade: "POA", pro: "1.720" },
  { rank: 6, name: "Carla Dias", cidade: "REC", pro: "1.600" },
  { rank: 7, name: "Vitor Hugo", cidade: "SSA", pro: "1.550" },
  { rank: 8, name: "Sonia Abrão", cidade: "FLN", pro: "1.400" },
  { rank: 9, name: "Pedro Vale", cidade: "BSB", pro: "1.320" },
  { rank: 10, name: "Lana Rho", cidade: "MAO", pro: "1.200" },
];

export default function ComunidadePage() {
  const [post, setPost] = useState("");

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700 pb-24">
      
      {/* FEED ESTILO 'X' */}
      <div className="flex-1 space-y-6">
        <div className="border-b border-white/5 pb-4">
          <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">
            Comunidade <span className="text-[#C9A66B]">Masc Pro</span>
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Troca Real • Sem Julgamentos</p>
        </div>

        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4 space-y-4">
          <textarea 
            value={post}
            onChange={(e) => setPost(e.target.value)}
            placeholder="Compartilhe uma evolução técnica ou dúvida com contexto..."
            className="w-full bg-transparent border-none focus:ring-0 text-sm text-slate-300 placeholder:text-slate-600 resize-none h-24"
          />
          <div className="flex justify-between items-center border-t border-white/5 pt-4">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            Participação {" > "} Aparência
            </span>
            <button className="bg-[#C9A66B] text-black px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 uppercase">
              <Send size={14} /> Postar
            </button>
          </div>
        </div>
      </div>

      {/* RANKING TOP 10 (LADO DIREITO) */}
      <div className="w-full lg:w-[350px] space-y-6">
        <div className="bg-[#0A0A0A] border border-[#C9A66B]/10 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/5 pb-4">
            <Trophy className="text-[#C9A66B]" size={20} />
            <h2 className="text-sm font-black text-white italic uppercase tracking-widest">Top 10 Autoridade</h2>
          </div>

          <div className="space-y-4">
            {TOP_3.map((user, idx) => (
              <div key={user.id} className={`p-4 rounded-2xl border ${idx === 0 ? 'bg-[#C9A66B] text-black' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black uppercase">#{idx + 1} LUGAR</span>
                  <span className="text-[10px] font-black">{user.pro} PRO</span>
                </div>
                <p className="font-black italic uppercase tracking-tighter text-sm">{user.name}</p>
                <div className="flex items-center justify-between mt-2 text-[9px] font-bold">
                  <span className="flex items-center gap-1 opacity-70"><MapPin size={10} /> {user.cidade}</span>
                  <span className="flex items-center gap-1 italic underline"><Instagram size={10} /> {user.insta}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-4 border-t border-white/5">
            {TOP_7.map((user) => (
              <div key={user.rank} className="flex items-center justify-between px-2 text-[11px]">
                <div className="flex items-center gap-3 text-slate-300">
                  <span className="text-slate-600 font-black w-4">{user.rank}</span>
                  <span className="font-bold uppercase tracking-tight">{user.name}</span>
                </div>
                <span className="text-[#C9A66B] font-black opacity-50">{user.pro}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}