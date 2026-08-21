import type { SupabaseClient } from "@supabase/supabase-js";
import { SENHA_PADRAO_CRM } from "@/lib/crmCadastroMembro";

export async function criarVendedor(
  supabase: SupabaseClient,
  params: {
    distribuidorId: string;
    nome: string;
    email: string;
    whatsapp?: string | null;
  }
): Promise<
  | { ok: true; profile_id: string; email: string; senha_temporaria: string }
  | { ok: false; error: string; profile_id?: string }
> {
  const email = String(params.email).trim().toLowerCase();
  const nome = String(params.nome).trim();

  if (!nome) return { ok: false, error: "Nome é obrigatório." };
  if (!email.includes("@")) return { ok: false, error: "E-mail inválido." };

  const { data: existente } = await supabase
    .from("profiles")
    .select("id, full_name, role")
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
  const profileRow: Record<string, unknown> = {
    id: userId,
    email,
    full_name: nome,
    whatsapp: params.whatsapp?.trim() || null,
    role: "VENDEDOR",
    nivel: "cabeleireiro",
    indicado_por: params.distribuidorId,
    onboarding_completed: true,
    updated_at: new Date().toISOString(),
  };

  const { error: profErr } = await supabase
    .from("profiles")
    .upsert(profileRow, { onConflict: "id" });

  if (profErr) {
    await supabase.auth.admin.deleteUser(userId);
    return { ok: false, error: profErr.message };
  }

  return {
    ok: true,
    profile_id: userId,
    email,
    senha_temporaria: SENHA_PADRAO_CRM,
  };
}
