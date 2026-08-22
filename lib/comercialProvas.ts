import { LINHAS_PRODUTO, LINHA_LABEL } from "@/lib/comercialClassificacao";
import { parsePeriodoScore } from "@/lib/comercialScore";

export { LINHAS_PRODUTO, LINHA_LABEL, parsePeriodoScore };

export const DEFINICOES_FASE5 = [
  {
    termo: "Prova catalogada",
    texto: "Só entra no banco com linha, cidade, protocolo e autorização. Sem isso o save é recusado.",
  },
  {
    termo: "Post da comunidade",
    texto: "Pode sugerir uma prova. Não vira prova sozinho e não mistura com o ranking PRO.",
  },
  {
    termo: "Uso comercial",
    texto: "Autorização é o direito. Uso comercial é a decisão de veicular. Os dois são campos diferentes.",
  },
  {
    termo: "Evento",
    texto: "O calendário em /admin/eventos não muda. Aqui entra lead, venda, prova, follow-up e custo × retorno.",
  },
  {
    termo: "Follow-up do evento",
    texto: "Evento com data passada e sem follow-up marcado é vazamento. A agenda sozinha não conta.",
  },
  {
    termo: "ROI",
    texto: "Receita lançada ÷ custo lançado. Sem custo, o retorno não é calculado — não inventa zero.",
  },
];

export function erroColunaFase5(message: string) {
  if (/column|does not exist|schema cache|PGRST204|comercial_provas|comercial_evento_resultado|evento_id/i.test(message)) {
    return "Rode supabase/comercial_fase5.sql no Supabase para habilitar provas e resultado de evento.";
  }
  return message;
}

export function parseLinhaProva(v: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = String(v || "").trim();
  if (LINHAS_PRODUTO.some((l) => l.value === s)) return { ok: true, value: s };
  return { ok: false, error: "Informe a linha da prova." };
}

function textoObrigatorio(v: unknown, nome: string, min = 2) {
  const s = String(v || "").trim();
  if (s.length < min) return { ok: false as const, error: `${nome} é obrigatório.` };
  return { ok: true as const, value: s };
}

function dataYmd(v: unknown, nome: string) {
  const s = String(v || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return { ok: false as const, error: `${nome} inválida.` };
  return { ok: true as const, value: s };
}

function inteiroNaoNegativo(v: unknown, nome: string) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return { ok: false as const, error: `${nome} deve ser ≥ 0.` };
  return { ok: true as const, value: Math.round(n) };
}

function dinheiro(v: unknown, nome: string) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return { ok: false as const, error: `${nome} deve ser ≥ 0.` };
  return { ok: true as const, value: Math.round(n * 100) / 100 };
}

function uuidOpcional(v: unknown) {
  const s = String(v || "").trim();
  if (!s) return null;
  return s;
}

export type ProvaInput = {
  realizado_em: string;
  cliente_nome: string;
  cidade: string;
  estado: string | null;
  linha: string;
  protocolo: string;
  autorizacao: boolean;
  uso_comercial: boolean;
  midia_url: string | null;
  community_post_id: string | null;
  profile_id: string | null;
  event_id: string | null;
  crm_lead_id: string | null;
  notas: string | null;
};

export function parseProvaInput(body: Record<string, unknown>): { ok: true; value: ProvaInput } | { ok: false; error: string } {
  const realizado = dataYmd(body.realizado_em, "Data da prova");
  if (!realizado.ok) return realizado;
  const cliente = textoObrigatorio(body.cliente_nome, "Nome do cliente");
  if (!cliente.ok) return cliente;
  const cidade = textoObrigatorio(body.cidade, "Cidade");
  if (!cidade.ok) return cidade;
  const linha = parseLinhaProva(body.linha);
  if (!linha.ok) return linha;
  const protocolo = textoObrigatorio(body.protocolo, "Protocolo", 3);
  if (!protocolo.ok) return protocolo;
  if (!body.autorizacao) {
    return { ok: false, error: "Toda prova precisa de autorização. Sem isso não cataloga." };
  }
  const estado = String(body.estado || "").trim() || null;
  const midia = String(body.midia_url || "").trim() || null;
  const notas = String(body.notas || "").trim().slice(0, 2000) || null;
  return {
    ok: true,
    value: {
      realizado_em: realizado.value,
      cliente_nome: cliente.value,
      cidade: cidade.value,
      estado,
      linha: linha.value,
      protocolo: protocolo.value,
      autorizacao: true,
      uso_comercial: Boolean(body.uso_comercial),
      midia_url: midia,
      community_post_id: uuidOpcional(body.community_post_id),
      profile_id: uuidOpcional(body.profile_id),
      event_id: uuidOpcional(body.event_id),
      crm_lead_id: uuidOpcional(body.crm_lead_id),
      notas,
    },
  };
}

export type ResultadoEventoInput = {
  leads_gerados: number;
  pedidos: number;
  receita: number;
  custo: number;
  followup_ok: boolean;
  followup_em: string | null;
  notas: string | null;
};

export function parseResultadoEvento(body: Record<string, unknown>): { ok: true; value: ResultadoEventoInput } | { ok: false; error: string } {
  const leads = inteiroNaoNegativo(body.leads_gerados ?? 0, "Leads");
  if (!leads.ok) return leads;
  const pedidos = inteiroNaoNegativo(body.pedidos ?? 0, "Pedidos");
  if (!pedidos.ok) return pedidos;
  const receita = dinheiro(body.receita ?? 0, "Receita");
  if (!receita.ok) return receita;
  const custo = dinheiro(body.custo ?? 0, "Custo");
  if (!custo.ok) return custo;
  let followup_em: string | null = null;
  if (body.followup_em) {
    const d = dataYmd(body.followup_em, "Data do follow-up");
    if (!d.ok) return d;
    followup_em = d.value;
  }
  return {
    ok: true,
    value: {
      leads_gerados: leads.value,
      pedidos: pedidos.value,
      receita: receita.value,
      custo: custo.value,
      followup_ok: Boolean(body.followup_ok),
      followup_em,
      notas: String(body.notas || "").trim().slice(0, 2000) || null,
    },
  };
}

export function roiEvento(receita: number, custo: number): number | null {
  if (custo <= 0) return null;
  return Math.round((receita / custo) * 100) / 100;
}

export function eventoPassou(dataHora: string, agora = new Date()) {
  return new Date(dataHora).getTime() < agora.getTime();
}

export function eventoSemFollowup(dataHora: string, followupOk: boolean, agora = new Date()) {
  return eventoPassou(dataHora, agora) && !followupOk;
}

export function pontosProvaCatalogo(n: number, max = 20) {
  if (n <= 0) return 0;
  if (n === 1) return 10;
  if (n === 2) return 16;
  return max;
}
