"use client";

import { CalendarCheck, MoreHorizontal, Phone, Truck, Users } from "lucide-react";
import { PRAZOS_ATIVIDADE, type PrazoAtividade, type TipoTarefa } from "@/lib/crmTarefas";

const FILTROS_TIPO: { value: TipoTarefa; titulo: string; Icon: typeof Phone }[] = [
  { value: "ligacao", titulo: "Ligações a fazer", Icon: Phone },
  { value: "disponibilidade", titulo: "Verificar disponibilidade de ligação", Icon: Users },
  { value: "outro", titulo: "Outras atividades", Icon: MoreHorizontal },
  { value: "visita", titulo: "Confirmar visita", Icon: CalendarCheck },
  { value: "recebimento", titulo: "Confirmar recebimento do pedido", Icon: Truck },
];

export default function CrmPipelineAtividadesBar({
  filtroPrazo,
  filtroTipo,
  onPrazo,
  onTipo,
}: {
  filtroPrazo: PrazoAtividade | null;
  filtroTipo: TipoTarefa | null;
  onPrazo: (v: PrazoAtividade | null) => void;
  onTipo: (v: TipoTarefa | null) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap justify-center">
      <div className="flex items-center gap-1.5">
        {PRAZOS_ATIVIDADE.map((p) => {
          const ativo = filtroPrazo === p.value;
          return (
            <button
              key={p.value}
              type="button"
              title={p.titulo}
              onClick={() => onPrazo(ativo ? null : p.value)}
              className={`w-3.5 h-3.5 rounded-full ${p.dot} transition-transform ${ativo ? "scale-125 ring-2 ring-white/80" : "opacity-80 hover:opacity-100"}`}
            />
          );
        })}
      </div>
      <span className="w-px h-5 bg-zinc-800 hidden sm:block" />
      <div className="flex items-center gap-0.5">
        {FILTROS_TIPO.map(({ value, titulo, Icon }) => {
          const ativo = filtroTipo === value;
          return (
            <button
              key={value}
              type="button"
              title={titulo}
              onClick={() => onTipo(ativo ? null : value)}
              className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-colors ${
                ativo ? "bg-[#C9A66B] text-black" : "text-zinc-500 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
