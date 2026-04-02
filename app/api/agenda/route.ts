import { NextRequest, NextResponse } from "next/server";
import { getProDb, ultimoDiaMes } from "@/lib/proGestaoDb";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes");
  const dia = searchParams.get("dia");

  let query = g.db
    .from("appointments")
    .select("*")
    .eq("professional_id", g.userId)
    .order("appointment_date", { ascending: true });

  if (dia) {
    query = query.eq("appointment_date", dia);
  } else if (mes) {
    const inicio = `${mes}-01`;
    const fim = ultimoDiaMes(mes);
    query = query.gte("appointment_date", inicio).lte("appointment_date", fim);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === "42P01") {
      return NextResponse.json({
        ok: true,
        appointments: [],
        aviso: "Tabela appointments nao encontrada.",
      });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const sorted = (data || []).sort((a: any, b: any) => {
    const dc = String(a.appointment_date).localeCompare(String(b.appointment_date));
    if (dc !== 0) return dc;
    return String(a.appointment_time || "").localeCompare(String(b.appointment_time || ""));
  });

  return NextResponse.json({ ok: true, appointments: sorted });
}

export async function POST(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const body = await req.json();
  const {
    client_name,
    client_phone,
    service,
    appointment_date,
    appointment_time,
    duration_min,
    price,
    notes,
    status,
  } = body;

  if (!client_name || !appointment_date || !appointment_time) {
    return NextResponse.json(
      { ok: false, error: "Nome, data e horario sao obrigatorios" },
      { status: 400 }
    );
  }

  const row: Record<string, unknown> = {
    professional_id: g.userId,
    client_name,
    client_phone: client_phone || null,
    service: service || null,
    appointment_date,
    appointment_time,
    duration_min: duration_min ? Number(duration_min) : 60,
    status: status || "confirmado",
    paid: false,
  };
  if (price !== undefined && price !== "" && price !== null) row.price = Number(price);
  if (notes) row.notes = notes;

  let { data, error } = await g.db.from("appointments").insert(row).select().single();

  if (error && (error.code === "42703" || error.message?.includes("column"))) {
    const rowMin = {
      professional_id: g.userId,
      client_name,
      client_phone: client_phone || null,
      service: service || null,
      appointment_date,
      appointment_time,
      duration_min: duration_min ? Number(duration_min) : 60,
      status: status || "confirmado",
    };
    const r2 = await g.db.from("appointments").insert(rowMin).select().single();
    data = r2.data;
    error = r2.error;
  }

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, appointment: data });
}

const PATCH_KEYS = new Set([
  "client_name",
  "client_phone",
  "service",
  "appointment_date",
  "appointment_time",
  "duration_min",
  "price",
  "notes",
  "status",
  "paid",
  "payment_method",
  "payment_due_date",
  "paid_at",
]);

export async function PATCH(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });

  const campos: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (!PATCH_KEYS.has(k)) continue;
    campos[k] = v;
  }

  if (campos.duration_min != null && campos.duration_min !== "")
    campos.duration_min = Number(campos.duration_min);
  if (campos.price === "" || campos.price === undefined) delete campos.price;
  else if (campos.price !== null) campos.price = Number(campos.price);

  if (typeof campos.paid === "string") {
    campos.paid = campos.paid === "true" || campos.paid === "1";
  }

  if (campos.payment_method === "") campos.payment_method = null;
  if (campos.payment_due_date === "") campos.payment_due_date = null;
  if (campos.paid_at === "") campos.paid_at = null;

  const st = String(campos.status || "").toLowerCase();
  if (st === "cancelado") {
    campos.paid = false;
    campos.paid_at = null;
    campos.payment_method = null;
    campos.payment_due_date = null;
  }

  const { error } = await g.db
    .from("appointments")
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
    .from("appointments")
    .delete()
    .eq("id", id)
    .eq("professional_id", g.userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
