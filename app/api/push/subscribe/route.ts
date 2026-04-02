import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

// POST — salva subscription
export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabaseUser.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const { subscription } = await req.json();
    if (!subscription?.endpoint) return NextResponse.json({ ok: false, error: "Subscription inválida" }, { status: 400 });

    const { error } = await sb()
      .from("push_subscriptions")
      .upsert({
        user_id: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys?.p256dh,
        auth: subscription.keys?.auth,
        updated_at: new Date().toISOString(),
      }, { onConflict: "endpoint" });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// DELETE — remove subscription
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ ok: false, error: "endpoint obrigatório" }, { status: 400 });
    await sb().from("push_subscriptions").delete().eq("endpoint", endpoint);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
