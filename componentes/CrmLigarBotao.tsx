"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone } from "lucide-react";

type Props = {
  leadId?: string;
  telefone?: string | null;
  compacto?: boolean;
  claro?: boolean;
};

export default function CrmLigarBotao({ leadId, telefone, compacto = true, claro = false }: Props) {
  const [liberado, setLiberado] = useState(false);
  const [ligando, setLigando] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let ativo = true;
    fetch("/api/crm/discador", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (ativo) setLiberado(Boolean(d?.configurado));
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  if (!liberado || (!leadId && !telefone)) return null;

  async function ligar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLigando(true);
    setMsg("");
    try {
      const res = await fetch("/api/crm/discador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId || undefined, telefone: telefone || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg(data?.error || "Não foi possível ligar.");
        return;
      }
      setMsg("Chamando no Webphone…");
    } finally {
      setLigando(false);
    }
  }

  const base = claro
    ? "text-[#8A6A32] bg-[#F5EDDF] hover:bg-[#EDE4D4]"
    : "text-amber-300 bg-amber-500/10 hover:bg-amber-500/20";

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={(e) => void ligar(e)}
        disabled={ligando}
        title="Ligar pelo discador API4COM"
        className={`inline-flex items-center gap-1 ${compacto ? "text-[10px] px-2 py-1" : "text-[12px] px-3 h-10"} rounded-lg transition-colors disabled:opacity-60 ${base}`}
      >
        {ligando ? <Loader2 size={compacto ? 10 : 14} className="animate-spin" /> : <Phone size={compacto ? 10 : 14} />}
        Ligar
      </button>
      {msg && <span className={`text-[10px] max-w-[180px] ${msg.includes("Chamando") ? "text-emerald-500" : "text-red-400"}`}>{msg}</span>}
    </span>
  );
}
