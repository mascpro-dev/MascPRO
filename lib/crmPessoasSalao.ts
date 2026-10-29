export type PessoasSalao = {
  dono_nome: string | null;
  dono_telefone: string | null;
  cabeleireiro_nome: string | null;
  cabeleireiro_telefone: string | null;
};

function limpar(v: unknown): string | null {
  const t = String(v ?? "").trim();
  return t || null;
}

export function camposPessoasSalao(body: Record<string, unknown> | null | undefined): PessoasSalao {
  return {
    dono_nome: limpar(body?.dono_nome),
    dono_telefone: limpar(body?.dono_telefone),
    cabeleireiro_nome: limpar(body?.cabeleireiro_nome),
    cabeleireiro_telefone: limpar(body?.cabeleireiro_telefone),
  };
}

export function nomeDoSalao(body: Record<string, unknown> | null | undefined): string {
  return (
    limpar(body?.nome) ||
    limpar(body?.empresa) ||
    limpar(body?.dono_nome) ||
    limpar(body?.cabeleireiro_nome) ||
    "Contato"
  );
}

export function erroColunaPessoasSalao(message: string) {
  if (/dono_nome|cabeleireiro_nome|dono_telefone|cabeleireiro_telefone/i.test(message)) {
    return "Rode supabase/crm_leads_pessoas_salao.sql no Supabase para salvar dono e cabeleireiro no mesmo salão.";
  }
  return null;
}

export function waLink(tel: string | null | undefined) {
  const n = String(tel || "").replace(/\D/g, "");
  if (!n) return null;
  return `https://wa.me/${n.startsWith("55") ? n : `55${n}`}`;
}

export function pessoasDoLead(lead: {
  nome?: string | null;
  empresa?: string | null;
  telefone?: string | null;
  dono_nome?: string | null;
  dono_telefone?: string | null;
  cabeleireiro_nome?: string | null;
  cabeleireiro_telefone?: string | null;
}) {
  const donoNome = lead.dono_nome || null;
  const donoTel = lead.dono_telefone || (donoNome ? lead.telefone : null);
  const cabNome = lead.cabeleireiro_nome || null;
  const cabTel = lead.cabeleireiro_telefone || null;
  return {
    titulo: lead.empresa || lead.nome || "Contato",
    dono: donoNome || donoTel ? { rotulo: "Dono", nome: donoNome, telefone: donoTel } : null,
    profissional: cabNome || cabTel ? { rotulo: "Cabeleireiro", nome: cabNome, telefone: cabTel } : null,
  };
}
