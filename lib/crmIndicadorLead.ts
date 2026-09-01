import type { SupabaseClient } from "@supabase/supabase-js";

export const ROLES_INDICADOR = new Set([
  "CABELEIREIRO",
  "EMBAIXADOR",
  "DISTRIBUIDOR",
  "VENDEDOR",
]);

const STATUS_PAGO = ["paid", "separacao", "despachado", "entregue"];

export type LeadIndicadorRef = {
  id: string;
  indicador_id?: string | null;
  responsavel_id?: string | null;
};

export function parseIndicadorIdBody(body: Record<string, unknown>): string | null {
  const raw = body.indicador_id;
  if (raw === null || raw === undefined || raw === "") return null;
  return String(raw).trim() || null;
}

export function resolverIndicadorId(
  lead: Pick<LeadIndicadorRef, "indicador_id" | "responsavel_id">,
  bodyIndicadorId: string | null,
  closingUserId: string
): string | null {
  return bodyIndicadorId ?? lead.indicador_id ?? lead.responsavel_id ?? closingUserId;
}

export async function contarPedidosPagosComprador(
  supabase: SupabaseClient,
  profileId: string
): Promise<number> {
  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .in("status", STATUS_PAGO);
  return count || 0;
}

export async function aplicarIndicadorNoPerfilComprador(
  supabase: SupabaseClient,
  profileId: string,
  indicadorId: string
): Promise<{ ok: true; alterado: boolean } | { ok: false; error: string }> {
  const pagos = await contarPedidosPagosComprador(supabase, profileId);
  if (pagos > 0) {
    return { ok: true, alterado: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ indicado_por: indicadorId, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) return { ok: false, error: error.message };
  return { ok: true, alterado: true };
}

export async function salvarIndicadorNoLead(
  supabase: SupabaseClient,
  leadId: string,
  indicadorId: string | null
) {
  if (!indicadorId) return;
  await supabase.from("crm_leads").update({ indicador_id: indicadorId }).eq("id", leadId);
}

export type ContextoIndicador = {
  viewerRole: string;
  viewerId: string;
  distribuidorId?: string | null;
};

export async function indicadorPermitidoParaContexto(
  supabase: SupabaseClient,
  indicadorId: string,
  ctx: ContextoIndicador
): Promise<boolean> {
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", indicadorId)
    .maybeSingle();

  if (!perfil?.id) return false;
  const role = String(perfil.role || "").toUpperCase();
  if (!ROLES_INDICADOR.has(role)) return false;

  const viewerRole = String(ctx.viewerRole || "").toUpperCase();
  if (viewerRole === "ADMIN") return true;
  if (indicadorId === ctx.viewerId) return true;

  const idsPermitidos = await idsIndicadoresPermitidos(supabase, ctx);
  return idsPermitidos.has(indicadorId);
}

async function idsIndicadoresPermitidos(
  supabase: SupabaseClient,
  ctx: ContextoIndicador
): Promise<Set<string>> {
  const ids = new Set<string>([ctx.viewerId]);
  const role = String(ctx.viewerRole || "").toUpperCase();

  if (role === "DISTRIBUIDOR") {
    const rede = await idsRedeDistribuidor(supabase, ctx.viewerId);
    rede.forEach((id) => ids.add(id));
    return ids;
  }

  if (role === "EMBAIXADOR") {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("indicado_por", ctx.viewerId);
    (data || []).forEach((p: { id: string }) => ids.add(p.id));
    return ids;
  }

  if (role === "VENDEDOR" && ctx.distribuidorId) {
    const rede = await idsRedeDistribuidor(supabase, ctx.distribuidorId);
    rede.forEach((id) => ids.add(id));
    return ids;
  }

  return ids;
}

async function idsRedeDistribuidor(
  supabase: SupabaseClient,
  distribuidorId: string
): Promise<string[]> {
  const { data: vendedores } = await supabase
    .from("profiles")
    .select("id")
    .eq("indicado_por", distribuidorId)
    .eq("role", "VENDEDOR");

  const vendedorIds = (vendedores || []).map((v: { id: string }) => v.id);
  const pais = [distribuidorId, ...vendedorIds];

  const { data: rede } = await supabase
    .from("profiles")
    .select("id")
    .in("indicado_por", pais);

  const todos = new Set<string>([distribuidorId, ...vendedorIds]);
  (rede || []).forEach((p: { id: string }) => todos.add(p.id));
  return [...todos];
}

export async function processarIndicadorNoFechamento(
  supabase: SupabaseClient,
  params: {
    lead: LeadIndicadorRef;
    body: Record<string, unknown>;
    profileId: string | null;
    closingUserId: string;
    ctx: ContextoIndicador;
  }
): Promise<
  | {
      ok: true;
      indicadorId: string | null;
      indicadorAlteradoNoPerfil: boolean;
      aviso?: string;
    }
  | { ok: false; error: string }
> {
  const bodyIndicadorId = parseIndicadorIdBody(params.body);
  const indicadorId = resolverIndicadorId(
    params.lead,
    bodyIndicadorId,
    params.closingUserId
  );

  if (!indicadorId) {
    return { ok: true, indicadorId: null, indicadorAlteradoNoPerfil: false };
  }

  const permitido = await indicadorPermitidoParaContexto(
    supabase,
    indicadorId,
    params.ctx
  );
  if (!permitido) {
    return { ok: false, error: "Indicador selecionado não permitido para sua conta." };
  }

  await salvarIndicadorNoLead(supabase, params.lead.id, indicadorId);

  let indicadorAlteradoNoPerfil = false;
  let aviso: string | undefined;

  if (params.profileId) {
    const resultado = await aplicarIndicadorNoPerfilComprador(
      supabase,
      params.profileId,
      indicadorId
    );
    if (!resultado.ok) return { ok: false, error: resultado.error };
    indicadorAlteradoNoPerfil = resultado.alterado;
    if (!resultado.alterado) {
      aviso =
        "O comprador já possui pedido pago; a indicação no cadastro não foi alterada.";
    }
  }

  return { ok: true, indicadorId, indicadorAlteradoNoPerfil, aviso };
}

export async function buscarPerfilComprador(
  supabase: SupabaseClient,
  profileId: string
): Promise<{ id: string; role: string | null; indicado_por: string | null } | null> {
  const { data } = await supabase
    .from("profiles")
    .select("id, role, indicado_por")
    .eq("id", profileId)
    .maybeSingle();
  return data || null;
}
