import { NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";

export async function GET() {
  try {
    const { supabase, error, status } = await getAdminServiceClient();
    if (!supabase) return NextResponse.json({ ok: false, error }, { status });

    const { data: todos, error: qErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, indicado_por");

    if (qErr) return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 });

    const mapa: Record<string, number> = {};
    (todos || []).forEach((u: any) => {
      if (u.indicado_por) mapa[u.indicado_por] = (mapa[u.indicado_por] || 0) + 1;
    });

    const lideres = (todos || [])
      .filter((u: any) => mapa[u.id] > 0)
      .map((lider: any) => ({
        ...lider,
        count: mapa[lider.id],
        indicados: (todos || []).filter((i: any) => i.indicado_por === lider.id),
      }))
      .sort((a: any, b: any) => b.count - a.count);

    return NextResponse.json({ ok: true, lideres });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
