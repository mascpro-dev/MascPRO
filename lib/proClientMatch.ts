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

/** Prioriza vínculo por client_id; senão usa nome/telefone (registros antigos). */
export function appointmentBelongsToClient(
  apt: {
    client_id?: string | null;
    client_name?: string | null;
    client_phone?: string | null;
  },
  client: { id: string; name: string; phone?: string | null }
): boolean {
  const cid = apt.client_id;
  if (cid && client.id) return String(cid) === String(client.id);
  return appointmentMatchesClient(apt, client);
}
