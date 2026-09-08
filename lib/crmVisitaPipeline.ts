import type { SupabaseClient } from "@supabase/supabase-js";

/** Status do pipeline após registrar visita em campo. */
export function statusAposVisita(
  atual: string | null | undefined,
  resultado: string | null,
  proximoPasso: string | null
): string {
  const s = atual || "novo";
  if (s === "fechado") return s;
  if (s === "perdido" || s === "nao_qualificado") return "reativar";

  if (resultado === "positivo") {
    if (proximoPasso) {
      const early = ["novo", "contato_feito", "qualificado", "diagnostico", "reativar"];
      if (early.includes(s)) return "proposta";
    }
    if (s === "novo" || s === "reativar") return "qualificado";
    return s;
  }

  if (s === "novo" || s === "reativar") return "contato_feito";
  return s;
}

export type GarantirLeadVisitaOpts = {
  userId: string;
  vendedorNome: string;
  crmLeadId: string | null;
  profileId: string | null;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  resultado: string | null;
  proximoPasso: string | null;
  tipo: string;
  notas: string | null;
};

/**
 * Garante que a visita tenha um lead no pipeline (cria ou atualiza).
 */
export async function garantirLeadPipeline(
  supabase: SupabaseClient,
  opts: GarantirLeadVisitaOpts
): Promise<{ leadId: string; criado: boolean } | { error: string }> {
  let leadId: string | null = opts.crmLeadId;
  let criado = false;
  let statusAtual: string | null = null;

  if (leadId) {
    const { data: lead } = await supabase
      .from("crm_leads")
      .select("id, status")
      .eq("id", leadId)
      .maybeSingle();
    if (!lead) {
      leadId = null;
    } else {
      statusAtual = lead.status;
    }
  }

  if (!leadId && opts.profileId) {
    const { data: existente } = await supabase
      .from("crm_leads")
      .select("id, status")
      .eq("profile_id", opts.profileId)
      .or(`created_by.eq.${opts.userId},responsavel_id.eq.${opts.userId}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existente) {
      leadId = existente.id;
      statusAtual = existente.status;
    }
  }

  // Mesmo nome+telefone do vendedor (evita duplicar no backfill)
  if (!leadId && opts.telefone) {
    const { data: porTel } = await supabase
      .from("crm_leads")
      .select("id, status")
      .or(`created_by.eq.${opts.userId},responsavel_id.eq.${opts.userId}`)
      .eq("telefone", opts.telefone)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (porTel) {
      leadId = porTel.id;
      statusAtual = porTel.status;
    }
  }

  const novoStatus = statusAposVisita(statusAtual, opts.resultado, opts.proximoPasso);

  if (!leadId) {
    const { data: lead, error } = await supabase
      .from("crm_leads")
      .insert({
        nome: opts.nome,
        telefone: opts.telefone,
        cidade: opts.cidade,
        status: novoStatus,
        origem: opts.profileId ? "indicacao" : "manual",
        perfil: "cabeleireiro",
        responsavel_id: opts.userId,
        created_by: opts.userId,
        profile_id: opts.profileId,
        proximo_passo: opts.proximoPasso,
        notas: opts.notas
          ? `Visita (${opts.tipo}): ${opts.notas}`
          : `Lead aberto automaticamente pela visita (${opts.tipo}).`,
      })
      .select("id")
      .single();

    if (error || !lead) {
      return { error: error?.message || "Falha ao criar lead no pipeline." };
    }

    leadId = lead.id;
    criado = true;

    await supabase.from("crm_atividades").insert({
      lead_id: leadId,
      autor_id: opts.userId,
      tipo: "criacao",
      conteudo: `Lead criado automaticamente pela visita em campo (${opts.tipo}) — ${opts.vendedorNome}.`,
    });
  } else {
    const patch: Record<string, unknown> = {
      status: novoStatus,
      updated_at: new Date().toISOString(),
    };
    if (opts.telefone) patch.telefone = opts.telefone;
    if (opts.cidade) patch.cidade = opts.cidade;
    if (opts.proximoPasso) patch.proximo_passo = opts.proximoPasso;
    if (opts.profileId) patch.profile_id = opts.profileId;

    await supabase.from("crm_leads").update(patch).eq("id", leadId);
  }

  const resolvedId = leadId ?? null;
  if (!resolvedId) {
    return { error: "Falha ao resolver lead no pipeline." };
  }

  return { leadId: resolvedId, criado };
}

/**
 * Visitas sem crm_lead_id → cria/atualiza lead e vincula (backfill).
 */
export async function sincronizarVisitasOrfasNoPipeline(
  supabase: SupabaseClient,
  userId: string,
  vendedorNome: string
): Promise<{ sincronizadas: number; erros: string[] }> {
  const { data: orfas, error } = await supabase
    .from("crm_visitas")
    .select(
      "id, tipo, cliente_nome, cliente_telefone, cliente_cidade, resultado, proximo_passo, notas"
    )
    .eq("vendedor_id", userId)
    .is("crm_lead_id", null)
    .order("data_visita", { ascending: false })
    .limit(50);

  if (error || !orfas?.length) {
    return { sincronizadas: 0, erros: error ? [error.message] : [] };
  }

  let sincronizadas = 0;
  const erros: string[] = [];

  for (const v of orfas) {
    const nome = String(v.cliente_nome || "").trim();
    if (!nome) continue;

    const leadRes = await garantirLeadPipeline(supabase, {
      userId,
      vendedorNome,
      crmLeadId: null,
      profileId: null,
      nome,
      telefone: v.cliente_telefone || null,
      cidade: v.cliente_cidade || null,
      resultado: v.resultado || null,
      proximoPasso: v.proximo_passo || null,
      tipo: v.tipo || "visita",
      notas: v.notas || null,
    });

    if ("error" in leadRes) {
      erros.push(`${nome}: ${leadRes.error}`);
      continue;
    }

    const { error: updErr } = await supabase
      .from("crm_visitas")
      .update({ crm_lead_id: leadRes.leadId })
      .eq("id", v.id);

    if (updErr) {
      erros.push(`${nome}: ${updErr.message}`);
      continue;
    }

    if (leadRes.criado) {
      await supabase.from("crm_atividades").insert({
        lead_id: leadRes.leadId,
        autor_id: userId,
        tipo: "contato",
        conteudo: [
          `Visita em campo (${v.tipo}): ${nome}`,
          v.resultado ? `resultado ${v.resultado}` : null,
          v.proximo_passo ? `próximo: ${v.proximo_passo}` : null,
          v.notas || null,
        ]
          .filter(Boolean)
          .join(" — "),
      });
    }

    sincronizadas += 1;
  }

  return { sincronizadas, erros };
}
