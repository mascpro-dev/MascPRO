import { NextRequest, NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";

export async function GET(req: NextRequest) {
  try {
    const { supabase, error, status } = await getAdminServiceClient();
    if (!supabase) return NextResponse.json({ ok: false, error }, { status });

    const filtro = new URL(req.url).searchParams.get("status") || "aguardando";
    let query = supabase
      .from("withdrawal_requests")
      .select("*, profiles!withdrawal_requests_embaixador_id_fkey(full_name, nivel, avatar_url)")
      .order("created_at", { ascending: false });

    if (filtro !== "todos") query = query.eq("status", filtro);
    const { data, error: qErr } = await query;
    if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, saques: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
