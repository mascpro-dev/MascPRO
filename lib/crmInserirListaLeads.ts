import type { SupabaseClient } from "@supabase/supabase-js";
import { parseListaLeads, type LeadLista, type LinhaIgnorada } from "@/lib/crmImportarLista";
import type { LeadImportacao } from "@/lib/crmImportarPlanilha";
import { normalizarTelefoneBr } from "@/lib/crmCarteira";

export type DecisaoDuplicado = "manter" | "preencher_vazios" | "criar";

export type DuplicadoImportacao = {
  linha: number;
  nome: string;
  telefone: string | null;
  lead_id: string;
  lead_nome: string;
};

function asImport(lead: LeadLista | LeadImportacao): LeadImportacao {
  const extra = lead as LeadImportacao;
  return {
    ...lead,
    bairro: extra.bairro ?? null,
    endereco: extra.endereco ?? null,
    cep: extra.cep ?? null,
    telefone_normalizado: extra.telefone_normalizado || normalizarTelefoneBr(lead.telefone),
    origem_lista: extra.origem_lista ?? null,
    dono_nome: extra.dono_nome ?? null,
    dono_telefone: extra.dono_telefone ?? null,
    cabeleireiro_nome: extra.cabeleireiro_nome ?? null,
    cabeleireiro_telefone: extra.cabeleireiro_telefone ?? null,
  };
}

function rowLead(lead: LeadImportacao, responsavelId: string, loteId: string | null) {
  const base: Record<string, unknown> = {
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
    responsavel_id: responsavelId,
    created_by: responsavelId,
    resultado_atendimento: "nao_abordado",
    perfil_comercial: "nao_verificado",
    relacionamento: "nao_identificado",
    bairro: lead.bairro,
    endereco: lead.endereco,
    cep: lead.cep,
    telefone_normalizado: lead.telefone_normalizado,
    lote_importacao_id: loteId,
    dono_nome: lead.dono_nome || null,
    dono_telefone: lead.dono_telefone || null,
    cabeleireiro_nome: lead.cabeleireiro_nome || null,
    cabeleireiro_telefone: lead.cabeleireiro_telefone || null,
  };
  return base;
}

function rowSlim(row: Record<string, unknown>) {
  const {
    bairro,
    endereco,
    cep,
    telefone_normalizado,
    lote_importacao_id,
    resultado_atendimento,
    perfil_comercial,
    relacionamento,
    dono_nome,
    dono_telefone,
    cabeleireiro_nome,
    cabeleireiro_telefone,
    ...rest
  } = row;
  void bairro;
  void endereco;
  void cep;
  void telefone_normalizado;
  void lote_importacao_id;
  void resultado_atendimento;
  void perfil_comercial;
  void relacionamento;
  void dono_nome;
  void dono_telefone;
  void cabeleireiro_nome;
  void cabeleireiro_telefone;
  return rest;
}

async function insertChunk(supabase: SupabaseClient, rows: Record<string, unknown>[]) {
  const { data, error } = await supabase.from("crm_leads").insert(rows).select("id");
  if (!error) return { data: data || [], error: null as string | null };
  if (/column|schema cache|PGRST204/i.test(error.message)) {
    const slim = rows.map(rowSlim);
    const retry = await supabase.from("crm_leads").insert(slim).select("id");
    return { data: retry.data || [], error: retry.error?.message || null };
  }
  return { data: [] as { id: string }[], error: error.message };
}

export async function inserirListaLeads(
  supabase: SupabaseClient,
  params: {
    autorId: string;
    autorNome: string;
    responsavelId: string;
    destinoNome?: string;
    texto?: string;
    leads?: LeadImportacao[];
    ignoradas?: LinhaIgnorada[];
    arquivoNome?: string;
    origemLista?: string;
    dryRun?: boolean;
    decisoes?: Record<number, DecisaoDuplicado>;
    escopoIds?: string[] | null;
  }
): Promise<
  | {
      ok: true;
      criados: number;
      atualizados: number;
      ignoradas: LinhaIgnorada[];
      duplicados: DuplicadoImportacao[];
      lote_id: string | null;
    }
  | { ok: false; error: string; ignoradas?: LinhaIgnorada[] }
