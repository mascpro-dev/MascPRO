export const LINHAS_PRODUTO = [
  { value: "daily", label: "Daily" },
  { value: "nutri", label: "Nutri" },
  { value: "repair", label: "Repair" },
  { value: "scalp", label: "Scalp" },
  { value: "curls", label: "Curls" },
  { value: "blond", label: "Blond" },
  { value: "align3", label: "Align³" },
] as const;

export const PERFIS_LEAD = [
  { value: "cliente_final", label: "Cliente final" },
  { value: "cabeleireiro", label: "Cabeleireiro" },
  { value: "salao", label: "Salão" },
  { value: "embaixadora", label: "Embaixadora" },
  { value: "distribuidor", label: "Distribuidor" },
] as const;

export const INTERESSES_LEAD = [
  { value: "produto", label: "Produto" },
  { value: "home_care", label: "Home care" },
  { value: "align3", label: "Align³" },
  { value: "embaixadora", label: "Embaixadora" },
  { value: "distribuicao", label: "Distribuição" },
  { value: "treinamento", label: "Treinamento" },
] as const;

export const DORES_LEAD = [
  { value: "frizz", label: "Frizz" },
  { value: "quebra", label: "Quebra" },
  { value: "loiro", label: "Loiro" },
  { value: "cachos", label: "Cachos" },
  { value: "couro", label: "Couro" },
  { value: "ressecamento", label: "Ressecamento" },
  { value: "venda", label: "Venda" },
  { value: "recompra", label: "Recompra" },
] as const;

export const ORIGENS_LEAD = [
  { value: "manual", label: "Manual" },
  { value: "indicacao", label: "Indicação" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "evento", label: "Evento" },
  { value: "distribuidor", label: "Distribuidor" },
  { value: "embaixadora", label: "Embaixadora" },
  { value: "trafego", label: "Tráfego" },
  { value: "outro", label: "Outro" },
] as const;

export const COLUNAS_KANBAN_CRM = [
  { key: "novo", label: "Novo", cor: "text-blue-400", bg: "bg-blue-500/10", borda: "border-blue-500/30" },
  { key: "contato_feito", label: "Em atendimento", cor: "text-yellow-400", bg: "bg-yellow-500/10", borda: "border-yellow-500/30" },
  { key: "qualificado", label: "Qualificado", cor: "text-cyan-400", bg: "bg-cyan-500/10", borda: "border-cyan-500/30" },
  { key: "diagnostico", label: "Diagnóstico", cor: "text-amber-400", bg: "bg-amber-500/10", borda: "border-amber-500/30" },
  { key: "proposta", label: "Proposta", cor: "text-orange-400", bg: "bg-orange-500/10", borda: "border-orange-500/30" },
  { key: "negociacao", label: "Negociação", cor: "text-purple-400", bg: "bg-purple-500/10", borda: "border-purple-500/30" },
  { key: "fechado", label: "Fechado", cor: "text-green-400", bg: "bg-green-500/10", borda: "border-green-500/30" },
  { key: "perdido", label: "Perdido", cor: "text-red-400", bg: "bg-red-500/10", borda: "border-red-500/30" },
  { key: "reativar", label: "Reativar", cor: "text-pink-400", bg: "bg-pink-500/10", borda: "border-pink-500/30" },
  { key: "nao_qualificado", label: "Não qualif.", cor: "text-zinc-400", bg: "bg-zinc-500/10", borda: "border-zinc-500/30" },
] as const;

export const STATUS_LEAD_LABEL: Record<string, string> = Object.fromEntries(
  COLUNAS_KANBAN_CRM.map((c) => [c.key, c.label])
);

export const ORIGEM_LEAD_LABEL: Record<string, string> = Object.fromEntries(
  ORIGENS_LEAD.map((o) => [o.value, o.label])
);

export const LINHA_LABEL: Record<string, string> = Object.fromEntries(
  LINHAS_PRODUTO.map((l) => [l.value, l.label])
);

