import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import {
  contarIndicadosDiretos,
  enriquecerProRedeMembro,
  sincronizarNetworkCoinsLote,
  sincronizarTotalComprasRedeUsuario,
} from "@/lib/syncProRedeMembro";
import { getProBreakdown } from "@/lib/proScore";

export const dynamic = "force-dynamic";

function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function GET() {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
  }

  const service = serviceClient();
  const supabase = service || supabaseAuth;

  const { data: perfil, error } = await supabase
    .from("profiles")
    .select(
      "id, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total, full_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !perfil) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Perfil não encontrado." },
      { status: 404 }
    );
  }

  if (service) {
    const { data: todos } = await service.from("profiles").select("id, indicado_por");
    const indicadosCount = contarIndicadosDiretos(todos || []);
    await sincronizarNetworkCoinsLote(service, [perfil], indicadosCount);
    await sincronizarTotalComprasRedeUsuario(service, user.id);

    const { data: atualizado } = await service
      .from("profiles")
      .select(
        "id, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total, full_name"
      )
      .eq("id", user.id)
      .maybeSingle();

    if (atualizado) {
      const qtd = indicadosCount.get(user.id) || 0;
      const enriquecido = enriquecerProRedeMembro(atualizado, qtd);
      const pro = getProBreakdown(atualizado);
      return NextResponse.json({
        ok: true,
        perfil: atualizado,
        qtd_indicados: qtd,
        pro_indicacao: enriquecido.pro_indicacao,
        pro_compras_rede: enriquecido.pro_compras_rede,
        pro_rede_total: enriquecido.pro_rede_total,
        score_total: pro.total,
        score_rede: enriquecido.pro_rede_total,
        score_pessoal: pro.pessoal + pro.comprasProprias,
      });
    }
  }

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("indicado_por", user.id);

  const qtd = count || 0;
  const enriquecido = enriquecerProRedeMembro(perfil, qtd);
  const pro = getProBreakdown({
    ...perfil,
    network_coins: enriquecido.pro_indicacao,
  });

  return NextResponse.json({
    ok: true,
    perfil,
    qtd_indicados: qtd,
    pro_indicacao: enriquecido.pro_indicacao,
    pro_compras_rede: enriquecido.pro_compras_rede,
    pro_rede_total: enriquecido.pro_rede_total,
    score_total: pro.total,
    score_rede: enriquecido.pro_rede_total,
    score_pessoal: pro.pessoal + pro.comprasProprias,
  });
}
