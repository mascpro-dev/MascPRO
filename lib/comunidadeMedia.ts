export const COMMUNITY_BUCKET = "community-media";

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"]);
const VIDEO_EXT = new Set(["mp4", "mov", "webm", "m4v", "3gp"]);

export function extFromName(name: string): string {
  const parts = (name || "").split(".");
  return (parts[parts.length - 1] || "bin").toLowerCase();
}

export function mimeFromExt(ext: string, isVideo: boolean): string {
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

export function isVideoMedia(mime: string, ext: string): boolean {
  if ((mime || "").startsWith("video/")) return true;
  return VIDEO_EXT.has(ext);
}

export function classifyCommunityMedia(
  filename: string,
  mime: string,
  size: number
):
  | { ok: true; video: boolean; safeExt: string; contentType: string }
  | { ok: false; error: string } {
  const ext = extFromName(filename);
  const video = isVideoMedia(mime, ext);

  if (!video && !IMAGE_EXT.has(ext) && !mime.startsWith("image/")) {
    return { ok: false, error: "Formato de imagem não suportado. Use JPG, PNG, WebP ou HEIC." };
  }
  if (video && !VIDEO_EXT.has(ext) && !mime.startsWith("video/")) {
    return { ok: false, error: "Formato de vídeo não suportado. Use MP4 ou MOV." };
  }

  const maxBytes = video ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (size > maxBytes) {
    return {
      ok: false,
      error: video ? "Vídeo muito grande. Máximo 80 MB." : "Imagem muito grande. Máximo 12 MB.",
    };
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

  return {
    ok: true,
    video,
    safeExt,
    contentType: mime || mimeFromExt(safeExt, video),
  };
}

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;

/** Reduz foto de celular antes do envio (a Vercel rejeita arquivos grandes na API). */
export async function compressCommunityImage(file: File): Promise<File> {
  const mime = (file.type || "").toLowerCase();
  if (mime.includes("gif")) return file;
  if (mime.startsWith("video/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    let width = bitmap.width;
    let height = bitmap.height;
    if (!width || !height) {
      bitmap.close();
      return file;
    }

    const longest = Math.max(width, height);
    if (longest > MAX_EDGE) {
      const scale = MAX_EDGE / longest;
      width = Math.max(1, Math.round(width * scale));
      height = Math.max(1, Math.round(height * scale));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob || blob.size <= 0) return file;
    if (blob.size >= file.size && file.size <= 3 * 1024 * 1024) return file;

    const base = (file.name || "foto").replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
