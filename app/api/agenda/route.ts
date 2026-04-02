import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function sbAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

// Retorna o ultimo dia real do mes (evita datas invalidas como 2026-04-31)
function ultimoDiaMes(mesISO: string): string {
  const [y, m] = mesISO.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate(); // dia 0 do proximo mes = ultimo dia do mes atual
  return `${mesISO}-${String(lastDay).padStart(2, "0")}`;
}

async function getSession() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

// GET — lista agendamentos do profissional logado
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Nao autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const mes = searchParams.get("mes"); // YYYY-MM

    const sb = sbAdmin();
    let query = sb
      .from("appointments")
      .select("*")
      .eq("professional_id", session.user.id)
      .order("appointment_date", { ascending: true });

    if (mes) {
      const inicio = `${mes}-01`;
      const fim = ultimoDiaMes(mes); // usa o ultimo dia real do mes
      query = query.gte("appointment_date", inicio).lte("appointment_date", fim);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[agenda GET]", error.code, error.message);
      if (error.code === "42P01") {
        return NextResponse.json({ ok: true, appointments: [], aviso: "Tabela appointments nao existe. Rode o SQL no Supabase." });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Ordenacao por horario feita no JS para evitar problemas com duplo order()
    const sorted = (data || []).sort((a: any, b: any) => {
      const dc = a.appointment_date.localeCompare(b.appointment_date);
      if (dc !== 0) return dc;
      return (a.appointment_time || "").localeCompare(b.appointment_time || "");
    });

    return NextResponse.json({ ok: true, appointments: sorted });
  } catch (e: any) {
    console.error("[agenda GET] excecao:", e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — criar agendamento
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Nao autenticado" }, { status: 401 });

    const body = await req.json();
    const { client_name, client_phone, service, appointment_date, appointment_time, duration_min, price, notes } = body;

    if (!client_name || !appointment_date || !appointment_time) {
      return NextResponse.json({ ok: false, error: "Nome, data e horario sao obrigatorios" }, { status: 400 });
    }

    const sb = sbAdmin();

    // Tenta inserir com todos os campos
    const row: any = {
      professional_id: session.user.id,
      client_name,
      client_phone: client_phone || null,
      service: service || null,
      appointment_date,
      appointment_time,
      duration_min: duration_min ? Number(duration_min) : 60,
      status: "confirmado",
    };

    // Adiciona campos opcionais apenas se existirem na tabela
    if (price !== undefined && price !== "") row.price = Number(price);
    if (notes !== undefined && notes !== "") row.notes = notes;

    let { data, error } = await sb.from("appointments").insert(row).select().single();

    // Se falhar com "coluna nao existe", tenta sem os campos opcionais
    if (error && (error.code === "42703" || error.message?.includes("column"))) {
      console.warn("[agenda POST] coluna opcional nao existe, tentando sem price/notes:", error.message);
      const rowMin = {
        professional_id: session.user.id,
        client_name,
        client_phone: client_phone || null,
        service: service || null,
        appointment_date,
        appointment_time,
        duration_min: duration_min ? Number(duration_min) : 60,
        status: "confirmado",
      };
      const result2 = await sb.from("appointments").insert(rowMin).select().single();
      data = result2.data;
      error = result2.error;
    }

    if (error) {
      console.error("[agenda POST]", error.code, error.message);
      if (error.code === "42P01") return NextResponse.json({ ok: false, error: "Tabela nao existe. Rode o SQL no Supabase." }, { status: 500 });
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, appointment: data });
  } catch (e: any) {
    console.error("[agenda POST] excecao:", e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// PATCH — atualizar status ou dados
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Nao autenticado" }, { status: 401 });

    const body = await req.json();
    const { id, ...campos } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });

    const { error } = await sbAdmin().from("appointments")
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
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Nao autenticado" }, { status: 401 });

    const { id } = await req.json();
    const { error } = await sbAdmin().from("appointments")
      .delete()
      .eq("id", id)
      .eq("professional_id", session.user.id);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
