import type { SupabaseClient } from "@supabase/supabase-js";
import { parseListaLeads, type LeadLista, type LinhaIgnorada } from "@/lib/crmImportarLista";

export async function inserirListaLeads(
  supabase: SupabaseClient,
  params: {
    autorId: string;
    autorNome: string;
    responsavelId: string;
    destinoNome?: string;
    texto: string;
  }
): Promise<
  | { ok: true; criados: number; ignoradas: LinhaIgnorada[] }
  | { ok: false; error: string; ignoradas?: LinhaIgnorada[] }
> {
  const parsed = parseListaLeads(params.texto);
  if (parsed.erro) return { ok: false, error: parsed.erro, ignoradas: parsed.ignoradas };

  const rows = parsed.leads.map((lead: LeadLista) => ({
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    cidade: lead.cidade,
    estado: lead.estado,
    empresa: lead.empresa,
    instagram: lead.instagram,
    notas: lead.notas,
    status: "novo",
    origem: "manual",
    responsavel_id: params.responsavelId,
    created_by: params.responsavelId,
  }));

  const { data, error } = await supabase.from("crm_leads").insert(rows).select("id");
  if (error || !data) {
    return { ok: false, error: error?.message || "Falha ao gravar a lista." };
  }

  if (data.length > 0) {
    await supabase.from("crm_atividades").insert(
      data.map((lead) => ({
        lead_id: lead.id,
        autor_id: params.autorId,
        tipo: "criacao",
        conteudo: params.destinoNome
          ? `Lead importado de lista por ${params.autorNome} para o pipeline de ${params.destinoNome}.`
          : `Lead importado de lista por ${params.autorNome}.`,
      }))
    );
  }

  return { ok: true, criados: data.length, ignoradas: parsed.ignoradas };
}
