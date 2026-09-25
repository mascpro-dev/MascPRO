import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { validateBookingSlugInput } from "@/lib/bookingSlug";
import { camposLocalizacaoSync } from "@/lib/profileLocalizacao";
import { consultaGeocode, geocodificar } from "@/lib/mapaSaloes";

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });

    const body = await req.json();

    // Campos permitidos para atualização (mapeados para colunas reais do banco)
    const campos: Record<string, any> = {
      full_name: body.full_name,
      whatsapp: body.whatsapp,
      instagram: body.instagram,
      work_type: body.work_type,
      experience: body.experience,
      updated_at: new Date().toISOString(),
      ...camposLocalizacaoSync(body.city, body.state),
    };

    // Campos opcionais (podem não existir no banco ainda — ignorar erro de coluna)
    if (body.bio !== undefined) campos.bio = body.bio;
    if (body.barber_shop !== undefined) campos.barber_shop = body.barber_shop;
    if (body.booking_slug !== undefined) {
      const v = validateBookingSlugInput(String(body.booking_slug ?? ""));
      if (!v.ok) {
        return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
      }
      campos.booking_slug = v.slug ? v.slug : null;
    }
    if (body.username !== undefined) campos.username = body.username;
    if (body.avatar_url !== undefined && typeof body.avatar_url === "string") {
      campos.avatar_url = body.avatar_url.trim() || null;
    }
    if (body.studio_address !== undefined) campos.studio_address = String(body.studio_address || "").trim() || null;
    if (body.reminder_template !== undefined) {
      campos.reminder_template = String(body.reminder_template || "").trim() || null;
    }
    if (body.reminder_enabled !== undefined) campos.reminder_enabled = Boolean(body.reminder_enabled);

    let avisoMapa: string | null = null;
    const querMapa = body.mapa_visivel === true;
    if (querMapa) {
      campos.mapa_visivel = true;
      if (!String(body.city || "").trim()) {
        avisoMapa = "Seu salão ficou marcado para aparecer no mapa. Informe a cidade e salve de novo para o pin surgir.";
      }
    } else if (body.mapa_visivel === false) {
      campos.mapa_visivel = false;
    }

    // Remove campos undefined
    Object.keys(campos).forEach(k => campos[k] === undefined && delete campos[k]);

    const { error } = await supabase
      .from("profiles")
      .update(campos)
      .eq("id", session.user.id);

    if (error) {
      if (error.code === "23505" && String(error.message || "").toLowerCase().includes("booking_slug")) {
        return NextResponse.json(
          { ok: false, error: "Este final de link já está em uso. Escolha outro." },
          { status: 409 }
        );
      }
      if (String(error.message || "").toLowerCase().includes("mapa_")) {
        delete campos.mapa_visivel;
        delete campos.mapa_lat;
        delete campos.mapa_lng;
        const { error: semMapa } = await supabase.from("profiles").update(campos).eq("id", session.user.id);
        if (!semMapa) {
          return NextResponse.json({
            ok: true,
            mapa_visivel: false,
            aviso:
              "Perfil salvo. O mapa ainda não está no banco, por isso o interruptor volta para Oculto. Rode o arquivo supabase/mapa_saloes.sql no SQL Editor do Supabase e salve de novo.",
          });
        }
      }
      if (error.message.includes("column") || error.code === "PGRST204") {
        const camposBase: Record<string, unknown> = {
          full_name: body.full_name,
          whatsapp: body.whatsapp,
          instagram: body.instagram,
          work_type: body.work_type,
          experience: body.experience,
          updated_at: new Date().toISOString(),
          ...camposLocalizacaoSync(body.city, body.state),
        };
        if (body.avatar_url !== undefined && typeof body.avatar_url === "string") {
          camposBase.avatar_url = body.avatar_url.trim() || null;
        }
        const { error: err2 } = await supabase
          .from("profiles")
          .update(camposBase)
          .eq("id", session.user.id);
        if (err2) return NextResponse.json({ ok: false, error: err2.message }, { status: 500 });
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (querMapa && String(body.city || "").trim()) {
      const cidade = String(body.city || "").trim();
      const uf = String(body.state || "").trim();
      const { data: atual } = await supabase
        .from("profiles")
        .select("studio_address, city, state, logradouro, address, numero, number, bairro, neighborhood, municipio, uf")
        .eq("id", session.user.id)
        .maybeSingle();
      const consulta = consultaGeocode({
        ...(atual || {}),
        city: body.city,
        state: body.state,
        studio_address: body.studio_address ?? atual?.studio_address,
      });
      const ponto =
        (await geocodificar(consulta)) ||
        (await geocodificar([cidade, uf, "Brasil"].filter(Boolean).join(", ")));
      if (ponto) {
        await supabase
          .from("profiles")
          .update({ mapa_lat: ponto.lat, mapa_lng: ponto.lng, mapa_visivel: true })
          .eq("id", session.user.id);
      } else if (!avisoMapa) {
        avisoMapa =
          "Seu salão ficou marcado como visível. O ponto da cidade ainda não foi achado; confira o endereço e salve de novo.";
      }
    }

    return NextResponse.json({
      ok: true,
      aviso: avisoMapa,
      mapa_visivel: campos.mapa_visivel === true,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
