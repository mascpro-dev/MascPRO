/** Extrai o ID de 11 caracteres do YouTube (URL ou ID direto). */
export function extractYouTubeVideoId(input?: string | null): string | null {
  if (!input) return null;
  const s = String(input).trim();
  if (!s) return null;

  const match = s.match(
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  if (match?.[1]) return match[1];

  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  return null;
}

/** Coluna `video_id` da tabela lessons. */
export function getLessonVideoId(lesson: { video_id?: string | null } | null | undefined): string | null {
  return extractYouTubeVideoId(lesson?.video_id);
}
