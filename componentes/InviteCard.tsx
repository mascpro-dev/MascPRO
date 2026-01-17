"use client";

import { useState, useEffect } from "react";
import { Users, Copy, Check, ExternalLink } from "lucide-react";

export default function InviteCard({ userId }: { userId: string }) {
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Gera o link seguro usando a URL do navegador
  useEffect(() => {
    if (typeof window !== "undefined") {
      setInviteLink(`${window.location.origin}/cadastro?ref=${userId}`);
    }
  }, [userId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-white/10 rounded-2xl p-6 md:p-8 bg-black flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        
        <div className="relative z-10">
            <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">
                <Users size={18} className="text-[#C9A66B]"/>
                Convite Exclusivo
            </h3>
            {/* TEXTO CORRIGIDO AQUI */}
            <p className="text-slate-500 text-sm max-w-sm">
                Ganhe <span className="text-white font-bold">10% das moedas PRO</span> geradas pelos seus indicados.
            </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10">
            {/* O Link Visual */}
            <div className="bg-slate-900/80 px-4 py-3 rounded-xl border border-white/10 text-slate-400 font-mono text-xs w-full sm:w-64 truncate select-all">
                {inviteLink || "Carregando link..."}
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
                {/* Botão Copiar */}
                <button 
                    onClick={handleCopy}
                    className="flex-1 sm:flex-none bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    <span className="sm:hidden md:inline">{copied ? "Copiado!" : "Copiar"}</span>
                </button>

                {/* Botão Testar (Abre em NOVA ABA para não sumir seu menu) */}
                {inviteLink && (
                    <a 
                        href={inviteLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl transition-colors border border-white/10 flex items-center justify-center"
                        title="Testar Link (Nova Aba)"
                    >
                        <ExternalLink size={20} />
                    </a>
                )}
            </div>
        </div>
    </div>
  );
}