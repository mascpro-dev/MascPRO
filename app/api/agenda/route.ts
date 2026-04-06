import { NextRequest, NextResponse } from "next/server";
import { getProDb, ultimoDiaMes } from "@/lib/proGestaoDb";
import { fetchProClientIfValid } from "@/lib/proBoundClient";
import { assertStaffOwnedBy } from "@/lib/proStaffBound";
import { hasOverlapWithExisting, loadDayAppointmentsForOverlap } from "@/lib/agendaConflict";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const { searchParams } = new URL(req.url);
  const mes = searchParams.get("mes");
  const dia = searchParams.get("dia");
  const staff = searchParams.get("staff") || "all";

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

  if (staff === "owner") {
    query = query.is("staff_id", null);
  } else if (staff !== "all") {
    query = query.eq("staff_id", staff);
  }

  let { data, error } = await query;

  if (
    error &&
    (error.code === "42703" || String(error.message || "").toLowerCase().includes("staff_id"))
  ) {
    let q2 = g.db
      .from("appointments")
      .select("*")
      .eq("professional_id", g.userId)
      .order("appointment_date", { ascending: true });
    if (dia) q2 = q2.eq("appointment_date", dia);
    else if (mes) {
      const inicio = `${mes}-01`;
      const fim = ultimoDiaMes(mes);
      q2 = q2.gte("appointment_date", inicio).lte("appointment_date", fim);
    }
    const r2 = await q2;
    data = r2.data;
    error = r2.error;
    if (!error && data && staff !== "all") {
      const rows = data as Record<string, unknown>[];
      if (staff === "owner") {
        data = rows.filter((a) => a.staff_id == null || a.staff_id === "") as typeof data;
      } else {
        data = rows.filter((a) => String(a.staff_id || "") === staff) as typeof data;
      }
    }
  }

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
    client_id: bodyClientId,
    client_name,
    client_phone,
    service,
    appointment_date,
    appointment_time,
    duration_min,
    price,
    notes,
    status,
    staff_id: bodyStaffId,
    appointment_kind: bodyKind,
  } = body;

  const kind =
    String(bodyKind || "servico").toLowerCase() === "bloqueio_pessoal" ? "bloqueio_pessoal" : "servico";

  const staffCheck = await assertStaffOwnedBy(g.db, g.userId, bodyStaffId);
  if (!staffCheck.ok) {
    return NextResponse.json({ ok: false, error: staffCheck.error }, { status: 400 });
  }
  const staffIdResolved = staffCheck.staffId;

  const nomeCliente =
    kind === "bloqueio_pessoal"
      ? String(client_name || "").trim() || "Compromisso pessoal"
      : String(client_name || "").trim();

  if (!nomeCliente || !appointment_date || !appointment_time) {
    return NextResponse.json(
      { ok: false, error: "Nome, data e horario sao obrigatorios" },
      { status: 400 }
    );
  }

  const bound =
    kind === "bloqueio_pessoal"
      ? null
      : await fetchProClientIfValid(g.db, g.userId, bodyClientId);
  if (bodyClientId && kind !== "bloqueio_pessoal" && !bound) {
    return NextResponse.json(
      { ok: false, error: "Cliente nao encontrado ou nao pertence a sua conta." },
      { status: 400 }
    );
  }

  const dur = duration_min ? Number(duration_min) : 60;
  const { rows: dayRows, error: dayErr } = await loadDayAppointmentsForOverlap(
    g.db,
    g.userId,
    appointment_date
  );
  if (dayErr) return NextResponse.json({ ok: false, error: dayErr }, { status: 500 });
  if (
    hasOverlapWithExisting(dayRows, {
      appointment_time,
      duration_min: dur,
      staff_id: staffIdResolved,
    })
  ) {
    return NextResponse.json(
      { ok: false, error: "Horario em conflito com outro compromisso deste profissional." },
      { status: 409 }
    );
  }

  const row: Record<string, unknown> = {
    professional_id: g.userId,
    client_name: bound ? bound.name : nomeCliente,
    client_phone: bound ? bound.phone ?? (client_phone || null) : client_phone || null,
    service:
      kind === "bloqueio_pessoal"
        ? service || "Indisponivel"
        : service || null,
    appointment_date,
    appointment_time,
    duration_min: dur,
    status: status || "confirmado",
    paid: false,
    staff_id: staffIdResolved,
    appointment_kind: kind,
  };
  if (bound) row.client_id = bound.id;
  if (price !== undefined && price !== "" && price !== null) row.price = Number(price);
  if (notes) row.notes = notes;

  let { data, error } = await g.db.from("appointments").insert(row).select().single();

  if (error && (error.code === "42703" || error.message?.includes("column"))) {
    const rowMin: Record<string, unknown> = {
      professional_id: g.userId,
      client_name: row.client_name,
      client_phone: row.client_phone,
      service: row.service,
      appointment_date,
      appointment_time,
      duration_min: dur,
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
  "client_id",
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
  "staff_id",
  "appointment_kind",
]);

