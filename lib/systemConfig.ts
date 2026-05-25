import { createClient } from "@supabase/supabase-js";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

const DEFAULTS: Record<string, string> = {
  frete_gratis_acima:  "1500",
  percentual_comissao: "15",
  percentual_comissao_cabeleireiro: "5",
  correios_cep_origem: "",
  frete_pac_usar_estimativa: "true",
  frete_pac_fallback_base: "0",
  frete_fixo_valor: "0",
  taxa_saque:          "11",
  estoque_alerta_min:  "5",
  dias_cliente_risco:  "30",
};

/** Lê uma chave da tabela system_config. Retorna o default se não encontrar. */
export async function getConfig(chave: string): Promise<string> {
  try {
    const { data } = await sb()
      .from("system_config")
      .select("valor")
      .eq("chave", chave)
      .maybeSingle();
    return data?.valor ?? DEFAULTS[chave] ?? "";
  } catch {
    return DEFAULTS[chave] ?? "";
  }
}

/** Converte valor salvo (1500, 2.500,00, R$ 2500) para número. */
export function parseConfigNum(raw: string): number {
  const s = String(raw ?? "").trim();
  if (!s) return NaN;
  const cleaned = s.replace(/[^\d,.-]/g, "");
  if (!cleaned) return NaN;
  if (cleaned.includes(",")) {
    const n = Number(cleaned.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    const n = Number(cleaned.replace(/\./g, ""));
    return Number.isFinite(n) ? n : NaN;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Lê uma chave e retorna como número. */
export async function getConfigNum(chave: string): Promise<number> {
  const v = await getConfig(chave);
  const parsed = parseConfigNum(v);
  if (Number.isFinite(parsed)) return parsed;
  return parseConfigNum(DEFAULTS[chave] || "") || 0;
}
