import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimit, LIMITS } from "@/lib/rateLimit";

function sbService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function sbUser(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

export async function POST(req: NextRequest) {
  const limit = await rateLimit(req, LIMITS.checkout);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Muitas tentativas. Aguarde um momento." },
      { status: 429 }
    );
  }

  const service = sbService();
  if (!service) {
    return NextResponse.json(
      { ok: false, error: "Servidor de cadastro não configurado." },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Sessão inválida. Faça login novamente." }, { status: 401 });
  }

  const { data: userData, error: userErr } = await sbUser(token).auth.getUser();
  const user = userData?.user;
  if (userErr || !user) {
    return NextResponse.json(
      {
        ok: false,
        error: "Confirme seu e-mail pelo link enviado e faça login para concluir o cadastro.",
        needsEmailConfirm: true,
      },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));

  const cep = String(body.cep || body.zip_code || "").replace(/\D/g, "");
  const fullName = String(body.full_name || body.name || "").trim();
  const email = String(body.email || user.email || "").trim();

  if (!fullName) {
    return NextResponse.json({ ok: false, error: "Nome completo é obrigatório." }, { status: 400 });
  }
  if (cep.length !== 8) {
    return NextResponse.json({ ok: false, error: "Informe um CEP válido (8 dígitos)." }, { status: 400 });
  }
  if (!String(body.address || "").trim()) {
    return NextResponse.json({ ok: false, error: "Informe o endereço (rua)." }, { status: 400 });
  }
  if (!String(body.number || "").trim()) {
    return NextResponse.json({ ok: false, error: "Informe o número." }, { status: 400 });
  }
  if (!String(body.city || "").trim() || !String(body.state || "").trim()) {
    return NextResponse.json({ ok: false, error: "Informe cidade e UF." }, { status: 400 });
  }

  const cpfDigits = String(body.cpf || body.cpf_cnpj || "").replace(/\D/g, "");
  const indicadoPor = body.indicado_por || body.refId || null;

  const row: Record<string, unknown> = {
    id: user.id,
    email,
    full_name: fullName,
    whatsapp: String(body.whatsapp || "").trim() || null,
    instagram: String(body.instagram || "").trim() || null,
    cpf_cnpj: cpfDigits.length >= 11 ? cpfDigits : null,
    work_type: String(body.work_type || "").trim() || null,
    experience: String(body.experience || "").trim() || null,
    has_schedule: body.has_schedule === true || body.has_schedule === "sim",
    cep,
    address: String(body.address || "").trim(),
    number: String(body.number || "").trim(),
    complement: String(body.complement || "").trim() || null,
    neighborhood: String(body.neighborhood || "").trim() || null,
    city: String(body.city || "").trim(),
    state: String(body.state || "").trim().toUpperCase().slice(0, 2),
    indicado_por: indicadoPor && String(indicadoPor).length > 10 ? indicadoPor : null,
    role: "CABELEIREIRO",
    nivel: "cabeleireiro",
    onboarding_completed: false,
    updated_at: new Date().toISOString(),
  };

  const { error } = await service.from("profiles").upsert(row, { onConflict: "id" });

  if (error) {
    console.error("[cadastro] profile upsert:", error);
    const fallback: Record<string, unknown> = { ...row };
    delete fallback.nivel;
    delete fallback.onboarding_completed;
    const { error: err2 } = await service.from("profiles").upsert(fallback, { onConflict: "id" });
    if (err2) {
      return NextResponse.json({ ok: false, error: err2.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, userId: user.id });
}
