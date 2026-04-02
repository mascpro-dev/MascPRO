import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

// GET — busca disponibilidade pública do profissional
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const [{ data: perfil }, { data: disponibilidade }, { data: agendados }] = await Promise.all([
      sb().from("profiles").select("id, full_name, city, state, barber_shop, instagram").eq("id", id).single(),
      sb().from("availability").select("*").eq("professional_id", id).eq("active", true).order("day_of_week"),
      sb().from("appointments").select("appointment_date, appointment_time, duration_min")
        .eq("professional_id", id)
        .in("status", ["confirmado", "pendente"])
        .gte("appointment_date", new Date().toISOString().split("T")[0]),
    ]);

    if (!perfil) return NextResponse.json({ ok: false, error: "Profissional não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, perfil, disponibilidade: disponibilidade || [], agendados: agendados || [] });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — cliente agenda um horário
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const { client_name, client_phone, service, appointment_date, appointment_time } = await req.json();

    if (!client_name || !appointment_date || !appointment_time) {
      return NextResponse.json({ ok: false, error: "Nome, data e horário obrigatórios" }, { status: 400 });
    }

    // Verifica se horário já está ocupado
    const { data: conflito } = await sb()
      .from("appointments")
      .select("id")
      .eq("professional_id", id)
      .eq("appointment_date", appointment_date)
      .eq("appointment_time", appointment_time)
      .in("status", ["confirmado", "pendente"])
      .single();

    if (conflito) return NextResponse.json({ ok: false, error: "Este horário já está reservado" }, { status: 409 });

    const { data, error } = await sb().from("appointments").insert({
      professional_id: id,
      client_name, client_phone, service,
      appointment_date, appointment_time,
      duration_min: 60,
      status: "pendente",
    }).select().single();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, appointment: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
