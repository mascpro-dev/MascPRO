/** WhatsApp central MascPRO quando não há distribuidor no link. */
export const CATALOGO_WHATSAPP_PADRAO = "5514997433541";

export const CATALOGO_REF_STORAGE_KEY = "masc_catalog_distribuidor_id";

export type VendedorCatalogo = {
  id: string;
  full_name: string;
  whatsapp: string;
};

export function normalizarWhatsAppBr(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length < 10) return null;
  if (digits.startsWith("55")) return digits;
  return `55${digits}`;
}

export function montarLinkWhatsApp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

export function whatsappCatalogo(vendedor: VendedorCatalogo | null): string {
  return vendedor?.whatsapp || CATALOGO_WHATSAPP_PADRAO;
}

export function linkCatalogoDistribuidor(origin: string, distribuidorId: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/catalago?ref=${distribuidorId}`;
}
