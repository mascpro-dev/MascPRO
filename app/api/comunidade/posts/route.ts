import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabaseAuth = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabaseAuth.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json({ ok: false, error: "Publicação indisponível." }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const content = String(body.content || "").trim();
    const mediaUrl = String(body.media_url || "").trim() || null;
    const mediaType = body.media_type === "video" ? "video" : mediaUrl ? "image" : null;

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { ok: false, error: "Escreva um texto ou envie uma foto/vídeo." },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const row: Record<string, unknown> = {
      user_id: session.user.id,
      content: content || "",
    };
    if (mediaUrl) {
      row.media_url = mediaUrl;
      row.media_type = mediaType;
    }

    let { data, error } = await supabase
      .from("community_posts")
      .insert(row)
      .select("id")
      .maybeSingle();

    if (error && /null value.*content/i.test(error.message)) {
      const retry = await supabase
        .from("community_posts")
        .insert({ ...row, content: content || " " })
        .select("id")
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (error && /media_url|media_type|schema cache/i.test(error.message)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "O banco ainda não aceita foto/vídeo no post. Rode o SQL supabase/community_posts.sql no Supabase.",
        },
        { status: 500 }
      );
    }

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, id: data?.id || null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao publicar.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
