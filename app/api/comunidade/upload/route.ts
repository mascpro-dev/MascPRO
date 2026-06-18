import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);
const VIDEO_EXT = new Set(["mp4", "mov", "webm", "m4v", "3gp"]);

function extFromName(name: string): string {
  const parts = name.split(".");
  return (parts[parts.length - 1] || "bin").toLowerCase();
}

function mimeFromExt(ext: string, isVideo: boolean): string {
  if (isVideo) {
    if (ext === "mov") return "video/quicktime";
    if (ext === "webm") return "video/webm";
    if (ext === "3gp") return "video/3gpp";
    return "video/mp4";
  }
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "image/jpeg";
}

function isVideoFile(file: File, ext: string): boolean {
  if (file.type.startsWith("video/")) return true;
  return VIDEO_EXT.has(ext);
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
    if (!serviceKey) {
      return NextResponse.json(
        { ok: false, error: "Upload indisponível (service role)." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ ok: false, error: "Arquivo inválido." }, { status: 400 });
    }

    const ext = extFromName(file.name);
    const video = isVideoFile(file, ext);
    const maxBytes = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;

    if (!video && !IMAGE_EXT.has(ext) && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Formato de imagem não suportado. Use JPG, PNG, WebP ou HEIC." },
        { status: 400 }
      );
    }
    if (video && !VIDEO_EXT.has(ext) && !file.type.startsWith("video/")) {
      return NextResponse.json(
        { ok: false, error: "Formato de vídeo não suportado. Use MP4 ou MOV." },
        { status: 400 }
      );
    }
    if (file.size > maxBytes) {
      return NextResponse.json(
        {
          ok: false,
          error: video
            ? "Vídeo muito grande. Máximo 80 MB."
            : "Imagem muito grande. Máximo 12 MB.",
        },
        { status: 400 }
      );
    }

    const safeExt = video
      ? VIDEO_EXT.has(ext)
        ? ext === "mov"
          ? "mov"
          : ext
        : "mp4"
      : IMAGE_EXT.has(ext)
        ? ext === "jpeg"
          ? "jpg"
          : ext
        : "jpg";

    const path = `posts/${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${safeExt}`;
    const contentType = file.type || mimeFromExt(safeExt, video);
    const bytes = Buffer.from(await file.arrayBuffer());

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const { error: upErr } = await supabase.storage.from("community-media").upload(path, bytes, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    const publicUrl = supabase.storage.from("community-media").getPublicUrl(path).data.publicUrl;

    return NextResponse.json({
      ok: true,
      url: publicUrl,
      media_type: video ? "video" : "image",
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro no upload.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
