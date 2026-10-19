import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAdmin, getAdminContext } from "@/lib/adminServer";
import { extractYouTubeVideoId } from "@/lib/youtube";

const MSG_PERMISSAO =
  "Sem permissão na tabela de aulas. No Supabase, SQL Editor, rode o arquivo supabase/fix_lessons_grants.sql.";

function erroAula(message: string) {
  if (/permission denied/i.test(message)) return MSG_PERMISSAO;
  return message;
}

async function clienteAdmin(): Promise<
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; error: string; status: number }
> {
  const { supabase, userId, error, status } = await getAdminContext();
  if (!supabase || !userId) {
    return { ok: false, error: error || "Não autenticado.", status: status || 401 };
  }
  const access = await assertAdmin(supabase, userId);
  if (!access.ok) return { ok: false, error: access.error, status: 403 };
  return { ok: true, supabase };
}

// --- COURSES ---
export async function GET() {
  const acesso = await clienteAdmin();
  if (!acesso.ok) return NextResponse.json({ ok: false, error: acesso.error }, { status: acesso.status });
  const supabase = acesso.supabase;

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("sequence_order", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: erroAula(error.message) }, { status: 500 });

  if (!courses || courses.length === 0) {
    return NextResponse.json({ ok: true, courses: [] });
  }

  // Busca todas as aulas usando course_code (FK real do banco)
  const { data: lessons } = await supabase
    .from("lessons")
    .select("*")
    .order("sequence_order", { ascending: true });

  // Mescla aulas dentro de cada curso pelo course_code
  const cursosComAulas = courses.map((c: any) => ({
    ...c,
    lessons: (lessons || []).filter((l: any) => l.course_code === c.code),
  }));

  return NextResponse.json({ ok: true, courses: cursosComAulas });
}

/** Campos reais da tabela `lessons` (sem coins_reward / video_url do formulário). */
function buildLessonRow(body: {
  title?: string;
  description?: string;
  video_url?: string;
  materials?: string;
  sequence_order?: number | string;
}) {
  const row: Record<string, unknown> = {};
  if (body.title !== undefined) row.title = body.title;
  if (body.description !== undefined) row.description = body.description || null;
  if (body.sequence_order !== undefined) row.sequence_order = Number(body.sequence_order) || 1;

  if (body.video_url !== undefined) {
    const raw = String(body.video_url).trim();
    row.video_id = raw ? extractYouTubeVideoId(raw) || raw : null;
  }

  if (body.materials !== undefined) {
    const m = String(body.materials).trim();
    row.material_url = m || null;
  }

  return row;
}

export async function POST(req: NextRequest) {
  const acesso = await clienteAdmin();
  if (!acesso.ok) return NextResponse.json({ ok: false, error: acesso.error }, { status: acesso.status });
  const supabase = acesso.supabase;
  const body = await req.json();
  if (body._type === "lesson") {
    // course_id aqui é o ID do course — buscamos o code para usar como FK
    const { course_id, title } = body;
    if (!course_id || !title) return NextResponse.json({ ok: false, error: "course_id e title obrigatórios" }, { status: 400 });

    // Busca o code do curso pelo id
    const { data: curso } = await supabase.from("courses").select("code").eq("id", course_id).single();
    const course_code = curso?.code;
    if (!course_code) return NextResponse.json({ ok: false, error: "Curso não encontrado." }, { status: 404 });

    const { data, error } = await supabase.from("lessons").insert({
      course_code,
      ...buildLessonRow(body),
    }).select().single();
    if (error) return NextResponse.json({ ok: false, error: erroAula(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, lesson: data });
  }
  const { title, description, image_url, code, sequence_order } = body;
  if (!title) return NextResponse.json({ ok: false, error: "Título obrigatório" }, { status: 400 });
  const { data, error } = await supabase.from("courses").insert({
    title, description, image_url,
    code: code || title.toLowerCase().replace(/\s+/g, "-"),
    sequence_order: Number(sequence_order) || 1,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, error: erroAula(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true, course: data });
}

export async function PATCH(req: NextRequest) {
  const acesso = await clienteAdmin();
  if (!acesso.ok) return NextResponse.json({ ok: false, error: acesso.error }, { status: acesso.status });
  const supabase = acesso.supabase;
  const body = await req.json();
  const { id, _type } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  const table = _type === "lesson" ? "lessons" : "courses";

  let campos: Record<string, unknown>;
  if (_type === "lesson") {
    campos = buildLessonRow(body);
  } else {
    const { course_id: _c, ...rest } = body;
    campos = rest;
    delete campos.id;
    delete campos._type;
    if (campos.sequence_order) campos.sequence_order = Number(campos.sequence_order);
  }

  const { error } = await supabase.from(table).update(campos).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: erroAula(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const acesso = await clienteAdmin();
  if (!acesso.ok) return NextResponse.json({ ok: false, error: acesso.error }, { status: acesso.status });
  const { id, _type } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  const table = _type === "lesson" ? "lessons" : "courses";
  const { error } = await acesso.supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: erroAula(error.message) }, { status: 500 });
  return NextResponse.json({ ok: true });
}
