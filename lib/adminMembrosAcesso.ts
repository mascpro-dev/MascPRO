import type { SupabaseClient } from "@supabase/supabase-js";
import { assertAdminOrDistribuidor } from "@/lib/adminServer";
import { idsRedeComercial } from "@/lib/crmCarteiraServidor";
import { normalizarUf } from "@/lib/forcaAcesso";

export const PAPEIS_CADASTRO_DISTRIBUIDOR = [
  "CABELEIREIRO",
  "EMBAIXADOR",
  "EDUCADOR_TECNICO",
  "CLIENTE",
] as const;

const PAPEIS_INTERNOS = new Set(["ADMIN", "DISTRIBUIDOR"]);

export type ContextoMembros = {
  ok: true;
  role: "ADMIN" | "DISTRIBUIDOR";
  uf: string;
  redeIds: string[];
};

export function papelMembro(role: unknown): string {
  return String(role || "").trim().toUpperCase();
}

export async function ufDoUsuario(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("uf, state")
    .eq("id", userId)
    .maybeSingle();
  return normalizarUf(data?.uf || data?.state);
}

export function membroNoEscopoDistribuidor(
  membro: {
    id?: string | null;
    role?: string | null;
    indicado_por?: string | null;
    uf?: string | null;
    state?: string | null;
  },
  opts: { userId: string; uf: string; redeIds: string[] }
): boolean {
  const role = papelMembro(membro.role);
  if (PAPEIS_INTERNOS.has(role)) return false;
  if (membro.id && membro.id === opts.userId) return false;
  const ufMembro = normalizarUf(membro.uf || membro.state);
  if (opts.uf && ufMembro === opts.uf) return true;
  const indicado = String(membro.indicado_por || "");
  return Boolean(indicado && opts.redeIds.includes(indicado));
}

export async function contextoMembros(
  supabase: SupabaseClient,
  userId: string
): Promise<ContextoMembros | { ok: false; error: string }> {
  const access = await assertAdminOrDistribuidor(supabase, userId);
  if (!access.ok) return access;
  if (access.role === "ADMIN") {
    return { ok: true, role: "ADMIN", uf: "", redeIds: [] };
  }
  const [uf, redeIds] = await Promise.all([
    ufDoUsuario(supabase, userId),
    idsRedeComercial(supabase, userId),
  ]);
  return { ok: true, role: "DISTRIBUIDOR", uf, redeIds };
}

export async function podeEditarCadastro(
  supabase: SupabaseClient,
  ctx: { role: string; userId: string; uf: string; redeIds: string[] },
  alvoId: string
): Promise<
  | { ok: true; alvo: { role: string; indicado_por: string | null } }
  | { ok: false; error: string }
> {
  const { data } = await supabase
    .from("profiles")
    .select("id, role, indicado_por, uf, state")
    .eq("id", alvoId)
    .maybeSingle();
  if (!data) return { ok: false, error: "Cadastro não encontrado." };
  if (ctx.role === "ADMIN") {
    return { ok: true, alvo: { role: papelMembro(data.role), indicado_por: data.indicado_por } };
  }
  if (!membroNoEscopoDistribuidor(data, { userId: ctx.userId, uf: ctx.uf, redeIds: ctx.redeIds })) {
    return { ok: false, error: "Sem acesso a este cadastro." };
  }
  return { ok: true, alvo: { role: papelMembro(data.role), indicado_por: data.indicado_por } };
}

/** Papel que o distribuidor pode gravar. Vendedor da equipe permanece vendedor. */
export function rolePermitidoParaDistribuidor(roleNovo: unknown, roleAtual: string): string | null {
  const atual = papelMembro(roleAtual);
  if (atual === "VENDEDOR") return "VENDEDOR";
  const novo = papelMembro(roleNovo) || atual;
  if ((PAPEIS_CADASTRO_DISTRIBUIDOR as readonly string[]).includes(novo)) return novo;
  if ((PAPEIS_CADASTRO_DISTRIBUIDOR as readonly string[]).includes(atual)) return atual;
  return null;
}
