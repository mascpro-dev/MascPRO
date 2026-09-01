/** Lê cidade/UF unificando colunas legadas (city/state e municipio/uf). */
export function lerCidadeEstado(profile: {
  city?: string | null;
  state?: string | null;
  municipio?: string | null;
  uf?: string | null;
}): { city: string; state: string } {
  const city = String(profile.city || profile.municipio || "").trim();
  const state = String(profile.state || profile.uf || "")
    .trim()
    .toUpperCase()
    .slice(0, 2);
  return { city, state };
}

/** Grava cidade/UF nas duas convenções para não perder dado entre telas. */
export function camposLocalizacaoSync(
  city?: string | null,
  state?: string | null
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (city !== undefined) {
    const c = String(city || "").trim() || null;
    out.city = c;
    out.municipio = c;
  }
  if (state !== undefined) {
    const s = String(state || "").trim().toUpperCase().slice(0, 2) || null;
    out.state = s;
    out.uf = s;
  }
  return out;
}
