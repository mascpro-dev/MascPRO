import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { registrarAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// GET /api/admin/config — lista todas as configs
export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const check = await assertAdmin(supabase, userId);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });

  const { data, error } = await supabase
    .from("system_config")
    .select("*")
    .order("chave", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, configs: data || [] });
}

// PATCH /api/admin/config — atualiza uma config
export async function PATCH(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const check = await assertAdmin(supabase, userId);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.chave || body.valor === undefined) {
    return NextResponse.json({ ok: false, error: "chave e valor obrigatórios." }, { status: 400 });
  }

  const { data: antes } = await supabase
    .from("system_config").select("valor").eq("chave", body.chave).maybeSingle();

  const { data, error } = await supabase
    .from("system_config")
    .upsert({ chave: body.chave, valor: String(body.valor), updated_by: userId, updated_at: new Date().toISOString() },
      { onConflict: "chave" })
    .select().single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await registrarAudit(supabase, {
    usuarioId: userId, acao: "UPDATE_CONFIG",
    entidade: "system_config", entidadeId: body.chave,
    dadosAntes: { valor: antes?.valor },
    dadosApos:  { valor: String(body.valor) },
  });

  return NextResponse.json({ ok: true, config: data });
}
