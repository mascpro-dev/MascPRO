import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { appointmentMatchesClient } from "@/lib/proClientMatch";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function timeToMin(t: string): number {
  const p = (t || "09:00").slice(0, 5);
  const [h, m] = p.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function intervalsOverlap(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 && a1 > b0;
}

// GET — disponibilidade pública + serviços (sem preço: só nome e duração)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const [{ data: perfil }, { data: disponibilidade }, { data: agendados }, svcRes] = await Promise.all([
      sb().from("profiles").select("id, full_name, city, state, barber_shop, instagram").eq("id", id).single(),
      sb().from("availability").select("*").eq("professional_id", id).eq("active", true).order("day_of_week"),
      sb().from("appointments").select("appointment_date, appointment_time, duration_min")
        .eq("professional_id", id)
        .in("status", ["confirmado", "pendente"])
        .gte("appointment_date", new Date().toISOString().split("T")[0]),
      sb()
        .from("pro_services")
        .select("id, name, duration_min")
        .eq("professional_id", id)
        .eq("active", true)
        .order("name"),
    ]);

    if (!perfil) return NextResponse.json({ ok: false, error: "Profissional não encontrado" }, { status: 404 });

    const e = svcRes.error;
    const servicos =
      e?.code === "42P01" || e?.code === "42703" || String(e?.message || "").toLowerCase().includes("column")
        ? []
        : svcRes.data || [];

    return NextResponse.json({
      ok: true,
      perfil,
      disponibilidade: disponibilidade || [],
      agendados: agendados || [],
      servicos,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

// POST — agenda com duração do procedimento e validação de sobreposição
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { client_name, client_phone, service, appointment_date, appointment_time, service_id } = body;

    if (!client_name || !appointment_date || !appointment_time) {
      return NextResponse.json({ ok: false, error: "Nome, data e horário obrigatórios" }, { status: 400 });
    }

    const { data: umServico } = await sb()
      .from("pro_services")
      .select("id")
      .eq("professional_id", id)
      .eq("active", true)
      .limit(1);

    const temCatalogo = (umServico?.length || 0) > 0;

    let durationMin = 60;
    let serviceName = typeof service === "string" ? service.trim() : "";

    if (temCatalogo) {
      if (!service_id || typeof service_id !== "string") {
        return NextResponse.json(
          { ok: false, error: "Selecione um procedimento da lista para agendar." },
          { status: 400 }
        );
      }
      const { data: svc, error: se } = await sb()
        .from("pro_services")
        .select("name, duration_min")
        .eq("id", service_id)
        .eq("professional_id", id)
        .eq("active", true)
        .maybeSingle();
      if (se || !svc) {
        return NextResponse.json({ ok: false, error: "Procedimento inválido." }, { status: 400 });
      }
      durationMin = Math.max(5, Math.min(480, Number(svc.duration_min) || 60));
      serviceName = String(svc.name || "").trim() || serviceName || "Serviço";
    } else {
      if (!serviceName) {
        return NextResponse.json({ ok: false, error: "Descreva o serviço desejado." }, { status: 400 });
      }
      const raw = body.duration_min;
      if (raw != null && raw !== "") {
        durationMin = Math.max(15, Math.min(480, Number(raw)));
      }
    }

    const { data: dayApts, error: dayErr } = await sb()
      .from("appointments")
      .select("appointment_time, duration_min")
      .eq("professional_id", id)
      .eq("appointment_date", appointment_date)
      .in("status", ["confirmado", "pendente"]);

    if (dayErr) return NextResponse.json({ ok: false, error: dayErr.message }, { status: 500 });

    const newStart = timeToMin(appointment_time);
    const newEnd = newStart + durationMin;

    for (const apt of dayApts || []) {
      const s = timeToMin(String(apt.appointment_time || "00:00"));
      const d = Math.max(5, Number(apt.duration_min) || 60);
      const e = s + d;
      if (intervalsOverlap(newStart, newEnd, s, e)) {
        return NextResponse.json(
          { ok: false, error: "Este horário conflita com outro agendamento (duração do procedimento)." },
          { status: 409 }
        );
      }
    }

    const nomeLimpo = String(client_name).trim();
    const telRaw = client_phone || null;

    let clientId: string | null = null;
    const clRes = await sb().from("pro_clients").select("id, name, phone").eq("professional_id", id).limit(4000);

    if (!clRes.error && clRes.data?.length) {
      for (const c of clRes.data) {
        if (appointmentMatchesClient({ client_name: nomeLimpo, client_phone: telRaw }, c)) {
          clientId = c.id;
          break;
        }
      }
    }

    if (!clientId && clRes.error?.code !== "42P01") {
      const ins = await sb()
        .from("pro_clients")
        .insert({
          professional_id: id,
          name: nomeLimpo,
          phone: telRaw,
        })
        .select("id")
        .single();
      if (!ins.error && ins.data?.id) clientId = ins.data.id as string;
    }

    const row: Record<string, unknown> = {
      professional_id: id,
      client_name: nomeLimpo,
      client_phone: telRaw,
      service: serviceName,
      appointment_date,
      appointment_time: appointment_time.slice(0, 5),
      duration_min: durationMin,
      status: "pendente",
    };
    if (clientId) row.client_id = clientId;

    let { data, error } = await sb().from("appointments").insert(row).select().single();

    if (error?.code === "42703" && clientId) {
      delete row.client_id;
      const r2 = await sb().from("appointments").insert(row).select().single();
      data = r2.data;
      error = r2.error;
    }

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, appointment: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
