import { NextRequest, NextResponse } from "next/server";
import { assertAdmin, getAdminContext } from "@/lib/adminServer";
import { consultaGeocode, geocodificar } from "@/lib/mapaSaloes";
import { compraDentroDoPrazo, MAPA_DIAS_COMPRA, ultimasComprasPorPerfil } from "@/lib/mapaCompra";

function colunaMapaAusente(err: { message?: string; code?: string } | null | undefined) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("mapa_") || err?.code === "PGRST204" || err?.code === "42703";
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAdminContext();
    if (!ctx.supabase || !ctx.userId) {
      return NextResponse.json({ ok: false, error: ctx.error }, { status: ctx.status });
    }
    const admin = await assertAdmin(ctx.supabase, ctx.userId);
    if (!admin.ok) return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const acao = String(body.acao || "");
    const db = ctx.supabase;

    if (acao === "varrer") {
      const { data, error } = await db.from("profiles").select("id").eq("mapa_visivel", true);
      if (error) {
        if (colunaMapaAusente(error)) {
          return NextResponse.json(
            { ok: false, error: "Rode supabase/mapa_saloes.sql no SQL Editor do Supabase." },
            { status: 400 }
          );
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      const ids = (data || []).map((r) => String(r.id));
      const ultimas = await ultimasComprasPorPerfil(db, ids);
      const sair = ids.filter((id) => !compraDentroDoPrazo(ultimas.get(id)));
      if (sair.length) {
        const { error: up } = await db.from("profiles").update({ mapa_visivel: false }).in("id", sair);
        if (up) return NextResponse.json({ ok: false, error: up.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, desativados: sair.length });
    }

    const userId = String(body.user_id || "");
    if (!userId) return NextResponse.json({ ok: false, error: "Membro não informado." }, { status: 400 });

    if (acao === "desativar") {
      const { error } = await db.from("profiles").update({ mapa_visivel: false }).eq("id", userId);
      if (error) {
        if (colunaMapaAusente(error)) {
          return NextResponse.json(
            { ok: false, error: "Rode supabase/mapa_saloes.sql no SQL Editor do Supabase." },
            { status: 400 }
          );
        }
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, mapa_visivel: false });
    }

    if (acao !== "ativar") {
      return NextResponse.json({ ok: false, error: "Ação inválida." }, { status: 400 });
    }

    const ultimas = await ultimasComprasPorPerfil(db, [userId]);
    if (!compraDentroDoPrazo(ultimas.get(userId))) {
      return NextResponse.json(
        {
          ok: false,
          error: `Só entra no mapa quem comprou nos últimos ${MAPA_DIAS_COMPRA} dias.`,
        },
        { status: 400 }
      );
    }

    const { data: perfil, error: errPerfil } = await db
      .from("profiles")
      .select("id, full_name, city, state, studio_address, logradouro, address, numero, number, bairro, neighborhood, municipio, uf")
      .eq("id", userId)
      .maybeSingle();
    if (errPerfil || !perfil) {
      return NextResponse.json({ ok: false, error: errPerfil?.message || "Membro não encontrado." }, { status: 404 });
    }

    const cidade = String(perfil.municipio || perfil.city || "").trim();
    const uf = String(perfil.uf || perfil.state || "").trim();
    if (!cidade) {
      return NextResponse.json(
        { ok: false, error: "Este cadastro não tem cidade. Preencha antes de ativar o mapa." },
        { status: 400 }
      );
    }

    const ponto =
      (await geocodificar(consultaGeocode(perfil))) ||
      (await geocodificar([cidade, uf, "Brasil"].filter(Boolean).join(", ")));
    if (!ponto) {
      return NextResponse.json(
        { ok: false, error: "Não localizei a cidade deste cadastro no mapa." },
        { status: 422 }
      );
    }

    const { error } = await db
      .from("profiles")
      .update({ mapa_visivel: true, mapa_lat: ponto.lat, mapa_lng: ponto.lng })
      .eq("id", userId);
    if (error) {
      if (colunaMapaAusente(error)) {
        return NextResponse.json(
          { ok: false, error: "Rode supabase/mapa_saloes.sql no SQL Editor do Supabase." },
          { status: 400 }
        );
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, mapa_visivel: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha ao atualizar o mapa.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
