import type { SupabaseClient } from "@supabase/supabase-js";
import { camposLocalizacaoSync } from "@/lib/profileLocalizacao";

/** Salva endereço do perfil (pipeline CRM) mantendo city/state e municipio/uf sincronizados. */
export async function salvarEnderecoProfileCrm(
  supabase: SupabaseClient,
  profileId: string,
  body: Record<string, unknown>
) {
  const update: Record<string, string | null> = {};
  const map: Record<string, string> = {
    cep: "cep",
    logradouro: "logradouro",
    numero: "numero",
    complemento: "complemento",
    bairro: "bairro",
    municipio: "municipio",
    uf: "uf",
    city: "city",
    state: "state",
  };

  for (const [k, col] of Object.entries(map)) {
    if (body[k] !== undefined && body[k] !== null && String(body[k]).trim() !== "") {
      update[col] = String(body[k]).trim();
    }
  }

  const cidade =
    body.municipio !== undefined
      ? String(body.municipio || "").trim()
      : body.city !== undefined
        ? String(body.city || "").trim()
        : undefined;
  const uf =
    body.uf !== undefined
      ? String(body.uf || "").trim()
      : body.state !== undefined
        ? String(body.state || "").trim()
        : undefined;

  if (cidade !== undefined || uf !== undefined) {
    Object.assign(update, camposLocalizacaoSync(cidade ?? "", uf ?? ""));
  }

  if (Object.keys(update).length === 0) return;
  await supabase.from("profiles").update(update).eq("id", profileId);
}
