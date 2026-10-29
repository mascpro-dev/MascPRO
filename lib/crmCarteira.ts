/**
 * Dimensões da carteira comercial.
 * Independentes do status do pipeline (novo, em atendimento, etc.).
 * Não substitui crm_leads.perfil / proximo_passo / data_followup.
 */

export const PERFIS_COMERCIAIS = [
  { value: "nao_verificado", label: "Não verificado" },
  { value: "cabeleireiro", label: "Cabeleireiro" },
  { value: "salao", label: "Salão de beleza" },
  { value: "distribuidor", label: "Distribuidor" },
  { value: "outro_profissional", label: "Outro profissional da beleza" },
  { value: "fora_perfil", label: "Fora do perfil" },
  { value: "atividade_encerrada", label: "Atividade encerrada" },
] as const;

export const RELACIONAMENTOS_MARCA = [
  { value: "nao_identificado", label: "Não identificado" },
  { value: "nunca_ouviu", label: "Nunca conheceu" },
  { value: "conhece_nunca_comprou", label: "Conhece, mas nunca comprou" },
  { value: "ja_comprou", label: "Já comprou anteriormente" },
  { value: "cliente_ativo", label: "Cliente ativo" },
  { value: "cliente_inativo", label: "Cliente inativo" },
] as const;

export const RESULTADOS_ATENDIMENTO = [
  { value: "nao_abordado", label: "Ainda não abordado" },
  { value: "contato_nao_efetivado", label: "Contato não efetivado" },
  { value: "decisor_nao_localizado", label: "Decisor não localizado" },
  { value: "contato_decisor", label: "Contato com decisor realizado" },
  { value: "apresentacao", label: "Apresentação realizada" },
  { value: "catalogo_enviado", label: "Catálogo enviado" },
  { value: "visita_agendada", label: "Visita agendada" },
  { value: "visita_realizada", label: "Visita realizada" },
  { value: "proposta_enviada", label: "Proposta enviada" },
  { value: "negociacao", label: "Negociação em andamento" },
  { value: "compra_confirmada", label: "Compra confirmada" },
  { value: "sem_interesse", label: "Sem interesse" },
  { value: "contato_invalido", label: "Contato inválido" },
] as const;

export const PROXIMAS_ACOES = [
  { value: "tentar_contato", label: "Tentar contato" },
  { value: "falar_decisor", label: "Falar com decisor" },
  { value: "apresentar_marca", label: "Apresentar marca" },
  { value: "enviar_catalogo", label: "Enviar catálogo" },
  { value: "agendar_visita", label: "Agendar visita" },
  { value: "realizar_visita", label: "Realizar visita" },
  { value: "enviar_proposta", label: "Enviar proposta" },
  { value: "negociar", label: "Negociar" },
  { value: "confirmar_pedido", label: "Confirmar pedido" },
  { value: "pos_venda", label: "Realizar pós-venda" },
  { value: "recompra", label: "Trabalhar recompra" },
  { value: "reativar", label: "Reativar cliente" },
  { value: "nenhuma", label: "Nenhuma ação" },
] as const;

export const TIPOS_ATENDIMENTO = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "visita", label: "Visita presencial" },
  { value: "reuniao", label: "Reunião" },
  { value: "apresentacao", label: "Apresentação" },
  { value: "proposta", label: "Envio de proposta" },
  { value: "pos_venda", label: "Pós-venda" },
  { value: "outro", label: "Outro" },
] as const;

export const PERFIL_COMERCIAL_LABEL: Record<string, string> = Object.fromEntries(
  PERFIS_COMERCIAIS.map((p) => [p.value, p.label])
);
export const RELACIONAMENTO_LABEL: Record<string, string> = Object.fromEntries(
  RELACIONAMENTOS_MARCA.map((p) => [p.value, p.label])
);
export const RESULTADO_ATENDIMENTO_LABEL: Record<string, string> = Object.fromEntries(
  RESULTADOS_ATENDIMENTO.map((p) => [p.value, p.label])
);
export const PROXIMA_ACAO_LABEL: Record<string, string> = Object.fromEntries(
  PROXIMAS_ACOES.map((p) => [p.value, p.label])
);
export const TIPO_ATENDIMENTO_LABEL: Record<string, string> = Object.fromEntries(
  TIPOS_ATENDIMENTO.map((p) => [p.value, p.label])
);

const PERFIL_SET = new Set(PERFIS_COMERCIAIS.map((p) => p.value));
const REL_SET = new Set(RELACIONAMENTOS_MARCA.map((p) => p.value));
const RES_SET = new Set(RESULTADOS_ATENDIMENTO.map((p) => p.value));
const ACAO_SET = new Set(PROXIMAS_ACOES.map((p) => p.value));
const TIPO_SET = new Set(TIPOS_ATENDIMENTO.map((p) => p.value));

function parseEnum(
  v: unknown,
  allowed: Set<string>,
  rotulo: string,
  fallback: string | null = null
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (v == null || v === "") return { ok: true, value: fallback };
  const s = String(v);
  if (!allowed.has(s)) return { ok: false, error: `${rotulo} inválido.` };
  return { ok: true, value: s };
}

export function parsePerfilComercial(v: unknown) {
  return parseEnum(v, PERFIL_SET, "Perfil comercial");
}
export function parseRelacionamento(v: unknown) {
  return parseEnum(v, REL_SET, "Relacionamento");
}
export function parseResultadoAtendimento(v: unknown) {
  return parseEnum(v, RES_SET, "Resultado do atendimento");
}
export function parseProximaAcao(v: unknown) {
  return parseEnum(v, ACAO_SET, "Próxima ação");
}
export function parseTipoAtendimento(v: unknown) {
  return parseEnum(v, TIPO_SET, "Tipo de atendimento");
}

/** Equivalência do perfil antigo (fase 2) para o perfil comercial da carteira. */
export function perfilComercialDePerfilLead(perfil: string | null | undefined): string {
  const p = String(perfil || "");
  if (p === "cabeleireiro") return "cabeleireiro";
  if (p === "salao") return "salao";
  if (p === "distribuidor") return "distribuidor";
  if (p === "embaixadora") return "outro_profissional";
  return "nao_verificado";
}

export function normalizarTelefoneBr(raw: string | null | undefined): string | null {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.length < 10) return null;
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d;
}

export function erroColunaCarteira(message: string) {
  if (/column|does not exist|schema cache|PGRST204|crm_atendimentos|crm_import/i.test(message)) {
    return "Rode supabase/crm_carteiras_fase1.sql no Supabase para habilitar as carteiras comerciais.";
  }
  return message;
}
