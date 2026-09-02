import type { SupabaseClient } from "@supabase/supabase-js";
import { PRO_POR_INDICADO } from "@/lib/networkCoinsIndicacao";
import { getProBreakdown, type ProfileProFields } from "@/lib/proScore";

export type ProfileComIndicados = ProfileProFields & {
  id: string;
  indicado_por?: string | null;
};

export function contarIndicadosDiretos(
  profiles: { id: string; indicado_por?: string | null }[]
): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const p of profiles) {
    if (!p.indicado_por) continue;
    mapa.set(p.indicado_por, (mapa.get(p.indicado_por) || 0) + 1);
  }
  return mapa;
}

export function proIndicacaoEsperado(qtdIndicados: number): number {
  return Math.max(0, qtdIndicados) * PRO_POR_INDICADO;
}

export function enriquecerProRedeMembro(
  membro: ProfileComIndicados,
  qtdIndicados: number
) {
  const proIndicacaoDb = Number(membro.network_coins || 0);
  const proIndicacaoEsperadoVal = proIndicacaoEsperado(qtdIndicados);
  const proIndicacao = Math.max(proIndicacaoDb, proIndicacaoEsperadoVal);
  const proComprasRede = Number(membro.total_compras_rede || 0);
  const proRedeTotal = proIndicacao + proComprasRede;
  const divergenteIndicacao = proIndicacaoDb !== proIndicacaoEsperadoVal;

  return {
    qtd_indicados: qtdIndicados,
    pro_indicacao: proIndicacao,
    pro_compras_rede: proComprasRede,
    pro_rede_total: proRedeTotal,
    pro_indicacao_divergente: divergenteIndicacao,
    pro_indicacao_esperado: proIndicacaoEsperadoVal,
    ...getProBreakdown({
      ...membro,
      network_coins: proIndicacao,
    }),
  };
}

/** Corrige network_coins e pro_total quando não bate com indicados × 50 */
export async function sincronizarNetworkCoinsLote(
  supabase: SupabaseClient,
  profiles: ProfileComIndicados[],
  indicadosCount: Map<string, number>
): Promise<number> {
  let corrigidos = 0;

  for (const p of profiles) {
    const qtd = indicadosCount.get(p.id) || 0;
    const esperado = proIndicacaoEsperado(qtd);
    const atual = Number(p.network_coins || 0);
    if (atual === esperado) continue;

    const proTotal =
      Number(p.personal_coins || 0) +
      esperado +
      Number(p.total_compras_proprias || 0) +
      Number(p.total_compras_rede || 0);

    const { error } = await supabase
      .from("profiles")
      .update({
        network_coins: esperado,
        pro_total: proTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);

    if (!error) {
      p.network_coins = esperado;
      p.pro_total = proTotal;
      corrigidos += 1;
    }
  }

  return corrigidos;
}

export async function sincronizarTotalComprasRedeUsuario(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const STATUS_PAGO = ["paid", "separacao", "despachado", "entregue"];

  const { data: indicados } = await supabase
    .from("profiles")
    .select("id")
    .eq("indicado_por", userId);

  const ids = (indicados || []).map((i) => i.id);
  if (ids.length === 0) return 0;

  const { data: pedidos } = await supabase
    .from("orders")
    .select("total, profile_id, excluir_comissao")
    .in("profile_id", ids)
    .in("status", STATUS_PAGO);

  const novoTotal = (pedidos || [])
    .filter((o) => !o.excluir_comissao)
    .reduce((acc, o) => acc + Math.max(0, Math.round(Number(o.total || 0))), 0);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("network_coins, personal_coins, total_compras_proprias, total_compras_rede")
    .eq("id", userId)
    .maybeSingle();

  if (!perfil) return 0;
  if (Number(perfil.total_compras_rede || 0) === novoTotal) return novoTotal;

  const networkCoins = Number(perfil.network_coins || 0);
  const proTotal =
    Number(perfil.personal_coins || 0) +
    networkCoins +
    Number(perfil.total_compras_proprias || 0) +
    novoTotal;

  await supabase
    .from("profiles")
    .update({
      total_compras_rede: novoTotal,
      pro_total: proTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return novoTotal;
}
