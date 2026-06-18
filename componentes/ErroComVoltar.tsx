"use client";
import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";

type Props = {
  mensagem: string;
  onVoltar: () => void;
  onTentarNovamente?: () => void;
  rotuloVoltar?: string;
  /** Layout compacto para dentro de modais */
  compacto?: boolean;
};

export default function ErroComVoltar({
  mensagem,
  onVoltar,
  onTentarNovamente,
  rotuloVoltar = "Voltar",
  compacto = false,
}: Props) {
  if (compacto) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3">
        <div className="flex items-start gap-2 text-sm font-bold text-red-400">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p>{mensagem}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onVoltar}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white"
          >
            <ArrowLeft size={12} />
            {rotuloVoltar}
          </button>
          {onTentarNovamente && (
            <button
              type="button"
              onClick={onTentarNovamente}
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg bg-[#C9A66B]/20 hover:bg-[#C9A66B]/30 text-[#C9A66B]"
            >
              <RefreshCw size={12} />
              Tentar novamente
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
      <AlertCircle className="text-red-400 mb-4" size={36} />
      <p className="text-red-400 font-bold text-sm leading-relaxed mb-6">{mensagem}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onVoltar}
          className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-xs tracking-widest px-5 py-2.5 rounded-xl"
        >
          <ArrowLeft size={14} />
          {rotuloVoltar}
        </button>
        {onTentarNovamente && (
          <button
            type="button"
            onClick={onTentarNovamente}
            className="inline-flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-5 py-2.5 rounded-xl"
          >
            <RefreshCw size={14} />
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
