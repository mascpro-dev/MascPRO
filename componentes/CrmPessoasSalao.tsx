"use client";

import { MessageCircle } from "lucide-react";
import CrmLigarBotao from "@/componentes/CrmLigarBotao";
import { pessoasDoLead, waLink } from "@/lib/crmPessoasSalao";

type FormPessoas = {
  empresa?: string;
  dono_nome?: string;
  dono_telefone?: string;
  cabeleireiro_nome?: string;
  cabeleireiro_telefone?: string;
};

export function CrmPessoasSalaoCampos({
  form,
  set,
  inputClass,
  labelClass,
}: {
  form: FormPessoas;
  set: (k: string, v: string) => void;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <div className="col-span-2 grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <label className={labelClass}>Salão / empresa</label>
        <input value={form.empresa || ""} onChange={(e) => set("empresa", e.target.value)} className={inputClass} placeholder="Nome do salão" />
      </div>
      <div>
        <label className={labelClass}>Dono (decisor)</label>
        <input value={form.dono_nome || ""} onChange={(e) => set("dono_nome", e.target.value)} className={inputClass} placeholder="Nome de quem decide" />
      </div>
      <div>
        <label className={labelClass}>WhatsApp do dono</label>
        <input value={form.dono_telefone || ""} onChange={(e) => set("dono_telefone", e.target.value)} className={inputClass} placeholder="(11) 99999-9999" />
      </div>
      <div>
        <label className={labelClass}>Cabeleireiro</label>
        <input value={form.cabeleireiro_nome || ""} onChange={(e) => set("cabeleireiro_nome", e.target.value)} className={inputClass} placeholder="Nome do profissional" />
      </div>
      <div>
        <label className={labelClass}>WhatsApp do cabeleireiro</label>
        <input value={form.cabeleireiro_telefone || ""} onChange={(e) => set("cabeleireiro_telefone", e.target.value)} className={inputClass} placeholder="(11) 99999-9999" />
      </div>
      <p className={`${labelClass} col-span-2 normal-case tracking-normal font-normal`}>
        Um cadastro por salão. Guarde as duas pessoas aqui em vez de abrir outro lead.
      </p>
    </div>
  );
}

export function CrmPessoasSalaoResumo({
  lead,
  compacto = true,
  claro = false,
}: {
  lead: {
    id: string;
    nome?: string | null;
    empresa?: string | null;
    telefone?: string | null;
    dono_nome?: string | null;
    dono_telefone?: string | null;
    cabeleireiro_nome?: string | null;
    cabeleireiro_telefone?: string | null;
  };
  compacto?: boolean;
  claro?: boolean;
}) {
  const p = pessoasDoLead(lead);
  const chip = claro ? "text-[10px] text-[#6B6560]" : "text-[10px] text-zinc-400";
  const pessoas = [p.dono, p.profissional].filter(Boolean) as { rotulo: string; nome: string | null; telefone: string | null }[];
  if (!pessoas.length) return null;
  return (
    <div className="flex flex-col gap-1 mt-1">
      {pessoas.map((pessoa) => {
        const w = waLink(pessoa.telefone);
        return (
          <div key={pessoa.rotulo} className="flex flex-wrap items-center gap-1.5">
            <span className={chip}>
              <span className="uppercase tracking-wider text-[9px] font-bold">{pessoa.rotulo}</span>
              {pessoa.nome ? ` · ${pessoa.nome}` : ""}
            </span>
            {w && (
              <a href={w} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-green-400">
                <MessageCircle size={10} /> WhatsApp
              </a>
            )}
            {pessoa.telefone && (
              <CrmLigarBotao leadId={lead.id} telefone={pessoa.telefone} compacto={compacto} claro={claro} />
            )}
          </div>
        );
      })}
    </div>
  );
}