export async function PATCH(req: NextRequest) {
  const g = await getProDb();
  if (!g.ok) return NextResponse.json({ ok: false, error: g.error }, { status: g.status });

  const body = await req.json();
  const { id, client_id: patchClientId, ...rest } = body;
  if (!id) return NextResponse.json({ ok: false, error: "id obrigatorio" }, { status: 400 });

  const campos: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (!PATCH_KEYS.has(k)) continue;
    campos[k] = v;
  }

  if (Object.prototype.hasOwnProperty.call(campos, "staff_id")) {
    const staffCheck = await assertStaffOwnedBy(g.db, g.userId, campos.staff_id as string | null);
    if (!staffCheck.ok) {
      return NextResponse.json({ ok: false, error: staffCheck.error }, { status: 400 });
    }
    campos.staff_id = staffCheck.staffId;
  }

  if (Object.prototype.hasOwnProperty.call(campos, "appointment_kind")) {
    const k = String(campos.appointment_kind || "").toLowerCase();
    campos.appointment_kind = k === "bloqueio_pessoal" ? "bloqueio_pessoal" : "servico";
  }

  if (Object.prototype.hasOwnProperty.call(body, "client_id")) {
    if (patchClientId === null || patchClientId === "") {
      campos.client_id = null;
    } else if (typeof patchClientId === "string") {
      const bound = await fetchProClientIfValid(g.db, g.userId, patchClientId);
      if (!bound) {
        return NextResponse.json(
          { ok: false, error: "Cliente nao encontrado ou nao pertence a sua conta." },
          { status: 400 }
        );
      }
      campos.client_id = bound.id;
      campos.client_name = bound.name;
      campos.client_phone = bound.phone;
    }
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

  const precisaChecarSobreposicao =
    campos.appointment_date != null ||
    campos.appointment_time != null ||
    campos.duration_min != null ||
    campos.staff_id !== undefined;

  if (precisaChecarSobreposicao) {
    const { data: atual, error: eCur } = await g.db
      .from("appointments")
      .select(
        "appointment_date, appointment_time, duration_min, staff_id, appointment_kind, status"
      )
      .eq("id", id)
      .eq("professional_id", g.userId)
      .maybeSingle();
    if (eCur || !atual) {
      return NextResponse.json({ ok: false, error: eCur?.message || "Agendamento nao encontrado" }, { status: 404 });
    }
    const a = atual as Record<string, unknown>;
    const dateIso = String(campos.appointment_date ?? a.appointment_date);
    const timeStr = String(campos.appointment_time ?? a.appointment_time);
    const dur = Number(campos.duration_min ?? a.duration_min) || 60;
    const staffResolved =
      campos.staff_id !== undefined ? (campos.staff_id as string | null) : (a.staff_id as string | null) ?? null;
    const mergedStatus = String(
      campos.status !== undefined ? campos.status : a.status || ""
    ).toLowerCase();
    if (mergedStatus !== "cancelado") {
      const { rows: dayRows, error: dayErr } = await loadDayAppointmentsForOverlap(
        g.db,
        g.userId,
        dateIso
      );
      if (dayErr) return NextResponse.json({ ok: false, error: dayErr }, { status: 500 });
      if (
        hasOverlapWithExisting(dayRows, {
          appointment_time: timeStr,
          duration_min: dur,
          staff_id: staffResolved,
          excludeId: id,
        })
      ) {
        return NextResponse.json(
          { ok: false, error: "Horario em conflito com outro compromisso deste profissional." },
          { status: 409 }
        );
      }
    }
  }

  let { error } = await g.db.from("appointments").update(campos).eq("id", id).eq("professional_id", g.userId);

  if (error?.code === "42703" || String(error?.message || "").toLowerCase().includes("column")) {
    const fallback = { ...campos };
    delete fallback.staff_id;
    delete fallback.appointment_kind;
    if (Object.keys(fallback).length === 0) {
      return NextResponse.json({ ok: false, error: error?.message || "Erro ao atualizar" }, { status: 500 });
    }
    const r2 = await g.db.from("appointments").update(fallback).eq("id", id).eq("professional_id", g.userId);
    error = r2.error;
  }

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
