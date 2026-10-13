import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess } from "@/lib/crmServer";

export const dynamic = "force-dynamic";

const JANELA_MS = 6 * 60 * 60 * 1000;

async function idsDaUltimaLista(supabase: NonNullable<Awaited<ReturnType<typeof getAdminContext>>["supabase"]>) {
  const { data: atividades, error } = await supabase
    .from("crm_atividades")
    .select("lead_id, created_at")
    .eq("tipo", "criacao")
    .ilike("conteudo", "Lead importado de lista%")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) return { ok: false as const, error: error.message };
  const rows = (atividades || []).filter((a) => a.lead_id && a.created_at);
  if (rows.length === 0) {
    return { ok: true as const, ids: [] as string[] };
  }

  const maisRecente = new Date(rows[0].created_at).getTime();
  const ids = [
    ...new Set(
      rows
        .filter((a) => maisRecente - new Date(a.created_at).getTime() <= JANELA_MS)
        .map((a) => String(a.lead_id))
    ),
  ];
  return { ok: true as const, ids };
}

/** Conta ou apaga a última lista importada no CRM. Só o administrador. */
export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }
  if (access.role !== "ADMIN") {
    return NextResponse.json(
      { ok: false, error: "Somente o administrador pode apagar a lista." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const lote = await idsDaUltimaLista(supabase);
  if (!lote.ok) return NextResponse.json({ ok: false, error: lote.error }, { status: 500 });

  if (lote.ids.length === 0) {
    return NextResponse.json({ ok: true, total: 0, apagados: 0 });
  }

  const lista: { id: string; nome: string | null; order_id: string | null }[] = [];
  for (let i = 0; i < lote.ids.length; i += 80) {
    const { data: leads, error: errLeads } = await supabase
      .from("crm_leads")
      .select("id, nome, order_id")
      .in("id", lote.ids.slice(i, i + 80));
    if (errLeads) return NextResponse.json({ ok: false, error: errLeads.message }, { status: 500 });
    lista.push(...(leads || []));
  }
  const comPedido = lista.filter((l) => l.order_id).map((l) => l.id);
  const apagar = lista.filter((l) => !l.order_id).map((l) => l.id);

  if (!body?.confirmar) {
    return NextResponse.json({
      ok: true,
      total: apagar.length,
      com_pedido: comPedido.length,
      amostra: lista.filter((l) => !l.order_id).slice(0, 5).map((l) => l.nome),
    });
  }

  if (apagar.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Nenhum lead desta lista pode ser apagado porque já existe pedido.",
    }, { status: 400 });
  }

  for (let i = 0; i < apagar.length; i += 80) {
    const loteIds = apagar.slice(i, i + 80);
    await supabase.from("crm_atividades").delete().in("lead_id", loteIds);
    const { error: errDel } = await supabase.from("crm_leads").delete().in("id", loteIds);
    if (errDel) return NextResponse.json({ ok: false, error: errDel.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    apagados: apagar.length,
    com_pedido: comPedido.length,
  });
}
