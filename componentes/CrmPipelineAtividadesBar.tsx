"use client";

import { useMemo } from "react";
import { CalendarCheck, MoreHorizontal, Phone, Truck, Users } from "lucide-react";
import { PRAZOS_ATIVIDADE, type PrazoAtividade, type TipoTarefa } from "@/lib/crmTarefas";

const FILTROS_TIPO: { value: TipoTarefa; titulo: string; Icon: typeof Phone }[] = [
  { value: "ligacao", titulo: "Ligações a fazer", Icon: Phone },
  { value: "disponibilidade", titulo: "Verificar disponibilidade de ligação", Icon: Users },
  { value: "outro", titulo: "Outras atividades", Icon: MoreHorizontal },
  { value: "visita", titulo: "Confirmar visita", Icon: CalendarCheck },
  { value: "recebimento", titulo: "Confirmar recebimento do pedido", Icon: Truck },
];

function limparLocal(v: string | null | undefined) {
  return String(v || "").replace(/\s+/g, " ").trim();
}

export default function CrmPipelineAtividadesBar({
  filtroPrazo,
  filtroTipo,
  onPrazo,
  onTipo,
  locais = [],
  filtroEstado = "",
  filtroCidade = "",
  onEstado,
  onCidade,
}: {
  filtroPrazo: PrazoAtividade | null;
  filtroTipo: TipoTarefa | null;
  onPrazo: (v: PrazoAtividade | null) => void;
  onTipo: (v: TipoTarefa | null) => void;
  locais?: { cidade?: string | null; estado?: string | null }[];
  filtroEstado?: string;
  filtroCidade?: string;
  onEstado?: (v: string) => void;
  onCidade?: (v: string) => void;
}) {
  const { estados, cidades } = useMemo(() => {
    const ufSet = new Set<string>();
    const cidSet = new Set<string>();
    for (const l of locais) {
      const uf = limparLocal(l.estado).toUpperCase();
      const cid = limparLocal(l.cidade);
      if (uf) ufSet.add(uf);
      if (cid && (!filtroEstado || uf === filtroEstado.toUpperCase())) cidSet.add(cid);
    }
    return {
      estados: [...ufSet].sort((a, b) => a.localeCompare(b, "pt-BR")),
      cidades: [...cidSet].sort((a, b) => a.localeCompare(b, "pt-BR")),
    };
  }, [locais, filtroEstado]);

  const sel =
    "bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-300 outline-none focus:border-[#C9A66B]/50 min-w-[132px] max-w-[200px]";

  return (
    <div className="shrink-0 border-y border-white/10 bg-zinc-950/80 px-4 md:px-8 py-2.5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {PRAZOS_ATIVIDADE.map((p) => {
            const ativo = filtroPrazo === p.value;
            return (
              <button
                key={p.value}
                type="button"
                title={p.titulo}
                onClick={() => onPrazo(ativo ? null : p.value)}
                className={`h-4 w-4 rounded-full shrink-0 border-2 transition-transform ${ativo ? "scale-110 border-white" : "border-black/40"}`}
                style={{ backgroundColor: p.cor }}
              />
            );
          })}
        </div>
        <span className="w-px h-5 bg-white/10 hidden sm:block" />
        <div className="flex items-center gap-1">
          {FILTROS_TIPO.map(({ value, titulo, Icon }) => {
            const ativo = filtroTipo === value;
            return (
              <button
                key={value}
                type="button"
                title={titulo}
                onClick={() => onTipo(ativo ? null : value)}
                className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors ${
                  ativo ? "bg-[#C9A66B] text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <Icon size={16} />
              </button>
            );
          })}
        </div>
        </div>
        {onEstado && onCidade && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <select
              value={filtroEstado}
              onChange={(e) => {
                const uf = e.target.value;
                onEstado(uf);
                if (filtroCidade) onCidade("");
              }}
              className={sel}
              title="Filtrar por estado"
            >
              <option value="">Todos os estados</option>
              {estados.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
            <select
              value={filtroCidade}
              onChange={(e) => onCidade(e.target.value)}
              className={sel}
              title="Filtrar por cidade"
            >
              <option value="">Todas as cidades</option>
              {cidades.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
