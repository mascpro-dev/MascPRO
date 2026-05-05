import { createClient } from "@supabase/supabase-js";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

const DEFAULTS: Record<string, string> = {
  frete_gratis_acima:  "1500",
  percentual_comissao: "15",
  percentual_comissao_cabeleireiro: "15",
  correios_cep_origem: "",
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

/** Lê uma chave e retorna como número. */
export async function getConfigNum(chave: string): Promise<number> {
  const v = await getConfig(chave);
  return Number(v) || Number(DEFAULTS[chave] || 0);
}