export const PERFIL_LABEL: Record<string, string> = Object.fromEntries(
  PERFIS_LEAD.map((p) => [p.value, p.label])
);

export const INTERESSE_LABEL: Record<string, string> = Object.fromEntries(
  INTERESSES_LEAD.map((i) => [i.value, i.label])
);

export const DOR_LABEL: Record<string, string> = Object.fromEntries(
  DORES_LEAD.map((d) => [d.value, d.label])
);

export const STATUS_PIPELINE_ABERTO = [
  "novo",
  "contato_feito",
  "qualificado",
  "diagnostico",
  "proposta",
  "negociacao",
  "reativar",
] as const;

export const STATUS_PIPELINE_FECHADO = ["fechado", "perdido", "nao_qualificado"] as const;
export const STATUS_EXIGE_PROXIMO_PASSO = ["proposta", "negociacao"] as const;
export const STATUS_FUNIL_PRINCIPAL = [
  "novo",
  "contato_feito",
  "qualificado",
  "diagnostico",
  "proposta",
  "negociacao",
  "fechado",
] as const;

export const CAMPOS_CLASSIFICACAO_LEAD = [
  "perfil",
  "interesse",
  "linha_interesse",
  "dor",
  "proximo_passo",
] as const;

export const CAMPOS_PATCH_LEAD = [
  "nome",
  "empresa",
  "telefone",
  "email",
  "instagram",
  "cidade",
  "estado",
  "status",
  "origem",
  "valor_estimado",
  "data_followup",
  "notas",
  "responsavel_id",
  ...CAMPOS_CLASSIFICACAO_LEAD,
] as const;

export const CRM_LEADS_LIST_SELECT = `
  id, created_at, updated_at,
  nome, empresa, telefone, email, instagram, cidade, estado,
  status, origem, valor_estimado, data_followup, notas,
  perfil, interesse, linha_interesse, dor, proximo_passo,
  responsavel_id, created_by, profile_id, order_id,
  responsavel:profiles!crm_leads_responsavel_id_fkey(id, full_name, avatar_url)
`;

const STATUS_SET = new Set(COLUNAS_KANBAN_CRM.map((c) => c.key));
const ORIGEM_SET = new Set(ORIGENS_LEAD.map((o) => o.value));
const LINHA_SET = new Set(LINHAS_PRODUTO.map((l) => l.value));
const PERFIL_SET = new Set(PERFIS_LEAD.map((p) => p.value));
const INTERESSE_SET = new Set(INTERESSES_LEAD.map((i) => i.value));
const DOR_SET = new Set(DORES_LEAD.map((d) => d.value));

function labelDe(lista: readonly { value: string; label: string }[], value: string | null | undefined) {
  if (!value) return "";
  return lista.find((x) => x.value === value)?.label || value;
}

export function labelLinha(value: string | null | undefined) {
  return labelDe(LINHAS_PRODUTO, value);
}
export function labelPerfil(value: string | null | undefined) {
  return labelDe(PERFIS_LEAD, value);
}
export function labelInteresse(value: string | null | undefined) {
  return labelDe(INTERESSES_LEAD, value);
}
export function labelDor(value: string | null | undefined) {
  return labelDe(DORES_LEAD, value);
}

export function statusContaFollowup(status: string) {
  return !(STATUS_PIPELINE_FECHADO as readonly string[]).includes(status);
}

export function statusPipelineAberto(status: string) {
  return (STATUS_PIPELINE_ABERTO as readonly string[]).includes(status);
}

export function parseStatusLead(v: unknown, fallback = "novo"): { ok: true; value: string } | { ok: false; error: string } {
  if (v == null || v === "") return { ok: true, value: fallback };
  const s = String(v);
  if (STATUS_SET.has(s as (typeof COLUNAS_KANBAN_CRM)[number]["key"])) return { ok: true, value: s };
  return { ok: false, error: "Status inválido." };
}

