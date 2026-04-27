export type ProfileProFields = {
  personal_coins?: number | null;
  network_coins?: number | null;
  total_compras_proprias?: number | null;
  total_compras_rede?: number | null;
  pro_total?: number | null;
};

export function toNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function getProBreakdown(profile: ProfileProFields) {
  const pessoal = toNumber(profile.personal_coins);
  const redeIndicacao = toNumber(profile.network_coins);
  const comprasProprias = toNumber(profile.total_compras_proprias);
  const comprasIndicados = toNumber(profile.total_compras_rede);
  const total = pessoal + redeIndicacao + comprasProprias + comprasIndicados;

  return {
    total,
    pessoal,
    redeIndicacao,
    comprasProprias,
    comprasIndicados,
  };
}

