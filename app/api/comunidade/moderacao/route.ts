import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";

export const dynamic = "force-dynamic";

function storagePathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = "/community-media/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json(
        { ok: false, error: error || "Não autenticado." },
        { status: status || 401 }
      );
    }

    const adm = await assertAdmin(supabase, userId);
    if (!adm.ok) {
      return NextResponse.json({ ok: false, error: adm.error }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tipo = String(body.tipo || body.type || "").toLowerCase();
    const id = String(body.id || "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID obrigatório." }, { status: 400 });
    }

    if (tipo === "comment" || tipo === "comentario") {
      const { error: delErr } = await supabase.from("comments").delete().eq("id", id);
      if (delErr) {
        return NextResponse.json({ ok: false, error: delErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (tipo === "post") {
      const { data: post } = await supabase
        .from("community_posts")
        .select("id, media_url")
        .eq("id", id)
        .maybeSingle();

      if (!post) {
        return NextResponse.json({ ok: false, error: "Post não encontrado." }, { status: 404 });
      }

      await supabase.from("comments").delete().eq("post_id", id);
      await supabase.from("likes").delete().eq("post_id", id);

      const { error: delPost } = await supabase.from("community_posts").delete().eq("id", id);
      if (delPost) {
        return NextResponse.json({ ok: false, error: delPost.message }, { status: 500 });
      }

      const storagePath = storagePathFromPublicUrl(post.media_url);
      if (storagePath) {
        await supabase.storage.from("community-media").remove([storagePath]);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { ok: false, error: "tipo inválido (use post ou comment)." },
      { status: 400 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
