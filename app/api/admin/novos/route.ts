import { NextRequest, NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";

export async function GET(req: NextRequest) {
  try {
    const { supabase, error, status } = await getAdminServiceClient();
    if (!supabase) return NextResponse.json({ ok: false, error }, { status });

    const url = new URL(req.url);
    const days = Math.max(1, Math.min(90, Number(url.searchParams.get("days") || 7)));

    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - days);

    const { data, error: qErr } = await supabase
      .from("profiles")
      .select("*")
      .gte("created_at", dataLimite.toISOString())
      .order("created_at", { ascending: false });

    if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, membros: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
