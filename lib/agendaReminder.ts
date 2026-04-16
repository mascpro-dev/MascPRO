export const DEFAULT_REMINDER_TEMPLATE =
  "*{{salon_name}}*\n\n" +
  "Ola {{client_name}}, tudo bem?\n" +
  "Passando para lembrar do seu horario hoje as {{appointment_time}}.\n\n" +
  "Posso confirmar?\n\n" +
  "{{address_block}}";

export type ReminderTemplateContext = {
  salon_name: string;
  client_name: string;
  appointment_date: string;
  appointment_time: string;
  service: string;
  professional_name: string;
  address: string;
};

export function formatBrDate(iso: string) {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function normalizePhoneToWhatsapp(raw: string | null | undefined): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits.length >= 12 ? digits : null;
}

export function renderReminderMessage(
  rawTemplate: string | null | undefined,
  ctx: ReminderTemplateContext
) {
  const template = String(rawTemplate || "").trim() || DEFAULT_REMINDER_TEMPLATE;
  const addressBlock = ctx.address
    ? `Endereco do studio: ${ctx.address}`
    : "Qualquer duvida, me chama por aqui.";

  return template
    .replace(/\{\{\s*salon_name\s*\}\}/gi, ctx.salon_name || ctx.professional_name)
    .replace(/\{\{\s*client_name\s*\}\}/gi, ctx.client_name)
    .replace(/\{\{\s*appointment_date\s*\}\}/gi, formatBrDate(ctx.appointment_date))
    .replace(/\{\{\s*appointment_time\s*\}\}/gi, ctx.appointment_time)
    .replace(/\{\{\s*service\s*\}\}/gi, ctx.service || "seu atendimento")
    .replace(/\{\{\s*professional_name\s*\}\}/gi, ctx.professional_name)
    .replace(/\{\{\s*address\s*\}\}/gi, ctx.address || "")
    .replace(/\{\{\s*address_block\s*\}\}/gi, addressBlock)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
