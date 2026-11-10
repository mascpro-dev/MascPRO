import type { SupabaseClient } from "@supabase/supabase-js";
import { buscarTodasAsPaginas } from "@/lib/crmBuscarTodasPaginas";
import { idsRedeComercial } from "@/lib/crmCarteiraServidor";

export type PapelForca = "ADMIN" | "DISTRIBUIDOR" | "VENDEDOR";

export type ForcaAcesso = {
  ok: true;
  papel: PapelForca;
  full_name: string;
  distribuidor_id: string | null;
  uf: string | null;
};

const SELECT_LEAD =
  "id, nome, empresa, telefone, dono_nome, dono_telefone, cidade, estado, endereco, bairro, cep, perfil_comercial, relacionamento, proxima_acao, proxima_acao_em, data_followup, status, profile_id, created_by, responsavel_id";

export function normalizarUf(valor: unknown): string {
  const sigla = String(valor || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(sigla) ? sigla : "";
}

export async function assertForcaAcesso(
  supabase: SupabaseClient,
  userId: string
): Promise<ForcaAcesso | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, full_name, indicado_por, uf, state")
    .eq("id", userId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  const papel = String(data?.role || "").toUpperCase();
  const uf = normalizarUf(data?.uf || data?.state);
  if (papel === "ADMIN") {
    return { ok: true, papel, full_name: String(data?.full_name || ""), distribuidor_id: null, uf: uf || null };
  }
  if (papel === "DISTRIBUIDOR") {
    return { ok: true, papel, full_name: String(data?.full_name || ""), distribuidor_id: userId, uf: uf || null };
  }
  if (papel === "VENDEDOR") {
    const distribuidor_id = String(data?.indicado_por || "");
    if (!distribuidor_id) return { ok: false, error: "Vendedor sem distribuidor vinculado." };
    return { ok: true, papel, full_name: String(data?.full_name || ""), distribuidor_id, uf: uf || null };
  }
  return { ok: false, error: "A Força de Vendas é de admin, distribuidor e vendedor." };
}

export async function listarLeadsDaForca(
  supabase: SupabaseClient,
  acesso: ForcaAcesso,
  userId: string
): Promise<{ leads: Record<string, unknown>[]; aviso: string | null; error: string | null }> {
  if (acesso.papel === "VENDEDOR") {
    const lista = await buscarTodasAsPaginas((inicio, fim) =>
      supabase
        .from("crm_leads")
        .select(SELECT_LEAD)
        .or(`created_by.eq.${userId},responsavel_id.eq.${userId}`)
        .order("nome", { ascending: true })
        .range(inicio, fim)
    );
    return { leads: lista.data, aviso: null, error: lista.error };
  }

  if (acesso.papel === "ADMIN") {
    const lista = await buscarTodasAsPaginas((inicio, fim) =>
      supabase.from("crm_leads").select(SELECT_LEAD).order("nome", { ascending: true }).range(inicio, fim)
    );
    return { leads: lista.data, aviso: null, error: lista.error };
  }

  const avisos: string[] = [];
  if (!acesso.uf) {
    avisos.push("Cadastre a UF do distribuidor no perfil para ver todos os salões da região.");
  }

  const porRegiao = acesso.uf
    ? await buscarTodasAsPaginas((inicio, fim) =>
        supabase
          .from("crm_leads")
          .select(SELECT_LEAD)
          .ilike("estado", acesso.uf as string)
          .order("nome", { ascending: true })
          .range(inicio, fim)
      )
    : { data: [], error: null as string | null };

  const rede = await idsRedeComercial(supabase, userId);
  const porEquipe = await buscarTodasAsPaginas((inicio, fim) =>
    supabase
      .from("crm_leads")
      .select(SELECT_LEAD)
      .or(rede.map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(","))
      .order("nome", { ascending: true })
      .range(inicio, fim)
  );

  if (porRegiao.error || porEquipe.error) {
    return { leads: [], aviso: null, error: porRegiao.error || porEquipe.error };
  }

  const mapa = new Map<string, Record<string, unknown>>();
  for (const lead of [...porRegiao.data, ...porEquipe.data]) {
    mapa.set(String(lead.id), lead as Record<string, unknown>);
  }
  return { leads: [...mapa.values()], aviso: avisos[0] || null, error: null };
}

export async function podeOperarLeadForca(
  supabase: SupabaseClient,
  acesso: ForcaAcesso,
  userId: string,
  leadId: string
): Promise<boolean> {
  if (acesso.papel === "ADMIN") return true;
  const { data } = await supabase
    .from("crm_leads")
    .select("id, created_by, responsavel_id, estado")
    .eq("id", leadId)
    .maybeSingle();
  if (!data) return false;
  if (acesso.papel === "VENDEDOR") {
    return data.created_by === userId || data.responsavel_id === userId;
  }
  if (acesso.uf && normalizarUf(data.estado) === acesso.uf) return true;
  const rede = await idsRedeComercial(supabase, userId);
  return rede.includes(data.created_by) || rede.includes(data.responsavel_id);
}
