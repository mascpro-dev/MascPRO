import type { SupabaseClient } from "@supabase/supabase-js";
import * as webpush from "web-push";
import { criarNotificacao } from "@/lib/notificarCrm";

function quando(data: string, hora: string) {
  const [ano, mes, dia] = String(data || "").split("-");
  const hm = String(hora || "").slice(0, 5);
  if (dia && mes && ano) return `${dia}/${mes}/${ano} às ${hm}`;
  return `${data} ${hm}`.trim();
}

/** Sino do app e push no celular do profissional. Falha aqui não cancela o horário. */
export async function avisarNovoAgendamento(
  db: SupabaseClient,
  params: {
    professionalId: string;
    clientName: string;
    service: string;
    date: string;
    time: string;
  }
) {
  const texto = `Novo agendamento: ${params.clientName} — ${params.service || "serviço"} em ${quando(params.date, params.time)}.`;

  try {
    await criarNotificacao(db, {
      user_id: params.professionalId,
      type: "agenda_novo",
      content: texto,
      link: "/agenda",
    });
  } catch {
    /* o horário já foi gravado */
  }

  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return;

  try {
    webpush.setVapidDetails(process.env.VAPID_EMAIL || "mailto:marceloconelheiros@conexoes.digital", pub, priv);
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", params.professionalId);

    const payload = JSON.stringify({
      title: "Novo agendamento — Masc PRO",
      body: texto,
      url: "/agenda",
      tag: "agenda-novo",
    });

    await Promise.allSettled(
      (subs || []).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24, urgency: "high" }
        )
      )
    );
  } catch {
    /* push é extra; o sino do app continua valendo */
  }
}
