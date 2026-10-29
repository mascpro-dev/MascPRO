import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarTodasAsPaginas } from "@/lib/crmBuscarTodasPaginas";
import {
  erroColunaCarteira,
  normalizarTelefoneBr,
  perfilComercialDePerfilLead,
} from "@/lib/crmCarteira";
import { ymdSaoPaulo } from "@/lib/comercialRegua";

const SELECT_CARTEIRA = `
  id, nome, empresa, telefone, email, cidade, estado, bairro, endereco, cep,
  status, origem, perfil, perfil_comercial, relacionamento, resultado_atendimento,
  proxima_acao, proxima_acao_em, proxima_acao_justificativa, data_followup, valor_estimado,
  updated_at, created_at, responsavel_id, created_by, profile_id, convertido_em,
  notas, ultimo_atendimento_em, compartilhado
`;

const SELECT_BASE = `
  id, nome, empresa, telefone, email, cidade, estado,
  status, origem, perfil, proximo_passo, data_followup,
  updated_at, created_at, responsavel_id, created_by, profile_id, convertido_em, notas
`;

const DECISOR = new Set([
  "contato_decisor",
  "apresentacao",
  "catalogo_enviado",
  "visita_agendada",
  "visita_realizada",
  "proposta_enviada",
  "negociacao",
  "compra_confirmada",
]);

export type LeadCarteira = Record<string, any>;

export async function idsRedeComercial(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await supabase.from("profiles").select("id").eq("indicado_por", userId);
  return [userId, ...(data || []).map((p: { id: string }) => p.id)];
}

export function orLeadsPorIds(ids: string[]) {
  return ids.map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(",");
}

export async function listarLeadsCarteira(
  supabase: SupabaseClient,
  escopoIds: string[] | null
): Promise<{ data: LeadCarteira[]; error: string | null; colunasNovas: boolean }> {
  const run = (select: string) =>
    buscarTodasAsPaginas((inicio, fim) => {
      let query = supabase.from("crm_leads").select(select).order("updated_at", { ascending: false });
      if (escopoIds) query = query.or(orLeadsPorIds(escopoIds));
      return query.range(inicio, fim);
    });

  const full = await run(SELECT_CARTEIRA);
  if (!full.error) return { data: full.data, error: null, colunasNovas: true };
  if (!/column|does not exist|schema cache|PGRST204/i.test(full.error)) {
    return { data: full.data, error: erroColunaCarteira(full.error), colunasNovas: false };
  }
  const base = await run(SELECT_BASE);
  return {
    data: base.data,
    error: base.error ? erroColunaCarteira(base.error) : null,
    colunasNovas: false,
  };
}

function ymdCampo(v: string | null | undefined) {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return null;
}

function resultadoDe(lead: LeadCarteira) {
  return String(lead.resultado_atendimento || "") || (lead.status === "novo" ? "nao_abordado" : "");
}

function chaveCidade(lead: LeadCarteira) {
  const cidade = String(lead.cidade || "").trim() || "Sem cidade";
  const uf = String(lead.estado || "").trim().toUpperCase();
  return { chave: `${cidade}|${uf}`, cidade, uf };
}

export function agregarCidades(leads: LeadCarteira[], hoje = ymdSaoPaulo()) {
  const map = new Map<
    string,
    {
      cidade: string;
      uf: string;
      total: number;
      nao_trabalhados: number;
      abordados: number;
      sem_resposta: number;
      decisores: number;
      visitas_agendadas: number;
      compradores: number;
      sem_proxima_acao: number;
      atrasados: number;
    }
  >();

  for (const lead of leads) {
    const { chave, cidade, uf } = chaveCidade(lead);
    const row = map.get(chave) || {
      cidade,
      uf,
      total: 0,
      nao_trabalhados: 0,
      abordados: 0,
      sem_resposta: 0,
      decisores: 0,
      visitas_agendadas: 0,
      compradores: 0,
      sem_proxima_acao: 0,
      atrasados: 0,
    };
    row.total += 1;
    const res = resultadoDe(lead);
    if (!res || res === "nao_abordado") row.nao_trabalhados += 1;
    else row.abordados += 1;
    if (res === "contato_nao_efetivado") row.sem_resposta += 1;
    if (DECISOR.has(res)) row.decisores += 1;
    if (res === "visita_agendada") row.visitas_agendadas += 1;
    if (lead.status === "fechado" || lead.profile_id || lead.relacionamento === "cliente_ativo") {
      row.compradores += 1;
    }
    const acao = String(lead.proxima_acao || "");
    const follow = ymdCampo(lead.proxima_acao_em) || ymdCampo(lead.data_followup);
    if (!acao && !follow) row.sem_proxima_acao += 1;
    if (follow && follow < hoje) row.atrasados += 1;
    map.set(chave, row);
  }

  return [...map.values()].sort((a, b) => b.total - a.total || a.cidade.localeCompare(b.cidade, "pt-BR"));
}

export function perfilComercialLead(lead: LeadCarteira) {
  return lead.perfil_comercial || perfilComercialDePerfilLead(lead.perfil);
}

export function filtrarLeadsCarteira(
  leads: LeadCarteira[],
  f: {
    cidade?: string;
    uf?: string;
    vendedor?: string;
    q?: string;
    semResponsavel?: boolean;
  }
) {
  const q = String(f.q || "").trim().toLowerCase();
  return leads.filter((lead) => {
    if (f.cidade) {
      const c = String(lead.cidade || "").trim() || "Sem cidade";
      if (c.toLowerCase() !== f.cidade.toLowerCase()) return false;
    }
    if (f.uf) {
      if (String(lead.estado || "").trim().toUpperCase() !== f.uf.toUpperCase()) return false;
    }
    if (f.semResponsavel && lead.responsavel_id) return false;
    if (f.vendedor && lead.responsavel_id !== f.vendedor) return false;
    if (q) {
      const blob = [lead.nome, lead.empresa, lead.telefone, lead.email, lead.cidade, lead.bairro]
        .join(" ")
        .toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}

export function telefoneLeadNorm(lead: LeadCarteira) {
  return lead.telefone_normalizado || normalizarTelefoneBr(lead.telefone);
}