> {
  let leads: LeadImportacao[] = params.leads || [];
  let ignoradas: LinhaIgnorada[] = params.ignoradas || [];

  if (!leads.length) {
    const parsed = parseListaLeads(params.texto || "");
    if (parsed.erro) return { ok: false, error: parsed.erro, ignoradas: parsed.ignoradas };
    leads = parsed.leads.map(asImport);
    ignoradas = parsed.ignoradas;
  } else {
    leads = leads.map(asImport);
  }

  const tels = [...new Set(leads.map((l) => l.telefone_normalizado).filter(Boolean))] as string[];
  const existentes: { id: string; nome: string; telefone: string | null; telefone_normalizado?: string | null; empresa?: string | null; email?: string | null; cidade?: string | null; bairro?: string | null; endereco?: string | null; cep?: string | null; notas?: string | null; dono_nome?: string | null; dono_telefone?: string | null; cabeleireiro_nome?: string | null; cabeleireiro_telefone?: string | null }[] = [];

  if (tels.length) {
    for (let i = 0; i < tels.length; i += 30) {
      const chunk = tels.slice(i, i + 30);
      const orDig = chunk
        .map((t) => t.replace(/^55/, ""))
        .map((t) => `telefone.ilike.%${t.slice(-8)}%`)
        .join(",");
      const orTel = chunk.map((t) => `telefone_normalizado.eq.${t}`).join(",");
      const { data, error } = await supabase
        .from("crm_leads")
        .select("id, nome, telefone, telefone_normalizado, empresa, email, cidade, bairro, endereco, cep, notas, dono_nome, dono_telefone, cabeleireiro_nome, cabeleireiro_telefone")
        .or(orTel);
      if (error && /column|schema cache|PGRST204/i.test(error.message)) {
        const simples = await supabase
          .from("crm_leads")
          .select("id, nome, telefone, empresa, email, cidade, notas")
          .or(orDig);
        existentes.push(...(simples.data || []));
      } else if (!error) {
        existentes.push(...(data || []));
      }
    }
  }

  const porTel = new Map<string, (typeof existentes)[0]>();
  for (const e of existentes) {
    const n = e.telefone_normalizado || normalizarTelefoneBr(e.telefone);
    if (n && !porTel.has(n)) porTel.set(n, e);
  }

  const duplicados: DuplicadoImportacao[] = [];
  const criar: LeadImportacao[] = [];
  const preencher: { lead: LeadImportacao; atual: (typeof existentes)[0] }[] = [];

  for (const lead of leads) {
    const match = lead.telefone_normalizado ? porTel.get(lead.telefone_normalizado) : null;
    if (!match) {
      criar.push(lead);
      continue;
    }
    const acao = params.decisoes?.[lead.linha] || "manter";
    duplicados.push({
      linha: lead.linha,
      nome: lead.nome,
      telefone: lead.telefone,
      lead_id: match.id,
      lead_nome: match.nome,
    });
    if (acao === "criar") criar.push(lead);
    else if (acao === "preencher_vazios") preencher.push({ lead, atual: match });
  }

  if (params.dryRun) {
    return { ok: true, criados: criar.length, atualizados: 0, ignoradas, duplicados, lote_id: null };
  }

  let loteId: string | null = null;
  const lote = await supabase
    .from("crm_import_lotes")
    .insert({
      created_by: params.autorId,
      arquivo_nome: params.arquivoNome || null,
      origem_lista: params.origemLista || null,
      responsavel_id: params.responsavelId,
      total_linhas: leads.length,
    })
    .select("id")
    .maybeSingle();
  if (!lote.error) loteId = lote.data?.id || null;

  let criados = 0;
  for (let i = 0; i < criar.length; i += 100) {
    const chunk = criar.slice(i, i + 100).map((l) => rowLead(l, params.responsavelId, loteId));
    const ins = await insertChunk(supabase, chunk);
    if (ins.error) return { ok: false, error: ins.error, ignoradas };
    criados += ins.data.length;
    if (ins.data.length) {
      await supabase.from("crm_atividades").insert(
        ins.data.map((lead) => ({
          lead_id: lead.id,
          autor_id: params.autorId,
          tipo: "criacao",
          conteudo: params.destinoNome
            ? `Lead importado de lista por ${params.autorNome} para o pipeline de ${params.destinoNome}.`
            : `Lead importado de lista por ${params.autorNome}.`,
        }))
      );
    }
  }

  let atualizados = 0;
  for (const item of preencher) {
    const patch: Record<string, unknown> = {};
    if (!item.atual.empresa && item.lead.empresa) patch.empresa = item.lead.empresa;
    if (!item.atual.email && item.lead.email) patch.email = item.lead.email;
    if (!item.atual.cidade && item.lead.cidade) patch.cidade = item.lead.cidade;
    if (!item.atual.bairro && item.lead.bairro) patch.bairro = item.lead.bairro;
    if (!item.atual.endereco && item.lead.endereco) patch.endereco = item.lead.endereco;
    if (!item.atual.cep && item.lead.cep) patch.cep = item.lead.cep;
    if (item.lead.notas) {
      patch.notas = [item.atual.notas, item.lead.notas].filter(Boolean).join("\n");
    }
    if (!item.atual.dono_nome && item.lead.dono_nome) patch.dono_nome = item.lead.dono_nome;
    if (!item.atual.dono_telefone && item.lead.dono_telefone) patch.dono_telefone = item.lead.dono_telefone;
    if (!item.atual.cabeleireiro_nome && item.lead.cabeleireiro_nome) patch.cabeleireiro_nome = item.lead.cabeleireiro_nome;
    if (!item.atual.cabeleireiro_telefone && item.lead.cabeleireiro_telefone) patch.cabeleireiro_telefone = item.lead.cabeleireiro_telefone;
    if (!Object.keys(patch).length) continue;
    const { error } = await supabase.from("crm_leads").update(patch).eq("id", item.atual.id);
    if (!error) atualizados += 1;
  }

  if (loteId) {
    await supabase
      .from("crm_import_lotes")
      .update({
        criados,
        atualizados,
        duplicados: duplicados.length,
        ignorados: ignoradas.length,
      })
      .eq("id", loteId);
  }

  return { ok: true, criados, atualizados, ignoradas, duplicados, lote_id: loteId };
}
