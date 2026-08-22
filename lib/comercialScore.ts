import type { SemaforoComercial } from "@/lib/comercialMetricas";

export const PAPEIS_SCORE = ["embaixadora", "distribuidor"] as const;
export type PapelScore = (typeof PAPEIS_SCORE)[number];

export const PERIODO_RE = /^\d{4}-\d{2}$/;

export type FontePilar = "derivado" | "manual";

export type PilarScore = {
  key: string;
  label: string;
  pontos: number;
  max: number;
  fonte: FontePilar;
  detalhe: string;
};

export type ManualScore = {
  prova: number | null;
  conteudo: number | null;
  treino: number | null;
  postura: number | null;
  saloes_prospectados: number;
  saloes_ativados: number;
  relatorio_ok: boolean;
  politica_ok: boolean;
  exclusividade: number | null;
  notas: string | null;
};

export const MANUAL_VAZIO: ManualScore = {
  prova: null,
  conteudo: null,
  treino: null,
  postura: null,
  saloes_prospectados: 0,
  saloes_ativados: 0,
  relatorio_ok: false,
  politica_ok: false,
  exclusividade: null,
  notas: null,
};

export const PESOS_EMBAIXADORA = {
  venda: 20,
  home_care: 20,
  prova: 20,
  conteudo: 20,
  treino: 10,
  postura: 10,
} as const;

export const PESOS_DISTRIBUIDOR = {
  venda: 25,
  equipe: 15,
  visitas: 15,
  saloes: 20,
  exclusividade: 15,
  disciplina: 10,
} as const;

export const DEFINICOES_FASE4 = [
  {
    termo: "Score comercial",
    texto: "Nota 0–100 do ciclo. Não é o nível Certified/Expert/Master/Educador e não é o ranking PRO da comunidade.",
  },
  {
    termo: "Nível de embaixadora",
    texto: "Continua sendo quantidade de indicados. Este painel só lê. Nunca grava nivel_embaixador.",
  },
  {
    termo: "Embaixadora ativa",
    texto: "No mês: 1 venda da rede, ou prova > 0, ou conteúdo > 0. Comprar no mês (/admin/ativos) não conta.",
  },
  {
    termo: "Venda da rede",
    texto: "Pedido pago de indicado direto ou de lead que ela/ele atende. Compra própria não entra. Cada pedido uma vez.",
  },
  {
    termo: "Home care no score",
    texto: "Kit marcado à mão entre os pedidos da rede. Pedido comum não pontua aqui.",
  },
  {
    termo: "Prova / conteúdo / treino / postura",
    texto: "Prova catalogada (fase 5) pontua sozinha. Sem ela, vale a nota manual. Post da comunidade só é pista.",
  },
  {
    termo: "Distribuidor",
    texto: "Venda da rede + 2º nível dos vendedores, equipe, visitas, salões, exclusividade e relatório/política.",
  },
];

export function parsePeriodoScore(v: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = String(v || "").trim();
  if (!PERIODO_RE.test(s)) return { ok: false, error: "Período inválido. Use YYYY-MM." };
  const month = Number(s.slice(5, 7));
  if (month < 1 || month > 12) return { ok: false, error: "Mês inválido." };
  return { ok: true, value: s };
}

export function parsePapelScore(v: unknown): { ok: true; value: PapelScore } | { ok: false; error: string } {
  const s = String(v || "").trim();
  if (PAPEIS_SCORE.includes(s as PapelScore)) return { ok: true, value: s as PapelScore };
  return { ok: false, error: "Papel inválido." };
}

function inteiroNoIntervalo(v: unknown, max: number, nome: string) {
  if (v == null || v === "") return { ok: true as const, value: null };
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > max) {
    return { ok: false as const, error: `${nome} deve ser inteiro de 0 a ${max}.` };
  }
  return { ok: true as const, value: n };
}

