"use client";
import { useEffect, useState } from "react";
import { X, Megaphone, AlertTriangle, Info, Star } from "lucide-react";

type Comunicado = {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  publico: string;
  created_at: string;
};

const TIPO_STYLE: Record<string, { border: string; bg: string; icon: any; iconColor: string; badge: string }> = {
  info:     { border: "border-blue-500/40",    bg: "bg-blue-950/30",    icon: Info,          iconColor: "text-blue-400",    badge: "bg-blue-500 text-white" },
  aviso:    { border: "border-yellow-500/40",  bg: "bg-yellow-950/30",  icon: AlertTriangle, iconColor: "text-yellow-400",  badge: "bg-yellow-500 text-black" },
  destaque: { border: "border-[#C9A66B]/40",   bg: "bg-[#C9A66B]/10",   icon: Star,          iconColor: "text-[#C9A66B]",   badge: "bg-[#C9A66B] text-black" },
  urgente:  { border: "border-red-500/40",     bg: "bg-red-950/30",     icon: Megaphone,     iconColor: "text-red-400",     badge: "bg-red-500 text-white" },
};

const TIPO_LABEL: Record<string, string> = {
  info: "Informação", aviso: "Aviso", destaque: "Destaque", urgente: "URGENTE",
};

export default function ComunicadosBanner() {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [fechados, setFechados] = useState<string[]>([]);

  useEffect(() => {
    // Lê IDs já dispensados do localStorage
    const salvos = JSON.parse(localStorage.getItem("comunicados_fechados") || "[]");
    setFechados(salvos);

    fetch("/api/comunicados")
      .then(r => r.json())
      .then(d => { if (d.ok) setComunicados(d.comunicados || []); })
      .catch(() => {});
  }, []);

  function fechar(id: string) {
    const novos = [...fechados, id];
    setFechados(novos);
    localStorage.setItem("comunicados_fechados", JSON.stringify(novos));
  }

  const visiveis = comunicados.filter(c => !fechados.includes(c.id));

  if (visiveis.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-6">
      {visiveis.map(c => {
        const estilo = TIPO_STYLE[c.tipo] || TIPO_STYLE.info;
        const Icon = estilo.icon;
        return (
          <div
            key={c.id}
            className={`relative flex items-start gap-4 rounded-2xl border px-5 py-4 ${estilo.bg} ${estilo.border}`}
          >
            <div className={`shrink-0 mt-0.5 ${estilo.iconColor}`}>
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${estilo.badge}`}>
                  {TIPO_LABEL[c.tipo] || c.tipo}
                </span>
                <span className="font-black text-sm text-white">{c.titulo}</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{c.mensagem}</p>
            </div>
            <button
              onClick={() => fechar(c.id)}
              className="shrink-0 p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all mt-0.5"
              title="Dispensar"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