export function parseOrigemLead(v: unknown, fallback = "manual"): { ok: true; value: string } | { ok: false; error: string } {
  if (v == null || v === "") return { ok: true, value: fallback };
  const s = String(v);
  if (ORIGEM_SET.has(s as (typeof ORIGENS_LEAD)[number]["value"])) return { ok: true, value: s };
  return { ok: false, error: "Origem inválida." };
}

export function parseLinhaProduto(v: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (v == null || v === "") return { ok: true, value: null };
  const s = String(v);
  if (LINHA_SET.has(s as (typeof LINHAS_PRODUTO)[number]["value"])) return { ok: true, value: s };
  return { ok: false, error: "Linha inválida." };
}

function pickEnum(
  body: Record<string, unknown>,
  key: string,
  allowed: Set<string>,
  rotulo: string
): { ok: true; value?: string | null } | { ok: false; error: string } {
  if (!(key in body)) return { ok: true };
  const v = body[key];
  if (v == null || v === "") return { ok: true, value: null };
  const s = String(v);
  if (!allowed.has(s)) return { ok: false, error: `${rotulo} inválido.` };
  return { ok: true, value: s };
}

export function pickClassificacaoLead(body: Record<string, unknown>): {
  campos: Record<string, string | null>;
  error: string | null;
} {
  const campos: Record<string, string | null> = {};
  const perfil = pickEnum(body, "perfil", PERFIL_SET, "Perfil");
  if (!perfil.ok) return { campos: {}, error: perfil.error };
  if ("value" in perfil) campos.perfil = perfil.value ?? null;

  const interesse = pickEnum(body, "interesse", INTERESSE_SET, "Interesse");
  if (!interesse.ok) return { campos: {}, error: interesse.error };
  if ("value" in interesse) campos.interesse = interesse.value ?? null;

  const linha = pickEnum(body, "linha_interesse", LINHA_SET, "Linha de interesse");
  if (!linha.ok) return { campos: {}, error: linha.error };
  if ("value" in linha) campos.linha_interesse = linha.value ?? null;

  const dor = pickEnum(body, "dor", DOR_SET, "Dor");
  if (!dor.ok) return { campos: {}, error: dor.error };
  if ("value" in dor) campos.dor = dor.value ?? null;

  if ("proximo_passo" in body) {
    const v = body.proximo_passo;
    campos.proximo_passo = v == null || String(v).trim() === "" ? null : String(v).trim();
  }

  return { campos, error: null };
}

export function validarProximoPassoProposta(params: {
  status?: string | null;
  data_followup?: string | null;
  proximo_passo?: string | null;
}): string | null {
  if (!params.status || !(STATUS_EXIGE_PROXIMO_PASSO as readonly string[]).includes(params.status)) {
    return null;
  }
  const temFollow = Boolean(params.data_followup && String(params.data_followup).trim());
  const temPasso = Boolean(params.proximo_passo && String(params.proximo_passo).trim());
  if (!temFollow && !temPasso) {
    return "Para proposta ou negociação, informe a data de follow-up ou o próximo passo.";
  }
  return null;
}

export function erroColunaFase2(message: string) {
  if (/column|does not exist|schema cache|PGRST204/i.test(message)) {
    return "Rode supabase/comercial_fase2.sql no Supabase para habilitar a classificação da fase 2.";
  }
  return message;
}

export function validarAvancoComercial(
  leadAtual: {
    status?: string | null;
    data_followup?: string | null;
    proximo_passo?: string | null;
  },
  campos: Record<string, unknown>
): string | null {
  const status = (typeof campos.status === "string" ? campos.status : leadAtual.status) || null;
  const follow =
    "data_followup" in campos ? (campos.data_followup as string | null) : leadAtual.data_followup;
  const passo =
    "proximo_passo" in campos ? (campos.proximo_passo as string | null) : leadAtual.proximo_passo;
  return validarProximoPassoProposta({
    status,
    data_followup: follow,
    proximo_passo: passo,
  });
}
