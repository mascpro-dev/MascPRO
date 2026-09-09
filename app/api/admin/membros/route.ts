import { NextResponse } from "next/server";
import { getAdminServiceClient } from "@/lib/adminServer";
import { lerCidadeEstado } from "@/lib/profileLocalizacao";
import { enriquecerPerfilComEndereco, PROFILE_ENDERECO_SELECT } from "@/lib/profileEndereco";
import {
  contarIndicadosDiretos,
  enriquecerProRedeMembro,
  sincronizarNetworkCoinsLote,
} from "@/lib/syncProRedeMembro";

export async function GET() {
  try {
    const { supabase, error, status } = await getAdminServiceClient();
    if (!supabase) return NextResponse.json({ ok: false, error }, { status });

    const { data: profiles } = await supabase
      .from("profiles")
      .select(
        `id, full_name, email, whatsapp, instagram, role, nivel, created_at, indicado_por, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total, avatar_url, ${PROFILE_ENDERECO_SELECT}`
      )
      .order("pro_total", { ascending: false });

    if (!profiles) return NextResponse.json({ ok: false, error: "Erro ao buscar perfis" }, { status: 500 });

    const indicadosCount = contarIndicadosDiretos(profiles);
    await sincronizarNetworkCoinsLote(supabase, profiles, indicadosCount);

    const idsComCompra = new Set<string>();
    for (let from = 0; from < 200_000; from += 1000) {
      const { data: pedidos, error: errPed } = await supabase
        .from("orders")
        .select("profile_id")
        .in("status", ["paid", "separacao", "despachado", "entregue"])
        .range(from, from + 999);
      if (errPed) {
        return NextResponse.json({ ok: false, error: errPed.message }, { status: 500 });
      }
      for (const p of pedidos || []) {
        if (p.profile_id) idsComCompra.add(p.profile_id);
      }
      if (!pedidos || pedidos.length < 1000) break;
    }

    const perfilMap = new Map(profiles.map((p: any) => [p.id, p]));

    const membros = profiles.map((m: any) => {
      const loc = lerCidadeEstado(m);
      const end = enriquecerPerfilComEndereco(m);
      const qtd = indicadosCount.get(m.id) || 0;
      const proRede = enriquecerProRedeMembro(m, qtd);
      return {
        ...end,
        city: loc.city || end.city || m.city,
        state: loc.state || end.state || m.state,
        tem_compra: idsComCompra.has(m.id),
        qtd_indicados: qtd,
        pro_indicacao: proRede.pro_indicacao,
        pro_compras_rede: proRede.pro_compras_rede,
        pro_rede_total: proRede.pro_rede_total,
        indicador: m.indicado_por
          ? perfilMap.get(m.indicado_por)
            ? { full_name: perfilMap.get(m.indicado_por).full_name }
            : null
          : null,
      };
    });

    return NextResponse.json({ ok: true, membros });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
