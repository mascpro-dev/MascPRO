/**
 * Rate Limiter em memória para Next.js API Routes
 *
 * Funciona em instância única (dev e single-pod).
 * Para produção multi-instância no Vercel, substituir por Upstash Redis:
 * https://github.com/upstash/ratelimit
 *
 * Uso:
 *   const limit = await rateLimit(req, { max: 10, windowMs: 60_000 })
 *   if (!limit.ok) return NextResponse.json({ error: "Muitas requisições." }, { status: 429 })
 */

import { NextRequest } from "next/server";

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

// Limpa entradas expiradas a cada 5 minutos
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of store.entries()) {
      if (v.resetAt < now) store.delete(k);
    }
  }, 5 * 60 * 1000);
}

export async function rateLimit(
  req: NextRequest,
  options: {
    max: number;        // máximo de requisições
    windowMs: number;  // janela em ms
    prefix?: string;   // prefixo para diferenciar rotas
  }
): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const key = `${options.prefix || "rl"}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.max - 1, resetAt: now + options.windowMs };
  }

  entry.count += 1;

  if (entry.count > options.max) {
    return { ok: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { ok: true, remaining: options.max - entry.count, resetAt: entry.resetAt };
}

// Configurações pré-definidas para as rotas críticas
export const LIMITS = {
  checkout:       { max: 10,  windowMs: 60_000,   prefix: "checkout"   }, // 10/min por IP
  saques:         { max: 5,   windowMs: 60_000,   prefix: "saques"     }, // 5/min
  nfe:            { max: 20,  windowMs: 60_000,   prefix: "nfe"        }, // 20/min
  login:          { max: 10,  windowMs: 60_000,   prefix: "login"      }, // 10/min
  crmLeads:       { max: 60,  windowMs: 60_000,   prefix: "crm-leads"  }, // 60/min
  webhook:        { max: 200, windowMs: 60_000,   prefix: "webhook"    }, // alto pois MP pode reenviar
} as const;
