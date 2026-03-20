import { NextRequest, NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";

export async function POST(req: NextRequest) {
  try {
    const { supabase, error, status } = await getAdminServiceClient();
    if (!supabase) return NextResponse.json({ ok: false, error }, { status });

    const { id, novoStatus } = await req.json().catch(() => ({}));
    if (!id || !["aprovado", "rejeitado"].includes(novoStatus)) {
      return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
    }

    const { error: uErr } = await supabase
      .from("withdrawal_requests")
      .update({ status: novoStatus, processado_em: new Date().toISOString() })
      .eq("id", id);

    if (uErr) return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
