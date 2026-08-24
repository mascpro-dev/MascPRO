import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  COMMUNITY_BUCKET,
  classifyCommunityMedia,
} from "@/lib/comunidadeMedia";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function ensureCommunityBucket(supabase: SupabaseClient) {
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) return;
  const existing = (buckets || []).find((b) => b.id === COMMUNITY_BUCKET);
  if (!existing) {
    await supabase.storage.createBucket(COMMUNITY_BUCKET, {
      public: true,
      fileSizeLimit: 80 * 1024 * 1024,
    });
    return;
  }
  if (!existing.public) {
    await supabase.storage.updateBucket(COMMUNITY_BUCKET, { public: true });
  }
}

function buildPath(userId: string, safeExt: string) {
  return `posts/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
}

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
      return NextResponse.json(
        { ok: false, error: "Upload indisponível (service role)." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    await ensureCommunityBucket(supabase);

    const headerType = req.headers.get("content-type") || "";

    // JSON: gera URL assinada e o arquivo vai direto ao Storage (não passa pela Vercel).
    if (headerType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      const filename = String(body.filename || body.name || "foto.jpg");
      const mime = String(body.contentType || body.type || "");
      const size = Number(body.size || 0);

      const classified = classifyCommunityMedia(filename, mime, size);
      if (!classified.ok) {
        return NextResponse.json({ ok: false, error: classified.error }, { status: 400 });
      }

      const path = buildPath(session.user.id, classified.safeExt);
      const { data, error } = await supabase.storage
        .from(COMMUNITY_BUCKET)
        .createSignedUploadUrl(path);

      if (error || !data?.token || !data?.signedUrl) {
        return NextResponse.json(
          { ok: false, error: error?.message || "Não foi possível preparar o envio." },
          { status: 500 }
        );
      }

      const publicUrl = supabase.storage.from(COMMUNITY_BUCKET).getPublicUrl(path).data.publicUrl;

      return NextResponse.json({
        ok: true,
        path: data.path || path,
        token: data.token,
        signedUrl: data.signedUrl,
        url: publicUrl,
        media_type: classified.video ? "video" : "image",
        contentType: classified.contentType,
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob) || file.size <= 0) {
      return NextResponse.json({ ok: false, error: "Arquivo inválido." }, { status: 400 });
    }

    const filename = file instanceof File && file.name ? file.name : "foto.jpg";
    const mime = file.type || "";
    const classified = classifyCommunityMedia(filename, mime, file.size);
    if (!classified.ok) {
      return NextResponse.json({ ok: false, error: classified.error }, { status: 400 });
    }

    const path = buildPath(session.user.id, classified.safeExt);
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(COMMUNITY_BUCKET).upload(path, bytes, {
      contentType: classified.contentType,
      cacheControl: "3600",
      upsert: false,
    });

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const publicUrl = supabase.storage.from(COMMUNITY_BUCKET).getPublicUrl(path).data.publicUrl;

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      media_type: classified.video ? "video" : "image",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro no upload.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
