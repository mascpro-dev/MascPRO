import { NextRequest, NextResponse } from "next/server";
import { getProDb } from "@/lib/proGestaoDb";
import { appointmentBelongsToClient } from "@/lib/proClientMatch";

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

  const sel =
    "id, client_id, appointment_date, appointment_time, client_name, client_phone, service, price, status, paid, paid_at, payment_method, notes";

  const { data: porId, error: e2 } = await g.db
    .from("appointments")
    .select(sel)
    .eq("professional_id", g.userId)
    .eq("client_id", clientId)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(2000);

  if (e2) {
    return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });
  }

  const { data: semId, error: e3 } = await g.db
    .from("appointments")
    .select(sel)
    .eq("professional_id", g.userId)
    .is("client_id", null)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(3000);

  if (e3) {
    return NextResponse.json({ ok: false, error: e3.message }, { status: 500 });
  }

  type AptRow = {
    id: string;
    client_id?: string | null;
    appointment_date: string;
    appointment_time: string;
    client_name?: string | null;
    client_phone?: string | null;
    service: string | null;
    price: number | null;
    status: string;
    paid: boolean | null;
    paid_at?: string | null;
    payment_method?: string | null;
    notes?: string | null;
  };

  const legacy = (semId || []).filter((a) => appointmentBelongsToClient(a, client));
  const map = new Map<string, AptRow>();
  for (const a of (porId || []) as AptRow[]) map.set(a.id, a);
  for (const a of legacy as AptRow[]) map.set(a.id, a);

  const history = [...map.values()].sort((a, b) => {
    const dc = String(b.appointment_date).localeCompare(String(a.appointment_date));
    if (dc !== 0) return dc;
    return String(b.appointment_time || "").localeCompare(String(a.appointment_time || ""));
  }).map((a) => ({
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
