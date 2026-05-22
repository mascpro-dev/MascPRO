/**
 * Cálculo de frete PAC (sem contrato) via webservice legado dos Correios.
 * Requer CEP de origem (loja) em process.env.CORREIOS_CEP_ORIGEM ou system_config.
 */

const PAC_PADRAO = "04510";
const PAC_ALT = "41106";
const PESO_MIN_KG = 0.1;
const PESO_MAX_KG = 30;
const CUBAGEM_FATOR = 6000;
/** Por tentativa — várias em paralelo; total deve caber no limite da Vercel (~10–60s). */
const REQUEST_TIMEOUT_MS = 9_000;

const BASES_CORREIOS = [
  () => (process.env.CORREIOS_WS_BASE || "https://ws.correios.com.br").replace(/\/$/, ""),
  () => "https://cws.correios.com.br",
];

function onlyDigits(cep: string): string {
  return String(cep || "").replace(/\D/g, "").slice(0, 8);
}

/** Valor no XML dos Correios: "45,90" ou "1.234,56" */
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
};

export type ErroCorreios = { ok: false; mensagem: string };

function extrairDeServico(
  xml: string,
  codigoAlvo: string
): { tipo: "ok"; r: ResultadoCorreios } | { tipo: "erro"; msg: string } | null {
  const reBloco = /<cServico>[\s\S]*?<\/cServico>/gi;
  let m: RegExpExecArray | null;
  while ((m = reBloco.exec(xml)) !== null) {
    const bloco = m[0];
    const cod = bloco.match(/<Codigo>([^<]+)<\/Codigo>/i)?.[1]?.trim() ?? "";
    if (cod !== codigoAlvo) continue;
    const err = bloco.match(/<Erro>([^<]+)<\/Erro>/i)?.[1]?.trim() ?? "0";
    if (err !== "0" && err !== "") {
      const msg = bloco.match(/<MsgErro>([^<]*)<\/MsgErro>/i)?.[1]?.trim() || "Erro ao calcular frete.";
      return { tipo: "erro", msg };
    }
    const valStr = bloco.match(/<Valor>([^<]+)<\/Valor>/i)?.[1] ?? "";
    const prazoStr = bloco.match(/<PrazoEntrega>([^<]+)<\/PrazoEntrega>/i)?.[1] ?? "0";
    const valor = parseMoedaBr(valStr);
    const prazoEntrega = parseInt(prazoStr, 10) || 0;
    if (!Number.isFinite(valor)) return null;
    return { tipo: "ok", r: { ok: true, valor, prazoEntrega, servico: codigoAlvo } };
  }
  return null;
}

async function chamarCorreiosUmaVez(
  base: string,
  servico: string,
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
    nCdServico: servico,
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
      headers: { Accept: "text/xml, application/xml, */*" },
    });
    if (!res.ok) {
      return { ok: false, mensagem: `Correios HTTP ${res.status}.` };
    }
    const xml = await res.text();
    if (!xml.includes("<cServico")) {
      return { ok: false, mensagem: "Resposta inesperada dos Correios." };
    }
    const parsed = extrairDeServico(xml, servico);
    if (parsed?.tipo === "ok") return parsed.r;
    if (parsed?.tipo === "erro") return { ok: false, mensagem: parsed.msg };
    const anyErr = xml.match(/<MsgErro>([^<]*)<\/MsgErro>/i)?.[1]?.trim();
    return { ok: false, mensagem: anyErr || "Valor de frete não encontrado na resposta." };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha de rede";
    const timeout = /abort|timeout/i.test(msg);
    return {
      ok: false,
      mensagem: timeout
        ? "Correios demorou para responder."
        : `Falha ao consultar Correios: ${msg}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta Correios em paralelo (várias URLs + códigos PAC) — mais rápido na Vercel.
 */
export async function calcularFretePAC(opts: {
  cepOrigem: string;
  cepDestino: string;
  pesoGramas: number;
  dim: DimensaoCm;
  nCdServico?: string;
  signal?: AbortSignal;
  /** Checkout: timeout menor — usa frete do carrinho se falhar. */
  timeoutMs?: number;
}): Promise<ResultadoCorreios | ErroCorreios> {
  const o = onlyDigits(opts.cepOrigem);
  const d = onlyDigits(opts.cepDestino);
  if (o.length !== 8 || d.length !== 8) {
    return { ok: false, mensagem: "CEP de origem ou destino inválido." };
  }

  const principal = opts.nCdServico || process.env.CORREIOS_NCD_SERVICO || PAC_PADRAO;
  const servicos = [...new Set([principal, PAC_ALT])];
  const bases = [...new Set(BASES_CORREIOS.map((fn) => fn()).filter(Boolean))];

  const payload = {
    cepOrigem: o,
    cepDestino: d,
    pesoGramas: opts.pesoGramas,
    dim: opts.dim,
  };

  const tarefas = bases.flatMap((base) =>
    servicos.map((servico) =>
      chamarCorreiosUmaVez(base, servico, { ...payload, timeoutMs: opts.timeoutMs })
    )
  );

  if (opts.signal?.aborted) {
    return { ok: false, mensagem: "Consulta de frete cancelada." };
  }

  const todos = await Promise.allSettled(tarefas);
  let ultimoErro: ErroCorreios = { ok: false, mensagem: "Correios indisponível. Tente novamente em instantes." };

  for (const t of todos) {
    if (t.status === "fulfilled" && t.value.ok) return t.value;
  }
  for (const t of todos) {
    if (t.status === "fulfilled" && !t.value.ok) ultimoErro = t.value;
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
