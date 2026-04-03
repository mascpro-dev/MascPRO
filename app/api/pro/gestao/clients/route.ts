import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";
import { appointmentMatchesClient } from "@/lib/proClientMatch";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const enrich = new URL(req.url).searchParams.get("enrich") === "1";

  const { data, error } = await g.db
    .from("pro_clients")
    .select("*")
    .eq("professional_id", g.userId)
    .order("name");

  if (error) {
    if (error.code === "42P01") return NextResponse.json({ ok: true, clients: [] });
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const clients = data || [];
  if (!enrich) return NextResponse.json({ ok: true, clients });

  const { data: apts, error: e2 } = await g.db
    .from("appointments")
    .select(
      "client_name, client_phone, appointment_date, appointment_time, service, price, status, paid"
    )
    .eq("professional_id", g.userId)
    .order("appointment_date", { ascending: false })
    .limit(3000);

  if (e2) {
    return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
  }

  const enriched = clients.map((c: Record<string, unknown>) => {
    let totalSpent = 0;
    let lastAppointment: string | null = null;
    for (const apt of apts || []) {
      if (!appointmentMatchesClient(apt, c as { name: string; phone?: string | null })) continue;
      const st = String(apt.status || "").toLowerCase();
      if (st === "cancelado") continue;
      const d = String(apt.appointment_date || "");
      if (d && (!lastAppointment || d > lastAppointment)) lastAppointment = d;
      if (st === "concluido" && apt.paid === true) {
        totalSpent += Number(apt.price || 0);
      }
    }
    return {
      ...c,
      stats_total_spent: totalSpent,
      stats_last_appointment: lastAppointment,
    };
  });

  return NextResponse.json({ ok: true, clients: enriched });
}

export async function POST(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { name, phone, birthday, notes } = await req.json();
  if (!name || typeof name !== "string") {
    return NextResponse.json({ ok: false, error: "Nome obrigatorio" }, { status: 400 });
  }

  const { data, error } = await g.db
    .from("pro_clients")
    .insert({
      professional_id: g.userId,
      name: name.trim(),
      phone: phone || null,
      birthday: birthday || null,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, client: data });
}

export async function PATCH(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { id, ...campos } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });

  const { error } = await g.db
    .from("pro_clients")
    .update(campos)
    .eq("id", id)
    .eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { id } = await req.json();
  const { error } = await g.db
    .from("pro_clients")
    .delete()
    .eq("id", id)
    .eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
