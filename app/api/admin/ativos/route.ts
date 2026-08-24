import { NextRequest, NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";
import { boundsMesBrasil, parsePeriodoYm } from "@/lib/comercialRegua";
import { idsUnicos, pedidosAtivosNoPeriodo } from "@/lib/pedidoAtivo";

async function fetchProfiles(
  supabase: Awaited<ReturnType<typeof getAdminServiceClient>>["supabase"],
  ids: string[]
) {
  if (!supabase || ids.length === 0) return { data: [] as any[], error: null as { message: string } | null };
  const all: any[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, whatsapp, role, created_at, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total, avatar_url")
      .in("id", chunk)
      .order("full_name");
    if (error) return { data: [], error };
    all.push(...(data || []));
  }
  all.sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "pt-BR"));
  return { data: all, error: null };
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, error: authErr, status } = await getAdminServiceClient();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: authErr || "Não autorizado." }, { status });
    }

    const periodo = parsePeriodoYm(new URL(req.url).searchParams.get("periodo"));
    const { ini, fim } = boundsMesBrasil(periodo);

    const pedidos = await pedidosAtivosNoPeriodo(supabase, ini, fim);
    if (pedidos.error) {
      return NextResponse.json({ ok: false, error: pedidos.error }, { status: 500 });
    }

    const idsAtivos = idsUnicos(pedidos.rows);
    if (idsAtivos.length === 0) {
      return NextResponse.json({ ok: true, periodo, membros: [] });
    }

    const { data: profiles, error: errProfiles } = await fetchProfiles(supabase, idsAtivos);
    if (errProfiles) {
      return NextResponse.json({ ok: false, error: errProfiles.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, periodo, membros: profiles || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
