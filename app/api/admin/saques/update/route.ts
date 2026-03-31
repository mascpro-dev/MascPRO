import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function POST(req: NextRequest) {
  try {
    const { id, novoStatus } = await req.json().catch(() => ({}));
    if (!id || !["aprovado", "rejeitado"].includes(novoStatus)) {
      return NextResponse.json({ ok: false, error: "Payload inválido." }, { status: 400 });
    }

    const supabase = getSupabase();

    // Tenta com processado_em primeiro; se a coluna não existir, tenta só status
    let { error: uErr } = await supabase
      .from("withdrawal_requests")
      .update({ status: novoStatus, processado_em: new Date().toISOString() })
      .eq("id", id);

    if (uErr?.message?.includes("processado_em") || uErr?.message?.includes("column")) {
      console.warn("[saques/update] coluna processado_em ausente, atualizando só status");
      const { error: uErr2 } = await supabase
        .from("withdrawal_requests")
        .update({ status: novoStatus })
        .eq("id", id);
      uErr = uErr2 ?? null;
    }

    if (uErr) {
      console.error("[saques/update] erro:", uErr.message);
      return NextResponse.json({ ok: false, error: uErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[saques/update] erro geral:", e.message);
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
