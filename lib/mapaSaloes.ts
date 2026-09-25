export const MAPA_WHATSAPP = "5514997433541";

export const PIN_TIPOS = [
  "destaque",
  "agendamento",
  "certificado",
  "embaixador",
  "educador",
  "parceiro",
] as const;

export type PinTipo = (typeof PIN_TIPOS)[number];

export const PIN_META: Record<PinTipo, { label: string; cor: string }> = {
  destaque: { label: "Em destaque", cor: "#C9A66B" },
  agendamento: { label: "Com agendamento", cor: "#1FA971" },
  certificado: { label: "Certificado", cor: "#E8A317" },
  embaixador: { label: "Embaixador", cor: "#7C3AED" },
  educador: { label: "Educador", cor: "#2563EB" },
  parceiro: { label: "Parceiro", cor: "#E23B4A" },
};

export type SalaoPublico = {
  id: string;
  nome: string;
  salao: string;
  avatar: string | null;
  instagram: string | null;
  whatsapp: string | null;
  cidade: string;
  uf: string;
  endereco: string;
  lat: number;
  lng: number;
  pin: PinTipo;
  agenda: string | null;
  aberto: boolean;
  servicos: string[];
  workType: string | null;
  bio: string | null;
};

export function ehPinTipo(v: string | null | undefined): v is PinTipo {
  return PIN_TIPOS.includes(v as PinTipo);
}

export function resolverPin(row: {
  mapa_pin?: string | null;
  role?: string | null;
  booking_slug?: string | null;
}): PinTipo {
  if (ehPinTipo(row.mapa_pin)) return row.mapa_pin;
  const role = String(row.role || "").toUpperCase();
  if (role === "EMBAIXADOR") return "embaixador";
  if (role.includes("EDUCADOR")) return "educador";
  if (String(row.booking_slug || "").trim()) return "agendamento";
  return "parceiro";
}

export function distanciaKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatarDistancia(km: number): string {
  if (!Number.isFinite(km)) return "";
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
  const n = km < 10 ? km.toFixed(1) : String(Math.round(km));
  return `${n.replace(".", ",")} km`;
}

export function apenasDigitos(v: string): string {
  return String(v || "").replace(/\D/g, "");
}

export function linkWhatsapp(numero: string | null | undefined, texto: string): string | null {
  const d = apenasDigitos(String(numero || ""));
  if (d.length < 10) return null;
  const n = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

export function linkInstagram(raw: string | null | undefined): { handle: string; href: string } | null {
  let h = String(raw || "").trim();
  if (!h) return null;
  h = h.replace(/^@/, "");
  h = h.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "");
  h = h.split(/[/?#]/)[0];
  if (!h) return null;
  return { handle: h, href: `https://instagram.com/${h}` };
}

export function agoraSaoPaulo(date = new Date()): { weekday: number; mins: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  let hour = Number(get("hour"));
  if (hour === 24) hour = 0;
  return { weekday: map[get("weekday")] ?? 0, mins: hour * 60 + Number(get("minute") || 0) };
}

export function estaAberto(
  dias: { day_of_week: number; start_time: string; end_time: string; active?: boolean | null }[],
  agora = agoraSaoPaulo()
): boolean {
  return dias.some((d) => {
    if (d.active === false) return false;
    if (Number(d.day_of_week) !== agora.weekday) return false;
    const ini = paraMinutos(d.start_time);
    const fim = paraMinutos(d.end_time);
    if (ini == null || fim == null || ini >= fim) return false;
    return agora.mins >= ini && agora.mins < fim;
  });
}

function paraMinutos(t: string): number | null {
  const m = String(t || "").match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function consultaGeocode(p: {
  studio_address?: string | null;
  city?: string | null;
  state?: string | null;
  logradouro?: string | null;
  address?: string | null;
  numero?: string | null;
  number?: string | null;
  bairro?: string | null;
  neighborhood?: string | null;
  municipio?: string | null;
  uf?: string | null;
}): string {
  const cidade = String(p.municipio || p.city || "").trim();
  const uf = String(p.uf || p.state || "").trim();
  const rua = [String(p.logradouro || p.address || "").trim(), String(p.numero || p.number || "").trim()]
    .filter(Boolean)
    .join(", ");
  const bairro = String(p.bairro || p.neighborhood || "").trim();
  const studio = String(p.studio_address || "").trim();
  const partes = [studio || rua, bairro, cidade, uf, "Brasil"].filter(Boolean);
  return partes.join(", ");
}

const geoCache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodificar(consulta: string): Promise<{ lat: number; lng: number } | null> {
  const q = consulta.trim();
  if (q.length < 3) return null;
  const key = q.toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key) ?? null;

  const ponto = (await nominatim(q)) || (await photon(q));
  geoCache.set(key, ponto);
  return ponto;
}

async function nominatim(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "MascPRO-Mapa/1.0 (mapa de saloes)",
        "Accept-Language": "pt-BR",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat?: string; lon?: string }[];
    const lat = Number(data?.[0]?.lat);
    const lng = Number(data?.[0]?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

async function photon(q: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://photon.komoot.io/api/?limit=1&lang=pt&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      features?: { geometry?: { coordinates?: number[] }; properties?: { countrycode?: string } }[];
    };
    const f = data.features?.[0];
    const cc = String(f?.properties?.countrycode || "").toUpperCase();
    if (cc && cc !== "BR") return null;
    const lng = Number(f?.geometry?.coordinates?.[0]);
    const lat = Number(f?.geometry?.coordinates?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

export function espalharPins<T extends { lat: number; lng: number }>(
  itens: T[]
): (T & { displayLat: number; displayLng: number })[] {
  const vistos = new Map<string, number>();
  return itens.map((s) => {
    const key = `${s.lat.toFixed(4)},${s.lng.toFixed(4)}`;
    const n = vistos.get(key) || 0;
    vistos.set(key, n + 1);
    if (n === 0) return { ...s, displayLat: s.lat, displayLng: s.lng };
    const ang = n * 0.95;
    const r = 0.0011 * Math.ceil(n / 8);
    return {
      ...s,
      displayLat: s.lat + Math.cos(ang) * r,
      displayLng: s.lng + Math.sin(ang) * r,
    };
  });
}
