import type { SupabaseClient } from "@supabase/supabase-js";

export type GestorTipo = "empresa" | "distribuidor";

export type BuyerProfile = {
  id: string;
  role: string | null;
  indicado_por: string | null;
};

/**
 * Define quem gerencia o pedido após o fechamento:
 * - empresa: vendas de embaixadora, cabeleireira e do próprio distribuidor
 * - distribuidor: clientes finais do distribuidor (leads/consumidores)
 */
export function resolveOrderGestor(params: {
  buyer: BuyerProfile | null;
  indicadorRole: string | null;
  closingUserId: string;
  closingUserRole: string;
  leadResponsavelId: string | null;
}): { gestor_tipo: GestorTipo; distribuidor_gestor_id: string | null } {
  const buyerRole = String(params.buyer?.role || "").toUpperCase();
  const closingRole = String(params.closingUserRole || "").toUpperCase();

  if (closingRole === "VENDEDOR" && params.leadResponsavelId) {
    return {
      gestor_tipo: "distribuidor",
      distribuidor_gestor_id: params.leadResponsavelId,
    };
  }

  if (["CABELEIREIRO", "EMBAIXADOR", "DISTRIBUIDOR"].includes(buyerRole)) {
    return { gestor_tipo: "empresa", distribuidor_gestor_id: null };
  }

  if (String(params.indicadorRole || "").toUpperCase() === "EMBAIXADOR") {
    return { gestor_tipo: "empresa", distribuidor_gestor_id: null };
  }

  const distId =
    closingRole === "DISTRIBUIDOR"
      ? params.closingUserId
      : params.leadResponsavelId;

  if (distId) {
    return { gestor_tipo: "distribuidor", distribuidor_gestor_id: distId };
  }

  return { gestor_tipo: "empresa", distribuidor_gestor_id: null };
}

export async function fetchIndicadorRole(
  supabase: SupabaseClient,
  indicadoPor: string | null
): Promise<string | null> {
  if (!indicadoPor) return null;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", indicadoPor)
    .maybeSingle();
  return data?.role ? String(data.role) : null;
}

export async function assertCanChangeOrderStatus(
  supabase: SupabaseClient,
  userId: string,
  order: {
    gestor_tipo?: string | null;
    distribuidor_gestor_id?: string | null;
  }
): Promise<{ ok: true; role: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  const role = String(data?.role || "").trim().toUpperCase();
  if (role === "ADMIN") return { ok: true, role };

  if (role === "DISTRIBUIDOR") {
    const gestor = String(order.gestor_tipo || "empresa").toLowerCase();
    if (gestor === "distribuidor" && order.distribuidor_gestor_id === userId) {
      return { ok: true, role };
    }
    return {
      ok: false,
      error: "Este pedido é gerenciado pela empresa MascPRO.",
    };
  }

  return { ok: false, error: "Sem permissão para alterar este pedido." };
}
