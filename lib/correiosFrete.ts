/**
 * Frete PAC via webservice legado dos Correios (sem contrato).
 * CEP origem: system_config.correios_cep_origem ou CORREIOS_CEP_ORIGEM.
 */

const PAC_CODIGOS = ["04510", "41106", "03298", "03220"];
const PESO_MIN_KG = 0.1;
const PESO_MAX_KG = 30;
const CUBAGEM_FATOR = 6000;
/** Plano Vercel gratuito: função ~10s — uma requisição multi-serviço por base. */
const REQUEST_TIMEOUT_MS = 8_000;

const BASES_CORREIOS = [
  () => (process.env.CORREIOS_WS_BASE || "https://ws.correios.com.br").replace(/\/$/, ""),
  () => "https://cws.correios.com.br",
];

function onlyDigits(cep: string): string {
  return String(cep || "").replace(/\D/g, "").slice(0, 8);
}

function parseMoedaBr(val: string): number {
  const t = String(val || "").trim();
  if (!t) return NaN;
  if (t.includes(",")) {
    const n = Number(t.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

/** SOAP/ASMX devolve XML escapado dentro de CalcPrecoPrazoResult. */
function normalizarCorpoCorreios(raw: string): string {
  let s = String(raw || "").trim();
  if (!s) return s;

  const soapInner = s.match(/<CalcPrecoPrazoResult[^>]*>([\s\S]*?)<\/CalcPrecoPrazoResult>/i);
  if (soapInner?.[1]) s = soapInner[1];

  if (s.includes("&lt;") || s.includes("&gt;")) {
    s = s
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'");
  }

  return s;
}

export type DimensaoCm = { comprimento: number; largura: number; altura: number };

function pesoCubicoKg(dim: DimensaoCm): number {
  const c = Math.max(1, dim.comprimento);
  const l = Math.max(1, dim.largura);
  const a = Math.max(1, dim.altura);
  return (c * l * a) / CUBAGEM_FATOR;
}

export function pesoTotalGramasItens(
  productRows: { id: string; peso_gramas: number | null }[],
  items: { id: string; quantity: number }[],
  pesoPadraoGramas: number
): number {
  const byId = new Map(productRows.map((p) => [p.id, p.peso_gramas]));
  let g = 0;
  for (const it of items) {
    const q = Math.max(1, Number(it.quantity) || 1);
    const pg = byId.get(it.id);
    const unit = pg != null && Number(pg) > 0 ? Number(pg) : pesoPadraoGramas;
    g += unit * q;
  }
  return Math.max(100, Math.round(g));
}

export function dimensoesParaCarrinho(
  base: DimensaoCm,
  items: { quantity?: number }[]
): DimensaoCm {
  const q = items.reduce((s, it) => s + Math.max(1, Number(it.quantity) || 1), 0);
  const fator = Math.min(6, Math.max(1, Math.ceil(q / 2)));
  return {
    comprimento: base.comprimento,
    largura: base.largura,
    altura: Math.min(60, Math.max(base.altura, base.altura * fator)),
  };
}

export type ResultadoCorreios = {
  ok: true;
  valor: number;
  prazoEntrega: number;
  servico: string;
  estimado?: boolean;
};

export type ErroCorreios = { ok: false; mensagem: string };

function extrairBlocosServico(xml: string): string[] {
  const blocos: string[] = [];
  const re = /<cServico\b[^>]*>[\s\S]*?<\/cServico>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) blocos.push(m[0]);
  return blocos;
}

function parseBlocoServico(
  bloco: string,
  codigosAceitos: Set<string>
): { tipo: "ok"; r: ResultadoCorreios } | { tipo: "erro"; msg: string } | null {
  const cod = bloco.match(/<Codigo>\s*([^<]+)\s*<\/Codigo>/i)?.[1]?.trim() ?? "";
  if (!codigosAceitos.has(cod)) return null;

  const err = bloco.match(/<Erro>\s*([^<]+)\s*<\/Erro>/i)?.[1]?.trim() ?? "0";
  if (err !== "0" && err !== "") {
    const msg = bloco.match(/<MsgErro>([^<]*)<\/MsgErro>/i)?.[1]?.trim() || "Erro ao calcular frete.";
    return { tipo: "erro", msg };
  }

  const valStr = bloco.match(/<Valor>\s*([^<]+)\s*<\/Valor>/i)?.[1] ?? "";
  const prazoStr = bloco.match(/<PrazoEntrega>\s*([^<]+)\s*<\/PrazoEntrega>/i)?.[1] ?? "0";
  const valor = parseMoedaBr(valStr);
  const prazoEntrega = parseInt(prazoStr, 10) || 0;
  if (!Number.isFinite(valor) || valor < 0) return null;
  return { tipo: "ok", r: { ok: true, valor, prazoEntrega, servico: cod } };
}

function parseRespostaCorreios(xmlRaw: string, codigos: string[]): ResultadoCorreios | ErroCorreios | null {
  const xml = normalizarCorpoCorreios(xmlRaw);
  if (!xml) return null;

  const codigosAceitos = new Set(codigos);
  const blocos = extrairBlocosServico(xml);
  let ultimoErro: string | null = null;

  for (const bloco of blocos) {
    const p = parseBlocoServico(bloco, codigosAceitos);
    if (p?.tipo === "ok") return p.r;
    if (p?.tipo === "erro") ultimoErro = p.msg;
  }

  if (ultimoErro) return { ok: false, mensagem: ultimoErro };

  const anyErr = xml.match(/<MsgErro>([^<]*)<\/MsgErro>/i)?.[1]?.trim();
  if (anyErr) return { ok: false, mensagem: anyErr };

  return null;
}

async function chamarCorreiosMulti(
  base: string,
  servicos: string[],
  opts: {
    cepOrigem: string;
    cepDestino: string;
    pesoGramas: number;
    dim: DimensaoCm;
    timeoutMs?: number;
  }
): Promise<ResultadoCorreios | ErroCorreios> {
  const o = onlyDigits(opts.cepOrigem);
  const d = onlyDigits(opts.cepDestino);
  const pesoFisicoKg = Math.min(PESO_MAX_KG, Math.max(PESO_MIN_KG, opts.pesoGramas / 1000));
  const pCub = pesoCubicoKg(opts.dim);
  const nVlPeso = Math.min(PESO_MAX_KG, Math.max(PESO_MIN_KG, Math.max(pesoFisicoKg, pCub)));

  const params = new URLSearchParams({
    nCdEmpresa: "",
    sDsSenha: "",
    nCdServico: servicos.join(","),
    sCepOrigem: o,
    sCepDestino: d,
    nVlPeso: nVlPeso.toFixed(2).replace(",", "."),
    nCdFormato: "1",
    nVlComprimento: String(opts.dim.comprimento),
    nVlAltura: String(opts.dim.altura),
    nVlLargura: String(opts.dim.largura),
    nVlDiametro: "0",
    sCdMaoPropria: "N",
    nVlValorDeclarado: "0",
    sCdAvisoRecebimento: "N",
    StrRetorno: "xml",
  });

  const url = `${base}/calculador/CalcPrecoPrazo.asmx/CalcPrecoPrazo?${params.toString()}`;
  const ac = new AbortController();
  const ms = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timer = setTimeout(() => ac.abort(), ms);

  try {
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: ac.signal,
      headers: {
        Accept: "text/xml, application/xml, */*",
        "User-Agent": "MascPRO/1.0 (+frete)",
      },
    });
    const body = await res.text();
    if (!res.ok) {
      return { ok: false, mensagem: `Correios HTTP ${res.status}.` };
    }

    const parsed = parseRespostaCorreios(body, servicos);
    if (parsed) return parsed;

    const snippet = body.replace(/\s+/g, " ").slice(0, 120);
    const pareceHtml = /<html/i.test(body);
    return {
      ok: false,
      mensagem: pareceHtml
        ? "Correios retornou página de erro (serviço instável). Tente de novo em instantes."
        : `Resposta inesperada dos Correios${snippet ? `: ${snippet}` : "."}`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha de rede";
    const timeout = /abort|timeout/i.test(msg);
    return {
      ok: false,
      mensagem: timeout ? "Correios demorou para responder." : `Falha ao consultar Correios: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Estimativa quando o webservice público falha (comum em Vercel + CEPs fora de SP).
 * Baseada na diferença da região do CEP (1º dígito) e peso.
 */
export function fretePacEstimado(opts: {
  cepOrigem: string;
  cepDestino: string;
  pesoGramas: number;
  valorBaseConfig?: number;
}): ResultadoCorreios {
  const o = onlyDigits(opts.cepOrigem);
  const d = onlyDigits(opts.cepDestino);
  const regO = parseInt(o.charAt(0) || "0", 10);
  const regD = parseInt(d.charAt(0) || "0", 10);
  const diff = Math.abs(regD - regO);
  const pesoKg = Math.max(PESO_MIN_KG, opts.pesoGramas / 1000);
  const extraPeso = Math.max(0, (pesoKg - 0.5) * 5);

  const baseFixo =
    opts.valorBaseConfig != null && opts.valorBaseConfig > 0 ? opts.valorBaseConfig : 22;
  const valor = Number((baseFixo + diff * 6 + extraPeso).toFixed(2));
  const prazoEntrega = Math.min(20, 5 + diff * 2 + Math.ceil(extraPeso));

  return {
    ok: true,
    valor: Math.max(15, valor),
    prazoEntrega,
    servico: "ESTIMADO",
    estimado: true,
  };
}

export async function calcularFretePAC(opts: {
  cepOrigem: string;
  cepDestino: string;
  pesoGramas: number;
  dim: DimensaoCm;
  nCdServico?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** Se true, usa tabela estimada quando o webservice falhar. */
  permitirEstimativa?: boolean;
  valorEstimativaBase?: number;
}): Promise<ResultadoCorreios | ErroCorreios> {
  const o = onlyDigits(opts.cepOrigem);
  const d = onlyDigits(opts.cepDestino);
  if (o.length !== 8 || d.length !== 8) {
    return { ok: false, mensagem: "CEP de origem ou destino inválido." };
  }

  const principal = opts.nCdServico || process.env.CORREIOS_NCD_SERVICO || PAC_CODIGOS[0];
  const servicos = [...new Set([principal, ...PAC_CODIGOS])];

  const payload = {
    cepOrigem: o,
    cepDestino: d,
    pesoGramas: opts.pesoGramas,
    dim: opts.dim,
    timeoutMs: opts.timeoutMs,
  };

  if (opts.signal?.aborted) {
    return { ok: false, mensagem: "Consulta de frete cancelada." };
  }

  let ultimoErro: ErroCorreios = { ok: false, mensagem: "Correios indisponível. Tente novamente." };

  for (const baseFn of BASES_CORREIOS) {
    const base = baseFn();
    if (!base) continue;
    const r = await chamarCorreiosMulti(base, servicos, payload);
    if (r.ok) return r;
    ultimoErro = r;
  }

  if (opts.permitirEstimativa) {
    return fretePacEstimado({
      cepOrigem: o,
      cepDestino: d,
      pesoGramas: opts.pesoGramas,
      valorBaseConfig: opts.valorEstimativaBase,
    });
  }

  return ultimoErro;
}

export function getDimensoesPadraoEm(): DimensaoCm {
  return {
    comprimento: Number(process.env.CORREIOS_CAIXA_CM_COMPRIMENTO) || 20,
    largura: Number(process.env.CORREIOS_CAIXA_CM_LARGURA) || 15,
    altura: Number(process.env.CORREIOS_CAIXA_CM_ALTURA) || 10,
  };
}

export function getPesoEmbalagemGramas(): number {
  const n = Number(process.env.CORREIOS_PESO_EMBALAGEM_G);
  return Number.isFinite(n) && n >= 0 ? n : 100;
}

export function getPesoDefaultProdutoGramas(): number {
  const n = Number(process.env.CORREIOS_PESO_DEFAULT_PRODUTO_G);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 500;
}
