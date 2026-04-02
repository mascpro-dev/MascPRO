import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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
      city: body.city,
      state: body.state,
      work_type: body.work_type,
      experience: body.experience,
      updated_at: new Date().toISOString(),
    };

    // Campos opcionais (podem não existir no banco ainda — ignorar erro de coluna)
    if (body.bio !== undefined) campos.bio = body.bio;
    if (body.barber_shop !== undefined) campos.barber_shop = body.barber_shop;
    if (body.username !== undefined) campos.username = body.username;
    if (body.avatar_url !== undefined && typeof body.avatar_url === "string") {
      campos.avatar_url = body.avatar_url.trim() || null;
    }

    // Remove campos undefined
    Object.keys(campos).forEach(k => campos[k] === undefined && delete campos[k]);

    const { error } = await supabase
      .from("profiles")
      .update(campos)
      .eq("id", session.user.id);

    if (error) {
      // Se erro por coluna inexistente, tenta sem os opcionais
      if (error.message.includes("column") || error.code === "PGRST204") {
        const camposBase: Record<string, unknown> = {
          full_name: body.full_name,
          whatsapp: body.whatsapp,
          instagram: body.instagram,
          city: body.city,
          state: body.state,
          work_type: body.work_type,
          experience: body.experience,
          updated_at: new Date().toISOString(),
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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
