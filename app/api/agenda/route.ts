import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function sbAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

// GET — lista agendamentos do profissional logado
export async function GET(req: NextRequest) {
  try {
    // Pega sessão do usuário
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { session }, error: sessionError } = await supabaseUser.auth.getSession();

    if (sessionError) {
      console.error("[agenda GET] Erro de sessão:", sessionError.message);
      return NextResponse.json({ ok: false, error: "Erro de sessão: " + sessionError.message }, { status: 500 });
    }
    if (!session) {
      return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes"); // YYYY-MM

    // Usa admin client para busca (evita problemas de RLS no server-side)
    const sb = sbAdmin();
    let query = sb
      .from("appointments")
      .select("*")
      .eq("professional_id", session.user.id)
      .order("appointment_date", { ascending: true });

    if (mes) {
      query = query
        .gte("appointment_date", `${mes}-01`)
        .lte("appointment_date", `${mes}-31`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[agenda GET] Erro query:", error.code, error.message);
      // Tabela não existe — retorna vazio sem erro
      if (error.code === "42P01") {
        return NextResponse.json({ ok: true, appointments: [], aviso: "Rode o SQL no Supabase para criar a tabela appointments." });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Ordena por horário no JS (evita problema de duplo order)
    const sorted = (data || []).sort((a: any, b: any) => {
      const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.appointment_time || "").localeCompare(b.appointment_time || "");
    });

    return NextResponse.json({ ok: true, appointments: sorted });
  } catch (e: any) {
    console.error("[agenda GET] Exceção:", e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — criar agendamento
export async function POST(req: NextRequest) {
  try {
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabaseUser.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { client_name, client_phone, service, appointment_date, appointment_time, duration_min, price, notes } = body;

    if (!client_name || !appointment_date || !appointment_time) {
      return NextResponse.json({ ok: false, error: "Nome, data e horário são obrigatórios" }, { status: 400 });
    }

    const sb = sbAdmin();
    const { data, error } = await sb.from("appointments").insert({
      professional_id: session.user.id,
      client_name,
      client_phone: client_phone || null,
      service: service || null,
      appointment_date,
      appointment_time,
      duration_min: duration_min ? Number(duration_min) : 60,
      price: price ? Number(price) : null,
      notes: notes || null,
      status: "confirmado",
    }).select().single();

    if (error) {
      console.error("[agenda POST] Erro:", error.code, error.message);
      if (error.code === "42P01") return NextResponse.json({ ok: false, error: "Tabela não existe. Rode o SQL no Supabase." }, { status: 500 });
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, appointment: data });
  } catch (e: any) {
    console.error("[agenda POST] Exceção:", e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// PATCH — atualizar status ou dados
export async function PATCH(req: NextRequest) {
  try {
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabaseUser.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { id, ...campos } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });

    const sb = sbAdmin();
    const { error } = await sb.from("appointments")
      .update(campos)
      .eq("id", id)
      .eq("professional_id", session.user.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req: NextRequest) {
  try {
    const supabaseUser = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabaseUser.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado" }, { status: 401 });

    const { id } = await req.json();
    const sb = sbAdmin();
    const { error } = await sb.from("appointments")
      .delete()
      .eq("id", id)
      .eq("professional_id", session.user.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
