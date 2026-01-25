"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  
  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* SEU LAYOUT ORIGINAL AQUI */}
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Comunidade</h1>
        
        {/* CORREÇÃO DO SÍMBOLO QUE TRAVA O VERCEL */}
        <div className="flex items-center gap-2 py-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            Participação {" > "} Aparência
          </span>
        </div>
      </div>
    </div>
  );
}