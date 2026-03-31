import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function POST(req: NextRequest) {
  try {
    // Valida sessão do usuário
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401 });
    }

    const { valorBruto, chavePix } = await req.json();
    if (!valorBruto || valorBruto <= 0) {
      return NextResponse.json({ ok: false, error: "Valor inválido" }, { status: 400 });
    }
    if (!chavePix?.trim()) {
      return NextResponse.json({ ok: false, error: "Chave PIX obrigatória" }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    const taxa = valorBruto * 0.11;
    const liquido = valorBruto - taxa;

    const { error: insertError } = await supabase.from("withdrawal_requests").insert({
      embaixador_id: user.id,
      valor_bruto: valorBruto,
      taxa_percentual: 11,
      valor_taxa: Number(taxa.toFixed(2)),
      valor_liquido: Number(liquido.toFixed(2)),
      chave_pix: chavePix.trim(),
      status: "aguardando",
    });

    if (insertError) {
      console.error("[saques/solicitar] erro insert:", insertError.message);
      return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 });
    }

    // Marca comissões disponíveis como sacadas
    await supabase
      .from("commissions")
      .update({ status: "sacado" })
      .eq("embaixador_id", user.id)
      .eq("status", "disponivel");

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[saques/solicitar] erro geral:", err.message);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
