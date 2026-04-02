import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("professional_id", session.user.id)
      .order("day_of_week");

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, disponibilidade: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const { dias } = await req.json(); // array de { day_of_week, start_time, end_time, slot_duration_min, active }
    if (!Array.isArray(dias)) return NextResponse.json({ ok: false, error: "dias obrigatório" }, { status: 400 });

    // Deleta e reinsere tudo
    await supabase.from("availability").delete().eq("professional_id", session.user.id);

    if (dias.length > 0) {
      const rows = dias.map((d: any) => ({ ...d, professional_id: session.user.id }));
      const { error } = await supabase.from("availability").insert(rows);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
