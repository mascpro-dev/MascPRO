import type { SupabaseClient } from "@supabase/supabase-js";
import { camposEnderecoCompletoSync } from "@/lib/profileEndereco";

/** Salva endereço do perfil sincronizando colunas EN (cadastro) e PT (CRM/NF-e). */
export async function salvarEnderecoProfileCrm(
  supabase: SupabaseClient,
  profileId: string,
  body: Record<string, unknown>
) {
  const update = camposEnderecoCompletoSync({
    cep: body.cep as string | null | undefined,
    logradouro: body.logradouro as string | null | undefined,
    address: body.address as string | null | undefined,
    numero: body.numero as string | null | undefined,
    number: body.number as string | null | undefined,
    complemento: body.complemento as string | null | undefined,
    complement: body.complement as string | null | undefined,
    bairro: body.bairro as string | null | undefined,
    neighborhood: body.neighborhood as string | null | undefined,
    municipio: body.municipio as string | null | undefined,
    city: body.city as string | null | undefined,
    uf: body.uf as string | null | undefined,
    state: body.state as string | null | undefined,
  });

  if (Object.keys(update).length === 0) return;
  await supabase.from("profiles").update(update).eq("id", profileId);
}
