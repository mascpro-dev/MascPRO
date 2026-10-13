import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess } from "@/lib/crmServer";
import { inserirListaLeads } from "@/lib/crmInserirListaLeads";

export const dynamic = "force-dynamic";

const PAPEL_DESTINO = new Set(["DISTRIBUIDOR", "VENDEDOR"]);

/** Admin escolhe o distribuidor ou vendedor que recebe a lista. */
export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }
  if (access.role !== "ADMIN") {
    return NextResponse.json({ ok: true, responsaveis: [] });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["DISTRIBUIDOR", "VENDEDOR"])
    .order("full_name", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const responsaveis = (data || [])
    .map((p) => ({
      id: p.id,
      full_name: p.full_name || "Sem nome",
      role: String(p.role || "").toUpperCase(),
    }))
    .filter((p) => PAPEL_DESTINO.has(p.role));

  return NextResponse.json({ ok: true, responsaveis });
}

/** Sobe a lista no pipeline de quem está logado, ou no de outro distribuidor/vendedor se for admin. */
export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const texto = String(body?.texto || "");
  let responsavelId = userId;
  let destinoNome: string | undefined;

  if (access.role === "ADMIN") {
    const escolhido = String(body?.responsavel_id || "").trim();
    if (!escolhido) {
      return NextResponse.json(
        { ok: false, error: "Escolha o distribuidor ou o vendedor que recebe a lista." },
        { status: 400 }
      );
    }
    const { data: destino } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", escolhido)
      .maybeSingle();
    const papel = String(destino?.role || "").toUpperCase();
    if (!destino?.id || !PAPEL_DESTINO.has(papel)) {
      return NextResponse.json(
        { ok: false, error: "O destino precisa ser um distribuidor ou um vendedor." },
        { status: 400 }
      );
    }
    responsavelId = destino.id;
    destinoNome = destino.full_name || papel;
  }

  const resultado = await inserirListaLeads(supabase, {
    autorId: userId,
    autorNome: access.full_name || "admin",
    responsavelId,
    destinoNome,
    texto,
  });

  if (!resultado.ok) {
    return NextResponse.json(resultado, { status: 400 });
  }
  return NextResponse.json({ ...resultado, destino_nome: destinoNome || null });
}
