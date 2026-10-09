import type { SupabaseClient } from "@supabase/supabase-js";
import {
  gravarIdentidadeClienteNoPerfil,
  validarCpfCnpjOpcional,
} from "@/lib/crmFechamentoCliente";

export const SENHA_PADRAO_CRM = "1234567890";

export type LeadParaCadastro = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  cidade: string | null;
  estado: string | null;
  responsavel_id: string | null;
  indicador_id?: string | null;
  profile_id: string | null;
};

export type ResultadoCadastroLead = {
  ok: true;
  profile_id: string;
  email: string;
  senha_temporaria: string;
  full_name: string;
} | {
  ok: false;
  error: string;
  profile_id?: string;
};

export type RoleMembroCrm = "CLIENTE" | "CABELEIREIRO" | "EMBAIXADOR";

function nivelPorRole(role: RoleMembroCrm): string {
  if (role === "CABELEIREIRO") return "cabeleireiro";
  if (role === "EMBAIXADOR") return "embaixador";
  return "cliente";
}

export async function criarMembroDeLead(
  supabase: SupabaseClient,
  params: {
    lead: LeadParaCadastro;
    email?: string;
    indicadoPor?: string | null;
    closingUserId: string;
    vincularLead?: boolean;
    roleMembro?: RoleMembroCrm;
    nomeCliente?: string;
    cpfCnpj?: unknown;
  }
): Promise<ResultadoCadastroLead> {
  const { lead, closingUserId, vincularLead = true } = params;
  const roleMembro = params.roleMembro || "CLIENTE";
  const nome = String(params.nomeCliente || lead.nome || "").trim();
  if (!nome) {
    return { ok: false, error: "Informe o nome do cliente." };
  }
  const cpfCheck = validarCpfCnpjOpcional(params.cpfCnpj);
  if (!cpfCheck.ok) return { ok: false, error: cpfCheck.error };

  if (lead.profile_id) {
    return {
      ok: false,
      error: "Este lead já possui cadastro vinculado.",
      profile_id: lead.profile_id,
    };
  }

  const email = String(params.email || lead.email || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) {
    return {
      ok: false,
      error: "Informe um e-mail válido para criar o cadastro no app.",
    };
  }

  const { data: existente } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", email)
    .maybeSingle();

  if (existente?.id) {
    if (vincularLead) {
      await supabase
        .from("crm_leads")
        .update({ profile_id: existente.id, nome })
        .eq("id", lead.id);
    }
    const preenchido = await gravarIdentidadeClienteNoPerfil(
      supabase,
      existente.id,
      {
        nome,
        cpf_cnpj: cpfCheck.cpf,
        telefone: lead.telefone,
        email,
      },
      { somenteSeVazio: true }
    );
    if (!preenchido.ok) return { ok: false, error: preenchido.error };
    return {
      ok: false,
      error: `Este e-mail já está cadastrado (${existente.full_name || existente.email}). Lead vinculado automaticamente.`,
      profile_id: existente.id,
    };
  }

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: SENHA_PADRAO_CRM,
    email_confirm: true,
    user_metadata: { full_name: nome },
  });

  if (authErr || !authData.user) {
    return {
      ok: false,
      error: authErr?.message || "Falha ao criar usuário no auth.",
    };
  }

  const userId = authData.user.id;
  const indicado =
    params.indicadoPor ??
    lead.indicador_id ??
    lead.responsavel_id ??
    closingUserId;

  const profileRow: Record<string, unknown> = {
    id: userId,
    email,
    full_name: nome,
    cpf_cnpj: cpfCheck.cpf,
    whatsapp: lead.telefone?.trim() || null,
    instagram: lead.instagram?.trim() || null,
    city: lead.cidade?.trim() || null,
    state: lead.estado?.trim()?.toUpperCase().slice(0, 2) || null,
    municipio: lead.cidade?.trim() || null,
    uf: lead.estado?.trim()?.toUpperCase().slice(0, 2) || null,
    role: roleMembro,
    nivel: nivelPorRole(roleMembro),
    indicado_por: indicado || null,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  let { error: profErr } = await supabase
    .from("profiles")
    .upsert(profileRow, { onConflict: "id" });

  if (profErr) {
    const fallback = { ...profileRow };
    delete fallback.nivel;
    delete fallback.onboarding_completed;
    delete fallback.municipio;
    delete fallback.uf;
    delete fallback.cpf_cnpj;
    const retry = await supabase
      .from("profiles")
      .upsert(fallback, { onConflict: "id" });
    profErr = retry.error;
  }

  if (profErr) {
    await supabase.auth.admin.deleteUser(userId);
    return { ok: false, error: `Perfil: ${profErr.message}` };
  }

  if (vincularLead) {
    await supabase
      .from("crm_leads")
      .update({ profile_id: userId, nome })
      .eq("id", lead.id);
  }

  return {
    ok: true,
    profile_id: userId,
    email,
    senha_temporaria: SENHA_PADRAO_CRM,
    full_name: nome,
  };
}
