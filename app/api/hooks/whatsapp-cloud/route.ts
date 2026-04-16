import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest) {
  const secret =
    process.env.WHATSAPP_REMINDER_INTERNAL_SECRET ||
    process.env.CRON_SECRET ||
    process.env.AGENDA_REMINDER_CRON_SECRET;
  if (!secret) {
    return { ok: false, error: "Segredo interno nao configurado." };
  }
  const bearer = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-reminder-secret") || "";
  const token = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "";
  return token === secret || headerSecret === secret
    ? { ok: true }
    : { ok: false, error: "Nao autorizado." };
}

type ReminderPayload = {
  to?: string;
  message?: string;
  appointmentId?: string;
  professionalId?: string;
};

export async function POST(req: NextRequest) {
  const auth = isAuthorized(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  const phoneNumberId = process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    return NextResponse.json(
      { ok: false, error: "WhatsApp Cloud API nao configurada no ambiente." },
      { status: 500 }
    );
  }

  const body = (await req.json().catch(() => null)) as ReminderPayload | null;
  const to = String(body?.to || "").replace(/\D/g, "");
  const message = String(body?.message || "").trim();

  if (!to || !message) {
    return NextResponse.json(
      { ok: false, error: "Campos 'to' e 'message' sao obrigatorios." },
      { status: 400 }
    );
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
        text: {
          preview_url: false,
          body: message,
        },
      }),
    }
  );

  const metaData = await metaRes.json().catch(() => null);
  if (!metaRes.ok) {
    return NextResponse.json(
      {
        ok: false,
        error:
          metaData?.error?.message ||
          `Falha ao enviar pela Meta (${metaRes.status}).`,
        meta: metaData,
      },
      { status: metaRes.status }
    );
  }

  return NextResponse.json({
    ok: true,
    provider: "whatsapp-cloud-api",
    appointmentId: body?.appointmentId || null,
    professionalId: body?.professionalId || null,
    meta: metaData,
  });
}
