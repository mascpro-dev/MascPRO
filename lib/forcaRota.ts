export type PontoRota = {
  id: string;
  lat: number | null;
  lng: number | null;
};

export function normalizarCidade(valor: unknown): string {
  return String(valor || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export function mesmaCidade(a: unknown, b: unknown): boolean {
  const esquerda = normalizarCidade(a);
  const direita = normalizarCidade(b);
  return Boolean(esquerda) && esquerda === direita;
}

export function consultasDaParada(lead: {
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}): string[] {
  const rua = String(lead.endereco || "").replace(/\s+/g, " ").trim();
  const bairro = String(lead.bairro || "").replace(/\s+/g, " ").trim();
  const cidade = String(lead.cidade || "").replace(/\s+/g, " ").trim();
  const uf = String(lead.estado || "").replace(/\s+/g, " ").trim();
  const local = [cidade, uf].filter(Boolean).join(", ");
  const cep = String(lead.cep || "").replace(/\D/g, "");
  const brutas = [
    [rua, bairro, local].filter(Boolean).join(", "),
    [rua, local].filter(Boolean).join(", "),
    cep.length === 8 ? [cep, local].filter(Boolean).join(", ") : "",
    [bairro, local].filter(Boolean).join(", "),
  ];
  const vistas = new Set<string>();
  return brutas.filter((item) => {
    const chave = item.toLowerCase();
    if (chave.length < 3 || vistas.has(chave)) return false;
    vistas.add(chave);
    return true;
  });
}

export function enderecoDaParada(lead: {
  endereco?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
}): string {
  const base = consultasDaParada(lead)[0] || "";
  if (!base) return "";
  return /brasil/i.test(base) ? base : `${base}, Brasil`;
}

function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const seno =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(seno)));
}

/** Vizinho mais próximo. Quem não tem coordenada fica no fim, na ordem original. */
export function ordenarPorProximidade<T extends PontoRota>(
  pontos: T[],
  inicio: { lat: number; lng: number } | null
): T[] {
  const comPonto = pontos.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const semPonto = pontos.filter((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lng));
  const resto = [...comPonto];
  const ordem: T[] = [];
  let atual = inicio && Number.isFinite(inicio.lat) && Number.isFinite(inicio.lng)
    ? inicio
    : resto[0]
      ? { lat: resto[0].lat as number, lng: resto[0].lng as number }
      : null;

  while (resto.length && atual) {
    let melhor = 0;
    let menor = Number.POSITIVE_INFINITY;
    resto.forEach((ponto, indice) => {
      const d = distanciaKm(atual as { lat: number; lng: number }, {
        lat: ponto.lat as number,
        lng: ponto.lng as number,
      });
      if (d < menor) {
        menor = d;
        melhor = indice;
      }
    });
    const [proximo] = resto.splice(melhor, 1);
    ordem.push(proximo);
    atual = { lat: proximo.lat as number, lng: proximo.lng as number };
  }

  return [...ordem, ...semPonto];
}

export type DestinoMaps = string | { lat: number; lng: number };

function destinoMaps(item: DestinoMaps): string {
  if (typeof item !== "string" && Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
    return `${item.lat},${item.lng}`;
  }
  return String(item || "").trim();
}

/** Link https que o iPhone abre no Google Maps, com a partida marcada. */
export function urlRotaMaps(
  destinos: DestinoMaps[],
  origem?: { lat: number; lng: number } | null
): string | null {
  const lista = destinos.map(destinoMaps).filter(Boolean);
  if (!lista.length) return null;
  const destino = lista[lista.length - 1];
  const vias = lista.slice(0, -1);
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("travelmode", "driving");
  params.set("destination", destino);
  if (origem && Number.isFinite(origem.lat) && Number.isFinite(origem.lng)) {
    params.set("origin", `${origem.lat},${origem.lng}`);
  }
  if (vias.length) params.set("waypoints", vias.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function textoMapsIphone(valor: string) {
  if (/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(valor)) return valor;
  return valor
    .trim()
    .replace(/[&?#]/g, " ")
    .replace(/\s+/g, "+");
}

/** Abre o aplicativo do Google Maps no iPhone e deixa o iniciar disponível. */
export function urlRotaMapsIphone(
  destinos: DestinoMaps[],
  origem?: { lat: number; lng: number } | null
): string | null {
  const lista = destinos.map(destinoMaps).filter(Boolean);
  if (!lista.length) return null;
  const daddr = lista.map(textoMapsIphone).join("+to:");
  const saddr =
    origem && Number.isFinite(origem.lat) && Number.isFinite(origem.lng)
      ? `${origem.lat},${origem.lng}`
      : "";
  const partida = saddr ? `saddr=${saddr}&` : "";
  return `comgooglemaps://?${partida}daddr=${daddr}&directionsmode=driving`;
}
