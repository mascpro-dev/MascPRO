import { normalizePhoneToWhatsapp } from "@/lib/agendaReminder";

function resolveAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim() || "";
  if (!vercel) return "";
  if (vercel.startsWith("http")) return vercel.replace(/\/$/, "");
  return `https://${vercel}`;
}

export function buildCrmAcessoWhatsappMessage(params: {
  nome: string;
  email: string;
  senha: string;
  appUrl?: string;
}): string {
  const base = resolveAppBaseUrl();
  const loginUrl = params.appUrl || (base ? `${base}/login` : "/login");

  const primeiroNome = String(params.nome || "Cliente").trim().split(/\s+/)[0];

  return (
    `*MASC PRO*\n\n` +
    `Olá, ${primeiroNome}! Seu cadastro no app foi criado.\n\n` +
    `*Dados de acesso:*\n` +
    `E-mail: ${params.email}\n` +
    `Senha temporária: ${params.senha}\n\n` +
    `Entre em: ${loginUrl}\n` +
    `Por segurança, altere a senha no primeiro acesso.\n\n` +
    `Qualquer dúvida, estamos por aqui!`
  );
}

export async function sendWhatsappCloudMessage(
  toRaw: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const to = normalizePhoneToWhatsapp(toRaw);
  if (!to) {
    return { ok: false, error: "Telefone do lead inválido para WhatsApp." };
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return { ok: false, error: "Mensagem vazia." };
  }

  const webhook = process.env.WHATSAPP_REMINDER_WEBHOOK_URL;
  const internalSecret =
    process.env.WHATSAPP_REMINDER_INTERNAL_SECRET ||
    process.env.CRON_SECRET ||
    process.env.AGENDA_REMINDER_CRON_SECRET ||
    "";

  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(internalSecret ? { "x-reminder-secret": internalSecret } : {}),
        },
        body: JSON.stringify({ to, message: trimmed }),
      });
      if (res.ok) return { ok: true };
      const txt = await res.text().catch(() => "");
      const viaWebhook = `Webhook WhatsApp falhou (${res.status}): ${txt.slice(0, 160)}`;
      const direct = await sendWhatsappDirect(to, trimmed);
      if (direct.ok) return direct;
      return { ok: false, error: `${viaWebhook} | ${direct.error}` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro no webhook WhatsApp.";
      const direct = await sendWhatsappDirect(to, trimmed);
      if (direct.ok) return direct;
      return { ok: false, error: `${msg} | ${direct.error}` };
    }
  }

  return sendWhatsappDirect(to, trimmed);
}

async function sendWhatsappDirect(
  to: string,
  message: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return {
      ok: false,
      error:
        "WhatsApp não configurado. Defina WHATSAPP_CLOUD_PHONE_NUMBER_ID e WHATSAPP_CLOUD_ACCESS_TOKEN (ou WHATSAPP_REMINDER_WEBHOOK_URL).",
    };
  }

  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: true, body: message },
      }),
    }
  );

  const metaData = await metaRes.json().catch(() => null);
  if (!metaRes.ok) {
    return {
      ok: false,
      error:
        metaData?.error?.message ||
        `Falha ao enviar pela Meta WhatsApp Cloud (${metaRes.status}).`,
    };
  }

  return { ok: true };
}
