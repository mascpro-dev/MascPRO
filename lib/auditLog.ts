import { SupabaseClient } from "@supabase/supabase-js";

export type AuditAcao =
  | "CREATE_LEAD" | "UPDATE_LEAD" | "DELETE_LEAD" | "CONVERT_LEAD"
  | "UPDATE_ORDER" | "DELETE_ORDER" | "CHANGE_ORDER_STATUS"
  | "CREATE_RETURN" | "APPROVE_RETURN" | "REJECT_RETURN"
  | "UPDATE_PRODUCT" | "UPDATE_STOCK"
  | "CREATE_ORDEM_COMPRA" | "APPROVE_ORDEM_COMPRA"
  | "EMIT_NFE" | "CANCEL_NFE"
  | "UPDATE_CONFIG" | "UPDATE_MEMBER"
  | "APPLY_COMMISSION" | "APPROVE_SAQUE";

export async function registrarAudit(
  supabase: SupabaseClient,
  params: {
    usuarioId: string | null;
    acao: AuditAcao;
    entidade: string;
    entidadeId?: string | null;
    dadosAntes?: Record<string, any> | null;
    dadosApos?: Record<string, any> | null;
    ip?: string;
    userAgent?: string;
  }
) {
  try {
    await supabase.from("audit_log").insert({
      usuario_id:  params.usuarioId,
      acao:        params.acao,
      entidade:    params.entidade,
      entidade_id: params.entidadeId || null,
      dados_antes: params.dadosAntes || null,
      dados_apos:  params.dadosApos || null,
      ip:          params.ip || null,
      user_agent:  params.userAgent || null,
    });
  } catch {
    // audit nunca deve quebrar o fluxo principal
  }
}
