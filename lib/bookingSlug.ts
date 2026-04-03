/** Slug curto para URL pública /agendar/[slug] (apenas letras minúsculas, números e hífens). */

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESERVED = new Set(
  [
    "admin",
    "api",
    "agendar",
    "agenda",
    "login",
    "cadastro",
    "perfil",
    "dashboard",
    "checkout",
    "role-select",
    "embed",
    "static",
    "null",
    "undefined",
  ].map((s) => s.toLowerCase())
);

export function slugifyForBooking(raw: string): string {
  const t = String(raw || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  const out = t
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return out;
}

export function looksLikeUuid(s: string): boolean {
  return UUID_RE.test(String(s || "").trim());
}

export type BookingSlugValidation = { ok: true; slug: string } | { ok: false; error: string };

export function validateBookingSlugInput(raw: string): BookingSlugValidation {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return { ok: true, slug: "" };

  const slug = slugifyForBooking(trimmed);
  if (slug.length < 3) {
    return { ok: false, error: "Use pelo menos 3 letras ou números no link (após normalizar)." };
  }
  if (slug.length > 48) {
    return { ok: false, error: "Link muito longo (máx. 48 caracteres)." };
  }
  if (looksLikeUuid(slug)) {
    return { ok: false, error: "Esse formato é reservado. Escolha outro nome para o link." };
  }
  if (RESERVED.has(slug)) {
    return { ok: false, error: "Esse endereço é reservado. Escolha outro." };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, error: "Use apenas letras, números e hífens." };
  }
  return { ok: true, slug };
}
