import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function sbAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET() {
  try {
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabaseUser.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const { data, error } = await sbAdmin()
      .from("availability")
      .select("*")
      .eq("professional_id", session.user.id)
      .order("day_of_week");

    if (error) {
      if (error.code === "42P01") return NextResponse.json({ ok: true, disponibilidade: [] });
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, disponibilidade: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabaseUser.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const { dias } = await req.json();
    if (!Array.isArray(dias)) return NextResponse.json({ ok: false, error: "dias obrigatório" }, { status: 400 });

    const sb = sbAdmin();
    await sb.from("availability").delete().eq("professional_id", session.user.id);

    if (dias.length > 0) {
      const rows = dias.map((d: any) => ({ ...d, professional_id: session.user.id }));
      const { error } = await sb.from("availability").insert(rows);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
