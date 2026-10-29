import { normalizarTelefoneBr } from "@/lib/crmCarteira";

const BASE = "https://api.api4com.com/api/v1";

export type Api4comUsuario = {
  uuid: string;
  name: string;
  email: string;
  role?: string;
  status?: string;
};

export async function api4comMe(token: string): Promise<Api4comUsuario> {
  const res = await fetch(`${BASE}/users/me`, {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "Token API4COM inválido ou vencido." : `API4COM users/me ${res.status}`);
  }
  return res.json();
}

export async function api4comRamal(token: string): Promise<string | null> {
  const res = await fetch(`${BASE}/integrations?filter%5Bwhere%5D%5Bgateway%5D=sippulse`, {
    headers: { Authorization: token },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json = await res.json();
  const lista = Array.isArray(json) ? json : json?.value || [];
  const user = lista[0]?.metadata?.username;
  return user ? String(user) : null;
}

export function numeroE164(raw: string | null | undefined): string | null {
  const n = normalizarTelefoneBr(raw);
  if (!n) return null;
  return n.startsWith("+") ? n : `+${n}`;
}

export async function api4comLigar(params: {
  token: string;
  ramal: string;
  called: string;
  leadId?: string;
}): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
  const res = await fetch(`${BASE}/calls`, {
    method: "POST",
    headers: {
      Authorization: params.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      extension: params.ramal,
      caller: params.ramal,
      called: params.called,
      metadata: {
        gateway: "mascpro",
        leadId: params.leadId || "",
      },
    }),
    signal: AbortSignal.timeout(90000),
  });
  const json = await res.json().catch(() => null);
  if (res.status === 200 && json?.id) {
    return { ok: true, id: String(json.id) };
  }
  const map: Record<number, string> = {
    401: "Token inválido. Gere outro no portal API4COM.",
    402: "Plano da API4COM não permite ligar agora.",
    403: "Conta API4COM sem permissão para ligar.",
    404: "Ramal não encontrado. Confira o Webphone.",
    422: "Número inválido para discar.",
    424: "Abra o Webphone API4COM no Chrome e fique online.",
    429: "Muitas ligações neste minuto. Aguarde um pouco.",
    503: "API4COM indisponível. Tente de novo em instantes.",
  };
  return {
    ok: false,
    status: res.status,
    error: map[res.status] || json?.message || `Falha ao ligar (${res.status}).`,
  };
}
