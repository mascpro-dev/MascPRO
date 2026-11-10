"use client";

import ForcaBaixarApp from "@/componentes/ForcaBaixarApp";
import Link from "next/link";

export default function InstalarForcaPage() {
  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
        <img src="/icon-forca.png" alt="" className="h-16 w-16 rounded-2xl" />
        <h1 className="text-2xl font-black">Força de Vendas</h1>
        <p className="text-sm text-zinc-400">O botão instala só este app. O Masc PRO não entra nele.</p>
        <ForcaBaixarApp />
      </div>
    </div>
  );
}
