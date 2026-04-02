import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// GET — lista agendamentos do profissional logado
export async function GET(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes"); // YYYY-MM
    const status = searchParams.get("status");

    let query = supabase
      .from("appointments")
      .select("*")
      .eq("professional_id", session.user.id)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (mes) {
      const inicio = `${mes}-01`;
      const fim = `${mes}-31`;
      query = query.gte("appointment_date", inicio).lte("appointment_date", fim);
    }
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, appointments: data || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — criar agendamento
export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { client_name, client_phone, service, appointment_date, appointment_time, duration_min, price, notes } = body;
    if (!client_name || !appointment_date || !appointment_time) {
      return NextResponse.json({ ok: false, error: "Nome, data e horário são obrigatórios" }, { status: 400 });
    }

    const { data, error } = await supabase.from("appointments").insert({
      professional_id: session.user.id,
      client_name, client_phone, service, appointment_date, appointment_time,
      duration_min: duration_min || 60,
      price: price ? Number(price) : null,
      notes, status: "confirmado",
    }).select().single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, appointment: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// PATCH — atualizar status ou dados
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { id, ...campos } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });

    const { error } = await supabase.from("appointments").update(campos)
      .eq("id", id).eq("professional_id", session.user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// DELETE — cancelar/excluir
export async function DELETE(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const { id } = await req.json();
    const { error } = await supabase.from("appointments").delete()
      .eq("id", id).eq("professional_id", session.user.id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
