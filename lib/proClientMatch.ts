export function normalizeName(s: string | null | undefined) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function normalizePhoneDigits(s: string | null | undefined) {
  return String(s || "").replace(/\D/g, "");
}

export function appointmentMatchesClient(
  apt: { client_name?: string | null; client_phone?: string | null },
  client: { name: string; phone?: string | null }
): boolean {
  const nApt = normalizeName(apt.client_name);
  const nCli = normalizeName(client.name);
  if (nApt && nCli && nApt === nCli) return true;
  const pApt = normalizePhoneDigits(apt.client_phone);
  const pCli = normalizePhoneDigits(client.phone);
  if (pApt.length >= 8 && pCli.length >= 8) {
    if (pApt === pCli) return true;
    if (pApt.endsWith(pCli) || pCli.endsWith(pApt)) return true;
  }
  return false;
}
