import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as webpush from "web-push";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    throw new Error("Push não configurado: defina NEXT_PUBLIC_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.");
  }
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || "mailto:marceloconelheiros@conexoes.digital",
    pub,
    priv
  );
  vapidConfigured = true;
}

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function POST(req: NextRequest) {
  try {
    ensureVapid();
    const { title, body, url, publico } = await req.json();
    if (!title || !body) return NextResponse.json({ ok: false, error: "title e body obrigatórios" }, { status: 400 });

    let query = sb().from("push_subscriptions").select("endpoint, p256dh, auth, user_id");

    if (publico && publico !== "TODOS") {
      const { data: perfis } = await sb()
        .from("profiles")
        .select("id")
        .eq("role", publico);
      const ids = (perfis || []).map((p: any) => p.id);
      if (ids.length === 0) return NextResponse.json({ ok: true, enviados: 0 });
      query = query.in("user_id", ids);
    }

    const { data: subs, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!subs || subs.length === 0) return NextResponse.json({ ok: true, enviados: 0 });

    const payload = JSON.stringify({ title, body, url: url || "/", tag: "mascp-push" });
    let enviados = 0;
    const expirados: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
            {
              // Mantém a mensagem na fila do push service por mais tempo (ex.: aparelho desligado / offline)
              TTL: 60 * 60 * 24 * 7,
              urgency: "high",
            }
          );
          enviados++;
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            expirados.push(sub.endpoint);
          }
        }
      })
    );

    if (expirados.length > 0) {
      await sb().from("push_subscriptions").delete().in("endpoint", expirados);
    }

    return NextResponse.json({ ok: true, enviados, expirados: expirados.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
