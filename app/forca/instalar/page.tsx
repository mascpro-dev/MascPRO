"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstalarForcaPage() {
  const [deferred, setDeferred] = useState<BipEvent | null>(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BipEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  async function instalar() {
    if (!deferred) return;
    await deferred.prompt();
    const escolha = await deferred.userChoice;
    setMsg(escolha.outcome === "accepted" ? "Atalho instalado. Ele abre em Meu dia." : "Instalação cancelada.");
    setDeferred(null);
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
        <h1 className="text-2xl font-black">Instalar Força de Vendas</h1>
        <p className="text-sm text-zinc-400">
          Este atalho abre direto em Meu dia. O aplicativo MASC PRO continua separado na tela inicial.
        </p>
        {deferred ? (
          <button type="button" onClick={() => void instalar()} className="w-full rounded-xl bg-[#C9A66B] py-3 text-sm font-black text-black">
            Adicionar à tela inicial
          </button>
        ) : (
          <div className="space-y-2 text-sm text-zinc-300">
            <p>No Android, abra o menu do Chrome e toque em Instalar app.</p>
            <p>No iPhone, toque em Compartilhar e depois em Adicionar à Tela de Início.</p>
          </div>
        )}
        {msg && <p className="text-sm text-emerald-400">{msg}</p>}
      </div>
    </div>
  );
}
