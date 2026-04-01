import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

// --- COURSES ---
export async function GET() {
  const { data: courses, error } = await sb()
    .from("courses").select("*, lessons(*)").order("sequence_order", { ascending: true });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, courses: courses || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body._type === "lesson") {
    const { course_id, title, description, video_url, materials, coins_reward, sequence_order } = body;
    if (!course_id || !title) return NextResponse.json({ ok: false, error: "course_id e title obrigatórios" }, { status: 400 });
    const { data, error } = await sb().from("lessons").insert({
      course_id, title, description, video_url, materials,
      coins_reward: Number(coins_reward) || 10,
      sequence_order: Number(sequence_order) || 1,
    }).select().single();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, lesson: data });
  }
  const { title, description, image_url, code, sequence_order } = body;
  if (!title) return NextResponse.json({ ok: false, error: "Título obrigatório" }, { status: 400 });
  const { data, error } = await sb().from("courses").insert({
    title, description, image_url,
    code: code || title.toLowerCase().replace(/\s+/g, "-"),
    sequence_order: Number(sequence_order) || 1,
  }).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, course: data });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, _type, ...campos } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  const table = _type === "lesson" ? "lessons" : "courses";
  if (campos.sequence_order) campos.sequence_order = Number(campos.sequence_order);
  if (campos.coins_reward) campos.coins_reward = Number(campos.coins_reward);
  const { error } = await sb().from(table).update(campos).eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id, _type } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
  const table = _type === "lesson" ? "lessons" : "courses";
  const { error } = await sb().from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
