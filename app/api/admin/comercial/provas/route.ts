import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { LINHA_LABEL } from "@/lib/comercialClassificacao";
import {
  DEFINICOES_FASE5,
  erroColunaFase5,
  parsePeriodoScore,
  parseProvaInput,
} from "@/lib/comercialProvas";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE = 1000;

async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ rows: T[]; error: string | null }> {
  const rows: T[] = [];
  let from = 0;
  for (let i = 0; i < 20; i++) {
    const res = await fetchPage(from, from + PAGE - 1);
    if (res.error) return { rows: [], error: res.error.message };
    const chunk = res.data || [];
    rows.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return { rows, error: null };
}

function ymOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function boundsMes(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { ini: `${ym}-01`, fim: `${ym}-${String(last).padStart(2, "0")}` };
}

type ProvaRow = {
  id: string;
  realizado_em: string;
  cliente_nome: string;
  cidade: string;
  estado: string | null;
  linha: string;
  protocolo: string;
  autorizacao: boolean;
  uso_comercial: boolean;
  midia_url: string | null;
  community_post_id: string | null;
  profile_id: string | null;
  event_id: string | null;
  notas: string | null;
};

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const periodoRaw = parsePeriodoScore(req.nextUrl.searchParams.get("periodo") || ymOf(new Date()));
  if (!periodoRaw.ok) {
    return NextResponse.json({ ok: false, error: periodoRaw.error }, { status: 400 });
  }
  const periodo = periodoRaw.value;
  const { ini, fim } = boundsMes(periodo);

  const provasRes = await fetchAllRows<ProvaRow>(async (from, to) =>
    supabase
      .from("comercial_provas")
      .select("id, realizado_em, cliente_nome, cidade, estado, linha, protocolo, autorizacao, uso_comercial, midia_url, community_post_id, profile_id, event_id, notas")
      .gte("realizado_em", ini)
      .lte("realizado_em", fim)
      .order("realizado_em", { ascending: false })
      .range(from, to)
  );
  if (provasRes.error) {
    return NextResponse.json({ ok: false, error: erroColunaFase5(provasRes.error) }, { status: 500 });
  }

  const [{ data: pessoas }, { data: eventos }, postsRes, jaCatalogados] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["EMBAIXADOR", "DISTRIBUIDOR"])
      .order("full_name"),
    supabase
      .from("events")
      .select("id, titulo, data_hora, cidade")
      .order("data_hora", { ascending: false })
      .limit(80),
    fetchAllRows<{
      id: string;
      content: string | null;
      media_url: string | null;
      created_at: string;
      user_id: string;
    }>(async (from, to) =>
      supabase
        .from("community_posts")
        .select("id, content, media_url, created_at, user_id")
        .gte("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString())
        .order("created_at", { ascending: false })
        .range(from, to)
    ),
    supabase.from("comercial_provas").select("community_post_id").not("community_post_id", "is", null),
  ]);

  const nomes = new Map((pessoas || []).map((p) => [p.id, p.full_name || "Sem nome"]));
  const eventosMap = new Map((eventos || []).map((e) => [e.id, e.titulo]));
  const usados = new Set((jaCatalogados.data || []).map((r) => r.community_post_id).filter(Boolean) as string[]);

  const autorIds = [...new Set(postsRes.rows.map((p) => p.user_id))];
  const autores = new Map<string, string>();
  if (autorIds.length) {
    const { data: perfisPost } = await supabase.from("profiles").select("id, full_name").in("id", autorIds);
    for (const p of perfisPost || []) autores.set(p.id, p.full_name || "Sem nome");
  }

  const candidatos = postsRes.rows
    .filter((p) => !usados.has(p.id) && p.media_url)
    .slice(0, 30)
    .map((p) => ({
      id: p.id,
      content: p.content,
      media_url: p.media_url,
      created_at: p.created_at,
      user_id: p.user_id,
      autor: autores.get(p.user_id) || "Comunidade",
    }));

  const provas = provasRes.rows.map((p) => ({
    ...p,
    linha_label: LINHA_LABEL[p.linha] || p.linha,
    responsavel: p.profile_id ? nomes.get(p.profile_id) || null : null,
    evento: p.event_id ? eventosMap.get(p.event_id) || null : null,
  }));

  const porLinha = Object.entries(
    provas.reduce<Record<string, number>>((acc, p) => {
      acc[p.linha] = (acc[p.linha] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([key, n]) => ({ key, label: LINHA_LABEL[key] || key, n }))
    .sort((a, b) => b.n - a.n);

  return NextResponse.json({
    ok: true,
    fase: 5,
    periodo,
    kpis: {
      total: provas.length,
      usoComercial: provas.filter((p) => p.uso_comercial).length,
      candidatos: candidatos.length,
      comResponsavel: provas.filter((p) => p.profile_id).length,
    },
    provas,
    porLinha,
    candidatos,
    pessoas: (pessoas || []).map((p) => ({ id: p.id, nome: p.full_name || "Sem nome", role: p.role })),
    eventos: (eventos || []).map((e) => ({
      id: e.id,
      titulo: e.titulo,
      data_hora: e.data_hora,
      cidade: e.cidade,
    })),
    definicoes: DEFINICOES_FASE5,
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  const parsed = parseProvaInput(body);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  const { error } = await supabase.from("comercial_provas").insert({
    ...parsed.value,
    created_by: userId,
  });
  if (error) {
    if (/unique|duplicate/i.test(error.message)) {
      return NextResponse.json({ ok: false, error: "Este post da comunidade já foi catalogado." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: erroColunaFase5(error.message) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ ok: false, error: "JSON inválido." }, { status: 400 });
  const id = String(body.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Informe a prova." }, { status: 400 });
  const parsed = parseProvaInput(body);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });

  const { error } = await supabase.from("comercial_provas").update(parsed.value).eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: erroColunaFase5(error.message) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const admin = await assertAdmin(supabase, userId);
  if (!admin.ok) {
    return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { id?: string } | null;
  const id = String(body?.id || "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "Informe a prova." }, { status: 400 });

  const { error } = await supabase.from("comercial_provas").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: erroColunaFase5(error.message) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
