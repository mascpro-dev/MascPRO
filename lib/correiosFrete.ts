/**
 * Cálculo de frete PAC (sem contrato) via webservice legado dos Correios.
 * Requer CEP de origem (loja) em process.env.CORREIOS_CEP_ORIGEM.
 */

const PAC_PADRAO = "04510";
const PESO_MIN_KG = 0.1;
const PESO_MAX_KG = 30;
const CUBAGEM_FATOR = 6000; // (cm): peso cubico kg = (C×L×A) / 6000

function onlyDigits(cep: string): string {
  return String(cep || "").replace(/\D/g, "").slice(0, 8);
}

function parseMoedaBr(val: string): number {
  const t = val.trim().replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

export type DimensaoCm = { comprimento: number; largura: number; altura: number };

function pesoCubicoKg(dim: DimensaoCm): number {
  const c = Math.max(1, dim.comprimento);
  const l = Math.max(1, dim.largura);
  const a = Math.max(1, dim.altura);
  return (c * l * a) / CUBAGEM_FATOR;
}

/**
 * Soma o peso em gramas dos itens; produtos sem peso usam `pesoPadraoGramas` (ex.: 500g).
 */
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
  return Math.max(1, Math.round(g));
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

/**
 * Chama o webservice HTTP dos Correios (CalcPrecoPrazo).
 */
export async function calcularFretePAC(opts: {
  cepOrigem: string;
  cepDestino: string;
  pesoGramas: number;
  dim: DimensaoCm;
  nCdServico?: string;
  signal?: AbortSignal;
}): Promise<ResultadoCorreios | ErroCorreios> {
  const o = onlyDigits(opts.cepOrigem);
  const d = onlyDigits(opts.cepDestino);
  if (o.length !== 8 || d.length !== 8) {
    return { ok: false, mensagem: "CEP de origem ou destino inválido." };
  }

  const pesoFisicoKg = Math.min(PESO_MAX_KG, Math.max(PESO_MIN_KG, opts.pesoGramas / 1000));
  const pCub = pesoCubicoKg(opts.dim);
  const nVlPeso = Math.min(PESO_MAX_KG, Math.max(PESO_MIN_KG, Math.max(pesoFisicoKg, pCub)));
  const nCdServico = opts.nCdServico || process.env.CORREIOS_NCD_SERVICO || PAC_PADRAO;

  const chamar = async (servico: string) => {
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

    const base = (process.env.CORREIOS_WS_BASE || "https://ws.correios.com.br").replace(/\/$/, "");
    const url = `${base}/calculador/CalcPrecoPrazo.asmx/CalcPrecoPrazo?${params.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: opts.signal,
    });
    if (!res.ok) {
      return { ok: false, mensagem: `Correios retornou HTTP ${res.status}.` } as ErroCorreios;
    }
    const xml = await res.text();
    if (!xml.includes("<cServico")) {
      return { ok: false, mensagem: "Resposta inesperada dos Correios." } as ErroCorreios;
    }
    const parsed = extrairDeServico(xml, servico);
    if (parsed?.tipo === "ok") return parsed.r;
    if (parsed?.tipo === "erro") return { ok: false, mensagem: parsed.msg } as ErroCorreios;
    const anyErr = xml.match(/<MsgErro>([^<]*)<\/MsgErro>/i)?.[1]?.trim();
    return { ok: false, mensagem: anyErr || "Não foi possível obter o valor do frete." } as ErroCorreios;
  };

  let res: Awaited<ReturnType<typeof chamar>>;
  try {
    res = await chamar(nCdServico);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha de rede ao consultar Correios.";
    return { ok: false, mensagem: msg };
  }

  if (res.ok) return res;

  if (nCdServico === PAC_PADRAO) {
    try {
      return await chamar("41106");
    } catch (e2: unknown) {
      return res;
    }
  }

  return res;
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