function inteiroNaoNegativo(v: unknown, nome: string) {
  const n = Number(v);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    return { ok: false as const, error: `${nome} deve ser um inteiro ≥ 0.` };
  }
  return { ok: true as const, value: n };
}

export function parseManualScore(body: Record<string, unknown>): { ok: true; value: ManualScore } | { ok: false; error: string } {
  const prova = inteiroNoIntervalo(body.prova, PESOS_EMBAIXADORA.prova, "Prova");
  if (!prova.ok) return prova;
  const conteudo = inteiroNoIntervalo(body.conteudo, PESOS_EMBAIXADORA.conteudo, "Conteúdo");
  if (!conteudo.ok) return conteudo;
  const treino = inteiroNoIntervalo(body.treino, PESOS_EMBAIXADORA.treino, "Treino");
  if (!treino.ok) return treino;
  const postura = inteiroNoIntervalo(body.postura, PESOS_EMBAIXADORA.postura, "Postura");
  if (!postura.ok) return postura;
  const exclusividade = inteiroNoIntervalo(body.exclusividade, PESOS_DISTRIBUIDOR.exclusividade, "Exclusividade");
  if (!exclusividade.ok) return exclusividade;

  let saloes_prospectados = 0;
  if (body.saloes_prospectados != null && body.saloes_prospectados !== "") {
    const p = inteiroNaoNegativo(body.saloes_prospectados, "Salões prospectados");
    if (!p.ok) return p;
    saloes_prospectados = p.value;
  }
  let saloes_ativados = 0;
  if (body.saloes_ativados != null && body.saloes_ativados !== "") {
    const a = inteiroNaoNegativo(body.saloes_ativados, "Salões ativados");
    if (!a.ok) return a;
    saloes_ativados = a.value;
  }

  return {
    ok: true,
    value: {
      prova: prova.value,
      conteudo: conteudo.value,
      treino: treino.value,
      postura: postura.value,
      saloes_prospectados,
      saloes_ativados,
      relatorio_ok: Boolean(body.relatorio_ok),
      politica_ok: Boolean(body.politica_ok),
      exclusividade: exclusividade.value,
      notas: body.notas == null || body.notas === "" ? null : String(body.notas).slice(0, 2000),
    },
  };
}

export function erroColunaFase4(message: string) {
  if (/column|does not exist|schema cache|PGRST204|comercial_score/i.test(message)) {
    return "Rode supabase/comercial_fase4.sql no Supabase para habilitar o score da rede.";
  }
  return message;
}

export function pontosVenda(pedidos: number, max: number) {
  if (pedidos <= 0) return 0;
  if (pedidos === 1) return Math.min(max, Math.round(max * 0.4));
  if (pedidos <= 3) return Math.min(max, Math.round(max * 0.7));
  if (pedidos <= 6) return Math.min(max, Math.round(max * 0.9));
  return max;
}

export function pontosHomeCare(kits: number, max = PESOS_EMBAIXADORA.home_care) {
  if (kits <= 0) return 0;
  if (kits === 1) return 10;
  if (kits === 2) return 16;
  return max;
}

export function pontosEquipe(vendedores: number, ativos: number, max = PESOS_DISTRIBUIDOR.equipe) {
  if (vendedores <= 0) return 0;
  return Math.min(max, Math.min(8, vendedores * 3) + Math.min(7, ativos * 4));
}

export function pontosVisitas(visitas: number, max = PESOS_DISTRIBUIDOR.visitas) {
  if (visitas <= 0) return 0;
  if (visitas <= 2) return 6;
  if (visitas <= 5) return 10;
  if (visitas <= 10) return 13;
  return max;
}

export function pontosSaloes(prospectados: number, ativados: number, max = PESOS_DISTRIBUIDOR.saloes) {
  return Math.min(max, ativados * 8 + prospectados * 2);
}

export function pontosDisciplina(relatorio: boolean, politica: boolean) {
  return (relatorio ? 5 : 0) + (politica ? 5 : 0);
}

