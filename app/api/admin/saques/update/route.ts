import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, novoStatus } = body;

    if (!id || !["aprovado", "rejeitado"].includes(novoStatus)) {
      return NextResponse.json({ ok: false, error: `Payload inválido. id=${id} novoStatus=${novoStatus}` }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json({ ok: false, error: `Env vars ausentes: url=${!!url} key=${!!key}` }, { status: 500 });
    }

    const supabase = createClient(url, key);

    // Update mínimo — só o status
    const { error, data } = await supabase
      .from("withdrawal_requests")
      .update({ status: novoStatus })
      .eq("id", id)
      .select("id, status");

    if (error) {
      console.error("[saques/update]", error);
      return NextResponse.json({
        ok: false,
        error: error.message,
        code: error.code,
        details: (error as any).details,
        hint: (error as any).hint,
      }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ ok: false, error: `Nenhuma linha atualizada. id=${id} pode não existir.` }, { status: 404 });
    }

    return NextResponse.json({ ok: true, saque: data[0] });
  } catch (e: any) {
    console.error("[saques/update] catch:", e.message);
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
