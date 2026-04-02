import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// POST — salva subscription usando o cliente autenticado do usuário
export async function POST(req: NextRequest) {
  try {
    // Usa o cliente com sessão do usuário (bypassa RLS corretamente)
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { subscription } = body;
    if (!subscription?.endpoint) return NextResponse.json({ ok: false, error: "Subscription inválida" }, { status: 400 });

    // Tenta upsert — se a tabela não existir, retorna erro claro
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert({
        user_id: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

    if (error) {
      console.error("[push/subscribe] Erro ao salvar:", error);
      return NextResponse.json({ ok: false, error: error.message, code: error.code }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[push/subscribe] Exceção:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// DELETE — remove subscription
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ ok: false, error: "endpoint obrigatório" }, { status: 400 });
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