export function semaforoScore(total: number): SemaforoComercial {
  if (total >= 70) return "ok";
  if (total >= 40) return "atencao";
  return "risco";
}

export function embaixadoraAtiva(params: {
  pedidosRede: number;
  prova: number | null;
  conteudo: number | null;
  provasCatalogo?: number;
}) {
  return (
    params.pedidosRede > 0 ||
    Number(params.prova || 0) > 0 ||
    Number(params.conteudo || 0) > 0 ||
    Number(params.provasCatalogo || 0) > 0
  );
}

export function pontosProvaNoScore(catalogadas: number, notaManual: number | null, max = PESOS_EMBAIXADORA.prova) {
  const derivado = catalogadas <= 0 ? 0 : catalogadas === 1 ? 10 : catalogadas === 2 ? 16 : max;
  return Math.max(derivado, Number(notaManual || 0));
}

export function montarScoreEmbaixadora(params: {
  pedidosRede: number;
  receitaRede: number;
  kitsRede: number;
  compraPropria: number;
  leadsMes: number;
  postsComunidade: number;
  provasCatalogo?: number;
  manual: ManualScore;
}) {
  const m = params.manual;
  const provasCat = Number(params.provasCatalogo || 0);
  const pontosProva = pontosProvaNoScore(provasCat, m.prova);
  const pilares: PilarScore[] = [
    {
      key: "venda",
      label: "Venda",
      pontos: pontosVenda(params.pedidosRede, PESOS_EMBAIXADORA.venda),
      max: PESOS_EMBAIXADORA.venda,
      fonte: "derivado",
      detalhe:
        params.pedidosRede > 0
          ? `${params.pedidosRede} pedido(s) da rede · ${params.receitaRede.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`
          : params.compraPropria > 0
            ? "Só compra própria neste mês — não pontua como venda"
            : "Nenhum pedido da rede neste mês",
    },
    {
      key: "home_care",
      label: "Home care",
      pontos: pontosHomeCare(params.kitsRede),
      max: PESOS_EMBAIXADORA.home_care,
      fonte: "derivado",
      detalhe: params.kitsRede > 0 ? `${params.kitsRede} kit(s) na rede` : "Nenhum kit marcado na rede",
    },
    {
      key: "prova",
      label: "Prova",
      pontos: pontosProva,
      max: PESOS_EMBAIXADORA.prova,
      fonte: provasCat > 0 ? "derivado" : "manual",
      detalhe:
        provasCat > 0
          ? `${provasCat} prova(s) no banco`
          : m.prova == null
            ? "Sem prova catalogada nem nota"
            : `Nota manual ${m.prova}/${PESOS_EMBAIXADORA.prova}`,
    },
    {
      key: "conteudo",
      label: "Conteúdo",
      pontos: Number(m.conteudo || 0),
      max: PESOS_EMBAIXADORA.conteudo,
      fonte: "manual",
      detalhe:
        m.conteudo == null
          ? params.postsComunidade > 0
            ? `Sem nota · ${params.postsComunidade} post(s) na comunidade (pista, não pontua)`
            : "Sem nota no mês"
          : `Nota ${m.conteudo}/${PESOS_EMBAIXADORA.conteudo}`,
    },
    {
      key: "treino",
      label: "Treino",
      pontos: Number(m.treino || 0),
      max: PESOS_EMBAIXADORA.treino,
      fonte: "manual",
      detalhe: m.treino == null ? "Sem nota no mês" : `Nota ${m.treino}/${PESOS_EMBAIXADORA.treino}`,
    },
    {
      key: "postura",
      label: "Postura",
      pontos: Number(m.postura || 0),
      max: PESOS_EMBAIXADORA.postura,
      fonte: "manual",
      detalhe: m.postura == null ? "Sem nota no mês" : `Nota ${m.postura}/${PESOS_EMBAIXADORA.postura}`,
    },
  ];
  const total = pilares.reduce((s, p) => s + p.pontos, 0);
  const manuaisVazios = pilares.filter((p) => p.fonte === "manual" && /Sem nota/.test(p.detalhe)).length;
  return {
    total,
    max: 100,
    pilares,
    ativa: embaixadoraAtiva({
      pedidosRede: params.pedidosRede,
      prova: m.prova,
      conteudo: m.conteudo,
      provasCatalogo: provasCat,
    }),
    status: semaforoScore(total),
    manuaisVazios,
    extra: {
      leadsMes: params.leadsMes,
      postsComunidade: params.postsComunidade,
      compraPropria: params.compraPropria,
      provasCatalogo: provasCat,
    },
  };
}

