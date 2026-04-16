import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  normalizePhoneToWhatsapp,
  renderReminderMessage,
} from "@/lib/agendaReminder";

export const dynamic = "force-dynamic";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function todayInSaoPauloISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function isAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET || process.env.AGENDA_REMINDER_CRON_SECRET;
  if (!secret) return { ok: false, error: "CRON_SECRET nao configurado." };
  const bearer = req.headers.get("authorization") || "";
  const headerSecret = req.headers.get("x-cron-secret") || "";
  const token = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : "";
  return token === secret || headerSecret === secret
    ? { ok: true }
    : { ok: false, error: "Nao autorizado." };
}

async function sendWhatsappReminder(payload: {
  to: string;
  message: string;
  appointmentId: string;
  professionalId: string;
}) {
  const webhook = process.env.WHATSAPP_REMINDER_WEBHOOK_URL;
  if (!webhook) {
    return { ok: false, error: "WHATSAPP_REMINDER_WEBHOOK_URL nao configurado." };
  }
  const internalSecret =
    process.env.WHATSAPP_REMINDER_INTERNAL_SECRET ||
    process.env.CRON_SECRET ||
    process.env.AGENDA_REMINDER_CRON_SECRET ||
    "";
  const res = await fetch(webhook, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(internalSecret ? { "x-reminder-secret": internalSecret } : {}),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    return { ok: false, error: `Webhook falhou (${res.status}): ${txt.slice(0, 180)}` };
  }
  return { ok: true };
}

type ProfileRow = {
  id: string;
  full_name: string | null;
  barber_shop?: string | null;
  reminder_enabled?: boolean | null;
  reminder_template?: string | null;
  studio_address?: string | null;
};

async function run(req: NextRequest) {
  const auth = isAuthorized(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });

  const date = new URL(req.url).searchParams.get("date") || todayInSaoPauloISO();
  const db = sb();

  const p1 = await db
    .from("profiles")
    .select("id, full_name, barber_shop, reminder_enabled, reminder_template, studio_address");

  let profiles = (p1.data || []) as ProfileRow[];
  if (p1.error?.code === "42703" || String(p1.error?.message || "").toLowerCase().includes("column")) {
    const p2 = await db.from("profiles").select("id, full_name, barber_shop");
    if (p2.error) return NextResponse.json({ ok: false, error: p2.error.message }, { status: 500 });
    profiles = (p2.data || []) as ProfileRow[];
  } else if (p1.error) {
    return NextResponse.json({ ok: false, error: p1.error.message }, { status: 500 });
  }

  let sent = 0;
  let skippedNoPhone = 0;
  let skippedAlreadySent = 0;
  const errors: string[] = [];

  for (const pro of profiles) {
    if (pro.reminder_enabled === false) continue;

    const a1 = await db
      .from("appointments")
      .select("id, client_name, client_phone, appointment_date, appointment_time, service, appointment_kind")
      .eq("professional_id", pro.id)
      .eq("appointment_date", date)
      .in("status", ["confirmado", "pendente"]);

    let appts = (a1.data || []) as Record<string, any>[];
    if (a1.error?.code === "42703" || String(a1.error?.message || "").toLowerCase().includes("column")) {
      const a2 = await db
        .from("appointments")
        .select("id, client_name, client_phone, appointment_date, appointment_time, service")
        .eq("professional_id", pro.id)
        .eq("appointment_date", date)
        .in("status", ["confirmado", "pendente"]);
      if (a2.error) {
        errors.push(`${pro.id}: ${a2.error.message}`);
        continue;
      }
      appts = (a2.data || []) as Record<string, any>[];
    } else if (a1.error) {
      errors.push(`${pro.id}: ${a1.error.message}`);
      continue;
    }

    const serviceAppts = appts.filter(
      (a) => String(a.appointment_kind || "servico").toLowerCase() !== "bloqueio_pessoal"
    );
    const ids = serviceAppts.map((a) => String(a.id));
    const alreadySent = new Set<string>();

    if (ids.length > 0) {
      const rLog = await db
        .from("appointment_reminder_logs")
        .select("appointment_id")
        .eq("send_date", date)
        .in("appointment_id", ids);
      if (!rLog.error) {
        for (const row of rLog.data || []) alreadySent.add(String((row as any).appointment_id));
      }
    }

    for (const a of serviceAppts) {
      const aptId = String(a.id || "");
      if (!aptId) continue;
      if (alreadySent.has(aptId)) {
        skippedAlreadySent += 1;
        continue;
      }

      const phone = normalizePhoneToWhatsapp(a.client_phone);
      if (!phone) {
        skippedNoPhone += 1;
        continue;
      }

      const msg = renderReminderMessage(pro.reminder_template, {
        salon_name: String(pro.barber_shop || "").trim() || String(pro.full_name || "").trim(),
        client_name: String(a.client_name || "cliente").trim(),
        appointment_date: String(a.appointment_date || date),
        appointment_time: String(a.appointment_time || "").slice(0, 5),
        service: String(a.service || "").trim(),
        professional_name: String(pro.full_name || "").trim(),
        address: String(pro.studio_address || "").trim(),
      });

      const send = await sendWhatsappReminder({
        to: phone,
        message: msg,
        appointmentId: aptId,
        professionalId: pro.id,
      });
      if (!send.ok) {
        errors.push(`${aptId}: ${send.error}`);
        continue;
      }

      await db.from("appointment_reminder_logs").insert({
        appointment_id: aptId,
        professional_id: pro.id,
        send_date: date,
        channel: "whatsapp",
        payload: { to: phone },
      });
      sent += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    date,
    sent,
    skippedNoPhone,
    skippedAlreadySent,
    errors,
  });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
