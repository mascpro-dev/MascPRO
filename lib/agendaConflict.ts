import type { SupabaseClient } from "@supabase/supabase-js";

export function parseTimeToMin(t: string): number {
  const s = (t || "09:00").slice(0, 5);
  const [h, m] = s.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function intervalsOverlap(a0: number, a1: number, b0: number, b1: number) {
  return a0 < b1 && a1 > b0;
}

export type OverlapApt = {
  id?: string;
  appointment_time: string;
  duration_min?: number | null;
  staff_id?: string | null;
};

export function hasOverlapWithExisting(
  existing: OverlapApt[],
  candidate: {
    appointment_time: string;
    duration_min: number;
    staff_id: string | null;
    excludeId?: string;
  }
): boolean {
  const newStart = parseTimeToMin(candidate.appointment_time);
  const newEnd = newStart + Math.max(5, candidate.duration_min);
  const targetStaff = candidate.staff_id ?? null;
  for (const apt of existing) {
    if (candidate.excludeId && apt.id === candidate.excludeId) continue;
    if ((apt.staff_id ?? null) !== targetStaff) continue;
    const s = parseTimeToMin(String(apt.appointment_time || "00:00"));
    const d = Math.max(5, Number(apt.duration_min) || 60);
    const e = s + d;
    if (intervalsOverlap(newStart, newEnd, s, e)) return true;
  }
  return false;
}

export async function loadDayAppointmentsForOverlap(
  db: SupabaseClient,
  professionalId: string,
  dayIso: string
): Promise<{ rows: OverlapApt[]; error: string | null }> {
  const sel =
    "id, appointment_time, duration_min, staff_id, status, appointment_kind";
  const res1 = await db
    .from("appointments")
    .select(sel)
    .eq("professional_id", professionalId)
    .eq("appointment_date", dayIso)
    .in("status", ["confirmado", "pendente"]);

  let rows: OverlapApt[] = [];
  let err = res1.error;

  if (err?.code === "42703" || String(err?.message || "").toLowerCase().includes("column")) {
    const r2 = await db
      .from("appointments")
      .select("id, appointment_time, duration_min, status")
      .eq("professional_id", professionalId)
      .eq("appointment_date", dayIso)
      .in("status", ["confirmado", "pendente"]);
    rows = (r2.data || []) as OverlapApt[];
    err = r2.error;
  } else if (!err) {
    rows = (res1.data || []) as OverlapApt[];
  }

  if (err) return { rows: [], error: err.message };
  return { rows, error: null };
}