export function montarScoreDistribuidor(params: {
  pedidosRede: number;
  receitaRede: number;
  kitsRede: number;
  vendedores: number;
  vendedoresAtivos: number;
  visitas: number;
  leadsMes: number;
  manual: ManualScore;
}) {
  const m = params.manual;
  const pilares: PilarScore[] = [
    {
      key: "venda",
      label: "Venda",
      pontos: pontosVenda(params.pedidosRede, PESOS_DISTRIBUIDOR.venda),
      max: PESOS_DISTRIBUIDOR.venda,
      fonte: "derivado",
      detalhe:
        params.pedidosRede > 0
          ? `${params.pedidosRede} pedido(s) · ${params.receitaRede.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}`
          : "Nenhum pedido da rede neste mês",
    },
    {
      key: "equipe",
      label: "Equipe",
      pontos: pontosEquipe(params.vendedores, params.vendedoresAtivos),
      max: PESOS_DISTRIBUIDOR.equipe,
      fonte: "derivado",
      detalhe: `${params.vendedores} vendedor(es) · ${params.vendedoresAtivos} ativo(s) no mês`,
    },
    {
      key: "visitas",
      label: "Visitas",
      pontos: pontosVisitas(params.visitas),
      max: PESOS_DISTRIBUIDOR.visitas,
      fonte: "derivado",
      detalhe: params.visitas > 0 ? `${params.visitas} visita(s) no mês` : "Nenhuma visita registrada",
    },
    {
      key: "saloes",
      label: "Salões",
      pontos: pontosSaloes(m.saloes_prospectados, m.saloes_ativados),
      max: PESOS_DISTRIBUIDOR.saloes,
      fonte: "manual",
      detalhe: `${m.saloes_ativados} ativado(s) · ${m.saloes_prospectados} prospectado(s)`,
    },
    {
      key: "exclusividade",
      label: "Exclusividade",
      pontos: Number(m.exclusividade || 0),
      max: PESOS_DISTRIBUIDOR.exclusividade,
      fonte: "manual",
      detalhe: m.exclusividade == null ? "Sem nota no mês" : `Nota ${m.exclusividade}/${PESOS_DISTRIBUIDOR.exclusividade}`,
    },
    {
      key: "disciplina",
      label: "Relatório / política",
      pontos: pontosDisciplina(m.relatorio_ok, m.politica_ok),
      max: PESOS_DISTRIBUIDOR.disciplina,
      fonte: "manual",
      detalhe: `${m.relatorio_ok ? "Relatório ok" : "Sem relatório"} · ${m.politica_ok ? "política ok" : "sem política"}`,
    },
  ];
  const total = pilares.reduce((s, p) => s + p.pontos, 0);
  return {
    total,
    max: 100,
    pilares,
    ativa: params.pedidosRede > 0 || m.saloes_ativados > 0 || params.visitas > 0,
    status: semaforoScore(total),
    manuaisVazios: [m.exclusividade == null, !m.relatorio_ok && !m.politica_ok && m.saloes_ativados === 0 && m.saloes_prospectados === 0].filter(Boolean).length,
    extra: {
      leadsMes: params.leadsMes,
      kitsRede: params.kitsRede,
    },
  };
}
