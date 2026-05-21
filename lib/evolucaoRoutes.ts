/** Slug usado em /evolucao/[code] — evita href quebrado (undefined). */
export function getCoursePath(
  course: { code?: string | null; slug?: string | null; id?: string | null } | null | undefined
): string | null {
  if (!course) return null;
  const key = String(course.code || course.slug || course.id || "").trim();
  if (!key || key === "undefined" || key === "null") return null;
  return `/evolucao/${encodeURIComponent(key)}`;
}
