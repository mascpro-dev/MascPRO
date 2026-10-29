"use client";

import { useState } from "react";
import {
  RELACIONAMENTOS_MARCA,
  RESULTADOS_ATENDIMENTO,
  PROXIMAS_ACOES,
} from "@/lib/crmCarteira";

const chip =
  "bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none focus:border-[#C9A66B] max-w-[168px] disabled:opacity-50";

export default function CrmLeadCarteiraSelects({
  leadId,
  apiBase,
  relacionamento,
  resultadoAtendimento,
  proximaAcao,
  onAtualizado,
}: {
  leadId: string;
  apiBase: string;
  relacionamento?: string | null;
  resultadoAtendimento?: string | null;
  proximaAcao?: string | null;
  onAtualizado: (campos: Record<string, string | null>) => void;
}) {
  const [rel, setRel] = useState(relacionamento || "");
  const [sit, setSit] = useState(resultadoAtendimento || "");
  const [acao, setAcao] = useState(proximaAcao || "");
  const [salvando, setSalvando] = useState("");

  async function gravar(campo: string, valor: string) {
    setSalvando(campo);
    const res = await fetch(`${apiBase}/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [campo]: valor || null }),
    });
    const d = await res.json().catch(() => null);
    setSalvando("");
    if (res.ok && d?.ok) onAtualizado({ [campo]: valor || null });
  }

  return (
    <>
      <select
        value={rel}
        disabled={Boolean(salvando)}
        title="Relacionamento com a marca"
        onChange={(e) => {
          setRel(e.target.value);
          void gravar("relacionamento", e.target.value);
        }}
        className={chip}
      >
        <option value="">Relacionamento</option>
        {RELACIONAMENTOS_MARCA.filter((o) => o.value !== "nao_identificado").map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={sit}
        disabled={Boolean(salvando)}
        title="Situação do atendimento"
        onChange={(e) => {
          setSit(e.target.value);
          void gravar("resultado_atendimento", e.target.value);
        }}
        className={chip}
      >
        <option value="">Situação</option>
        {RESULTADOS_ATENDIMENTO.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <select
        value={acao}
        disabled={Boolean(salvando)}
        title="Próxima ação"
        onChange={(e) => {
          setAcao(e.target.value);
          void gravar("proxima_acao", e.target.value);
        }}
        className={chip}
      >
        <option value="">Próxima ação</option>
        {PROXIMAS_ACOES.filter((o) => o.value !== "nenhuma").map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </>
  );
}
