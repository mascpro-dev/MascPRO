import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";
import { appointmentMatchesClient } from "@/lib/proClientMatch";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ ok: false, error: "clientId obrigatorio" }, { status: 400 });
  }

  const { data: client, error: e1 } = await g.db
    .from("pro_clients")
    .select("id, name, phone, birthday, notes")
    .eq("id", clientId)
    .eq("professional_id", g.userId)
    .single();

  if (e1 || !client) {
    return NextResponse.json({ ok: false, error: "Cliente nao encontrado" }, { status: 404 });
  }

  const { data: apts, error: e2 } = await g.db
    .from("appointments")
    .select(
      "id, appointment_date, appointment_time, client_name, client_phone, service, price, status, paid, paid_at, payment_method, notes"
    )
    .eq("professional_id", g.userId)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(3000);

  if (e2) {
    return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
  }

  const history = (apts || [])
    .filter((a) => appointmentMatchesClient(a, client))
    .map((a) => ({
      id: a.id,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      service: a.service,
      price: a.price,
      status: a.status,
      paid: a.paid,
      paid_at: a.paid_at,
      payment_method: a.payment_method,
      notes: a.notes,
    }));

  return NextResponse.json({ ok: true, client, history });
}
