import type { SupabaseClient } from "@supabase/supabase-js";
import { labelLinha } from "@/lib/comercialClassificacao";

const PRECOS = [
  { key: "price_hairdresser", label: "Licenciado" },
  { key: "price_ambassador", label: "Licenciado" },
  { key: "price_distributor", label: "Distribuidor" },
] as const;

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function texto(v: unknown) {
  return String(v ?? "").trim();
}

function sentidoPreco(antes: number, depois: number) {
  if (depois > antes + 0.009) return "aumento";
  if (depois < antes - 0.009) return "desconto";
  return "";
}

function descreverAlteracao(antes: Record<string, unknown>, patch: Record<string, unknown>) {
  const tabela: string[] = [];
  const outros: string[] = [];
  const titulo = texto(patch.title ?? antes.title) || "Produto";

  for (const preco of PRECOS) {
    if (!(preco.key in patch)) continue;
    const a = num(antes[preco.key]);
    const d = num(patch[preco.key]);
    const sentido = sentidoPreco(a, d);
    if (!sentido) continue;
    tabela.push(`${preco.label} ${moeda(a)} → ${moeda(d)} (${sentido})`);
  }

  if ("title" in patch && texto(patch.title) !== texto(antes.title)) {
    outros.push(`nome "${texto(antes.title)}" → "${texto(patch.title)}"`);
  }
  if ("linha" in patch && texto(patch.linha) !== texto(antes.linha)) {
    const de = labelLinha(texto(antes.linha)) || "Sem linha";
    const para = labelLinha(texto(patch.linha)) || "Sem linha";
    outros.push(`linha ${de} → ${para}`);
  }
  if ("volume" in patch && texto(patch.volume) !== texto(antes.volume)) {
    outros.push(`volume "${texto(antes.volume) || "—"}" → "${texto(patch.volume) || "—"}"`);
  }
  if ("stock" in patch && num(patch.stock) !== num(antes.stock)) {
    outros.push(`estoque ${num(antes.stock)} → ${num(patch.stock)}`);
  }
  if ("peso_gramas" in patch && num(patch.peso_gramas) !== num(antes.peso_gramas)) {
    outros.push(`peso ${num(antes.peso_gramas)} g → ${num(patch.peso_gramas)} g`);
  }
  if ("ativo" in patch && Boolean(patch.ativo) !== Boolean(antes.ativo)) {
    outros.push(patch.ativo ? "voltou a ficar ativo" : "foi desativado");
  }
  if ("description" in patch && texto(patch.description) !== texto(antes.description)) {
    outros.push("descrição atualizada");
  }
  if ("how_to_use" in patch && texto(patch.how_to_use) !== texto(antes.how_to_use)) {
    outros.push("modo de uso atualizado");
  }
  if ("image_url" in patch && texto(patch.image_url) !== texto(antes.image_url)) {
    outros.push("foto atualizada");
  }
  if ("video_url" in patch && texto(patch.video_url) !== texto(antes.video_url)) {
    outros.push("vídeo atualizado");
  }

  if (tabela.length === 0 && outros.length === 0) return "";

  const partes: string[] = [];
  if (tabela.length) partes.push(`Tabela: ${tabela.join("; ")}.`);
  if (outros.length) partes.push(`Também mudou: ${outros.join("; ")}.`);
  return `${titulo}. ${partes.join(" ")}`.slice(0, 500);
}

async function idsDistribuidores(supabase: SupabaseClient) {
  const { data } = await supabase.from("profiles").select("id").ilike("role", "distribuidor");
  return (data || []).map((p) => String(p.id));
}

async function gravarAvisos(
  supabase: SupabaseClient,
  params: { actorId: string | null; content: string }
) {
  const ids = await idsDistribuidores(supabase);
  if (ids.length === 0 || !params.content) return;

  const rows = ids.map((user_id) => ({
    user_id,
    actor_id: params.actorId,
    type: "produto_tabela",
    content: params.content,
    link: "/admin/produtos",
    is_read: false,
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    await supabase.from("notifications").insert(
      rows.map(({ is_read: _read, ...row }) => ({ ...row, read: false }))
    );
  }

  void enviarPushDistribuidores(ids, params.content);
}

async function enviarPushDistribuidores(ids: string[], body: string) {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv || ids.length === 0) return;
  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_EMAIL || "mailto:marceloconelheiros@conexoes.digital",
      pub,
      priv
    );
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key || !process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key);
    const { data: subs } = await sb
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", ids);
    const payload = JSON.stringify({
      title: "Tabela MascPRO atualizada",
      body: body.slice(0, 180),
      url: "/admin/produtos",
      tag: "produto-tabela",
    });
    await Promise.allSettled(
      (subs || []).map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 24 * 7, urgency: "high" }
        )
      )
    );
  } catch (e) {
    console.error("[notificar produto] push:", e);
  }
}

export async function notificarProdutoAlterado(
  supabase: SupabaseClient,
  params: {
    actorId: string | null;
    antes: Record<string, unknown>;
    patch: Record<string, unknown>;
  }
) {
  try {
    const content = descreverAlteracao(params.antes, params.patch);
    if (!content) return;
    await gravarAvisos(supabase, { actorId: params.actorId, content });
  } catch (e) {
    console.error("[notificar produto] alteracao:", e);
  }
}

export async function notificarProdutoCriado(
  supabase: SupabaseClient,
  params: { actorId: string | null; title: string; price_hairdresser: number }
) {
  try {
    const content = `Novo produto na tabela — ${params.title}. Licenciado ${moeda(params.price_hairdresser)}.`.slice(0, 500);
    await gravarAvisos(supabase, { actorId: params.actorId, content });
  } catch (e) {
    console.error("[notificar produto] criado:", e);
  }
}

export async function notificarProdutoRemovido(
  supabase: SupabaseClient,
  params: { actorId: string | null; title: string }
) {
  try {
    const content = `Produto retirado da tabela — ${params.title}.`.slice(0, 500);
    await gravarAvisos(supabase, { actorId: params.actorId, content });
  } catch (e) {
    console.error("[notificar produto] removido:", e);
  }
}
