import type { SupabaseClient } from "@supabase/supabase-js";

export function apenasDigitosCpfCnpj(valor: unknown): string {
  return String(valor ?? "").replace(/\D/g, "");
}

export function validarCpfCnpjOpcional(
  valor: unknown
): { ok: true; cpf: string | null } | { ok: false; error: string } {
  const d = apenasDigitosCpfCnpj(valor);
  if (!d) return { ok: true, cpf: null };
  if (d.length !== 11 && d.length !== 14) {
    return { ok: false, error: "CPF deve ter 11 dígitos ou CNPJ 14 dígitos." };
  }
  return { ok: true, cpf: d };
}

export function validarCpfCnpjObrigatorio(
  valor: unknown
): { ok: true; cpf: string } | { ok: false; error: string } {
  const r = validarCpfCnpjOpcional(valor);
  if (!r.ok) return r;
  if (!r.cpf) return { ok: false, error: "Informe o CPF ou CNPJ do cliente." };
  return { ok: true, cpf: r.cpf };
}

/**
 * Grava no perfil o nome, CPF e telefone confirmados no fechamento.
 * O nome entra em profiles.full_name — é esse campo que Pedidos da Loja exibe.
 */
export async function gravarIdentidadeClienteNoPerfil(
  supabase: SupabaseClient,
  profileId: string,
  dados: {
    nome?: string | null;
    cpf_cnpj?: string | null;
    telefone?: string | null;
    email?: string | null;
  },
  opts?: { somenteSeVazio?: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name, whatsapp, email, cpf_cnpj")
    .eq("id", profileId)
    .maybeSingle();

  if (!perfil) return { ok: true };

  const update: Record<string, unknown> = {};
  const nome = String(dados.nome || "").trim();
  const nomeAtual = String(perfil.full_name || "").trim();
  if (nome && (!opts?.somenteSeVazio || !nomeAtual)) {
    update.full_name = nome;
  }

  const cpf = dados.cpf_cnpj ? apenasDigitosCpfCnpj(dados.cpf_cnpj) : "";
  if (cpf && (!opts?.somenteSeVazio || !String(perfil.cpf_cnpj || "").replace(/\D/g, ""))) {
    update.cpf_cnpj = cpf;
  }

  const tel = String(dados.telefone || "").trim();
  if (tel && (!opts?.somenteSeVazio || !String(perfil.whatsapp || "").trim())) {
    update.whatsapp = tel;
  }

  const email = String(dados.email || "").trim().toLowerCase();
  if (email.includes("@") && !String(perfil.email || "").trim()) {
    update.email = email;
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("profiles").update(update).eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * No fechamento: exige nome e CPF, atualiza o lead e grava tudo no perfil vinculado.
 * Sem perfil o pedido da loja fica sem nome — por isso o cadastro é obrigatório.
 */
export async function aplicarClienteNoFechamento(
  supabase: SupabaseClient,
  params: {
    profileId: string | null;
    leadId: string;
    nome?: string | null;
    nomeLead?: string | null;
    cpf_cnpj?: unknown;
    telefone?: string | null;
    email?: string | null;
  }
): Promise<{ ok: true; nome: string; cpf: string } | { ok: false; error: string }> {
  const nome = String(params.nome || params.nomeLead || "").trim();
  if (!nome) {
    return { ok: false, error: "Informe o nome do cliente." };
  }

  const cpf = validarCpfCnpjObrigatorio(params.cpf_cnpj);
  if (!cpf.ok) return cpf;

  if (!params.profileId) {
    return {
      ok: false,
      error:
        "Crie ou vincule o cadastro do cliente antes de fechar. Sem isso o pedido entra em Pagos sem o nome.",
    };
  }

  await supabase.from("crm_leads").update({ nome }).eq("id", params.leadId);

  const gravado = await gravarIdentidadeClienteNoPerfil(supabase, params.profileId, {
    nome,
    cpf_cnpj: cpf.cpf,
    telefone: params.telefone,
    email: params.email,
  });
  if (!gravado.ok) return gravado;

  return { ok: true, nome, cpf: cpf.cpf };
}
