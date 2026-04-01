import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // Descobre o role do usuário logado
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabaseUser.auth.getSession();

    let userRole = "CABELEIREIRO";
    if (session?.user) {
      const { data: profile } = await supabaseUser
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      userRole = profile?.role || "CABELEIREIRO";
    }

    // Busca comunicados para "TODOS" ou para o role específico
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await sb
      .from("comunicados")
      .select("*")
      .eq("ativo", true)
      .in("publico", ["TODOS", userRole])
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, comunicados: data || [], userRole });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
