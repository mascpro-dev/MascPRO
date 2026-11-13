import type { SupabaseClient } from "@supabase/supabase-js";
import { PAPEIS_CADASTRO_DISTRIBUIDOR, papelMembro } from "@/lib/adminMembrosAcesso";
import { SENHA_PADRAO_CRM } from "@/lib/crmCadastroMembro";
import { validarCpfCnpjOpcional } from "@/lib/crmFechamentoCliente";
import { camposEnderecoCompletoSync } from "@/lib/profileEndereco";
import { normalizarUf } from "@/lib/forcaAcesso";

function nivelPorRole(role: string): string {
  if (role === "EMBAIXADOR" || role === "EDUCADOR_TECNICO") return "embaixador";
  if (role === "DISTRIBUIDOR") return "distribuidor";
  if (role === "CLIENTE") return "cliente";
  return "cabeleireiro";
}

export function roleCadastroValido(role: unknown, viewerRole: string): string | null {
  const r = papelMembro(role) || "CABELEIREIRO";
  if (viewerRole === "ADMIN") {
    const permitidos = [
      "CABELEIREIRO",
      "EMBAIXADOR",
      "EDUCADOR_TECNICO",
      "CLIENTE",
      "VENDEDOR",
      "DISTRIBUIDOR",
    ];
    return permitidos.includes(r) ? r : null;
  }
  return (PAPEIS_CADASTRO_DISTRIBUIDOR as readonly string[]).includes(r) ? r : "CABELEIREIRO";
}

export async function sincronizarLeadDoPerfil(
  supabase: SupabaseClient,
  profileId: string,
  campos: {
    full_name?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    city?: string | null;
    state?: string | null;
    address?: string | null;
    neighborhood?: string | null;
    cep?: string | null;
  }
) {
  const update: Record<string, unknown> = {};
  if (campos.full_name !== undefined) update.nome = campos.full_name || null;
  if (campos.whatsapp !== undefined) update.telefone = campos.whatsapp || null;
  if (campos.email !== undefined) update.email = campos.email || null;
  if (campos.city !== undefined) update.cidade = campos.city || null;
  if (campos.state !== undefined) update.estado = normalizarUf(campos.state) || null;
  if (campos.address !== undefined) update.endereco = campos.address || null;
  if (campos.neighborhood !== undefined) update.bairro = campos.neighborhood || null;
  if (campos.cep !== undefined) update.cep = campos.cep || null;
  if (Object.keys(update).length === 0) return;
  const { error } = await supabase.from("crm_leads").update(update).eq("profile_id", profileId);
  if (error && /endereco|bairro|cep|schema cache|PGRST204/i.test(error.message)) {
    const { endereco: _e, bairro: _b, cep: _c, ...semEndereco } = update as Record<string, unknown>;
    void _e;
    void _b;
    void _c;
    if (Object.keys(semEndereco).length) {
      await supabase.from("crm_leads").update(semEndereco).eq("profile_id", profileId);
    }
  }
}

export async function criarCadastroMembro(
  supabase: SupabaseClient,
  params: {
    nome: string;
    email: string;
    whatsapp?: string | null;
    instagram?: string | null;
    cpfCnpj?: unknown;
    role: string;
    indicadoPor?: string | null;
    createdBy: string;
    cep?: string | null;
    address?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    criarLead?: boolean;
  }
): Promise<
  | { ok: true; profile_id: string; email: string; senha_temporaria: string; lead_id: string | null }
  | { ok: false; error: string; profile_id?: string }
> {
  const nome = String(params.nome || "").trim();
  const email = String(params.email || "").trim().toLowerCase();
  if (!nome) return { ok: false, error: "Informe o nome." };
  if (!email.includes("@")) return { ok: false, error: "Informe um e-mail válido." };

  const cpfCheck = validarCpfCnpjOpcional(params.cpfCnpj);
  if (!cpfCheck.ok) return { ok: false, error: cpfCheck.error };

  const { data: existente } = await supabase
    .from("profiles")
    .select("id, full_name")
    .ilike("email", email)
    .maybeSingle();
  if (existente?.id) {
    return {
      ok: false,
      error: `E-mail já cadastrado (${existente.full_name || email}).`,
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
    return { ok: false, error: authErr?.message || "Falha ao criar login." };
  }

  const userId = authData.user.id;
  const estado = normalizarUf(params.state);
  const endereco = camposEnderecoCompletoSync({
    cep: params.cep,
    address: params.address,
    number: params.number,
    complement: params.complement,
    neighborhood: params.neighborhood,
    city: params.city,
    state: estado,
  });

  const profileRow: Record<string, unknown> = {
    id: userId,
    email,
    full_name: nome,
    whatsapp: params.whatsapp?.trim() || null,
    instagram: params.instagram?.trim() || null,
    cpf_cnpj: cpfCheck.cpf,
    role: params.role,
    nivel: nivelPorRole(params.role),
    indicado_por: params.indicadoPor || null,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
    ...endereco,
  };

  let { error: profErr } = await supabase.from("profiles").upsert(profileRow, { onConflict: "id" });
  if (profErr && /cpf_cnpj|nivel|onboarding|municipio|schema cache|PGRST204/i.test(profErr.message)) {
    const fallback = { ...profileRow };
    delete fallback.cpf_cnpj;
    delete fallback.nivel;
    delete fallback.onboarding_completed;
    delete fallback.municipio;
    delete fallback.uf;
    const retry = await supabase.from("profiles").upsert(fallback, { onConflict: "id" });
    profErr = retry.error;
  }

  if (profErr) {
    await supabase.auth.admin.deleteUser(userId);
    return { ok: false, error: `Perfil: ${profErr.message}` };
  }

  let leadId: string | null = null;
  if (params.criarLead !== false) {
    const leadPayload = {
      nome,
      empresa: nome,
      telefone: params.whatsapp?.trim() || null,
      email,
      instagram: params.instagram?.trim() || null,
      cidade: String(params.city || "").trim() || null,
      estado: estado || null,
      endereco: String(params.address || "").trim() || null,
      bairro: String(params.neighborhood || "").trim() || null,
      cep: String(params.cep || "").trim() || null,
      status: "novo",
      origem: "manual",
      profile_id: userId,
      responsavel_id: params.indicadoPor || params.createdBy,
      created_by: params.createdBy,
    };
    let ins = await supabase.from("crm_leads").insert(leadPayload).select("id").single();
    if (ins.error && /endereco|bairro|cep|schema cache|PGRST204/i.test(ins.error.message)) {
      const { endereco: _e, bairro: _b, cep: _c, ...semEndereco } = leadPayload;
      void _e;
      void _b;
      void _c;
      ins = await supabase.from("crm_leads").insert(semEndereco).select("id").single();
    }
    if (!ins.error && ins.data?.id) leadId = ins.data.id;
  }

  return {
    ok: true,
    profile_id: userId,
    email,
    senha_temporaria: SENHA_PADRAO_CRM,
    lead_id: leadId,
  };
}
