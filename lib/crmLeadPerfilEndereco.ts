import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  enriquecerPerfilComEndereco,
  PROFILE_ENDERECO_SELECT,
} from "@/lib/profileEndereco";

/**
 * Resolve endereço do comprador a partir do lead (profile_id ou e-mail/telefone).
 */
export async function resolverPerfilEnderecoDoLead(
  supabase: SupabaseClient,
  lead: {
    profile_id?: string | null;
    email?: string | null;
    telefone?: string | null;
    nome?: string | null;
  }
) {
  const select = `id, full_name, email, role, whatsapp, ${PROFILE_ENDERECO_SELECT}`;

  if (lead.profile_id) {
    const { data } = await supabase
      .from("profiles")
      .select(select)
      .eq("id", lead.profile_id)
      .maybeSingle();
    if (data) return enriquecerPerfilComEndereco(data);
  }

  if (lead.email) {
    const { data } = await supabase
      .from("profiles")
      .select(select)
      .ilike("email", lead.email.trim())
      .limit(1)
      .maybeSingle();
    if (data) return enriquecerPerfilComEndereco(data);
  }

  const tel = String(lead.telefone || "").replace(/\D/g, "");
  if (tel.length >= 8) {
    const { data: candidatos } = await supabase
      .from("profiles")
      .select(select)
      .not("whatsapp", "is", null)
      .limit(80);
    const hit = (candidatos || []).find((p) =>
      String(p.whatsapp || "").replace(/\D/g, "").endsWith(tel.slice(-8))
    );
    if (hit) return enriquecerPerfilComEndereco(hit);
  }

  return null;
}

export async function jsonPerfilDoLead(
  req: NextRequest,
  opts: {
    supabase: SupabaseClient;
    leadId: string;
    permitido: boolean;
  }
) {
  if (!opts.permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const { data: lead, error } = await opts.supabase
    .from("crm_leads")
    .select("id, profile_id, email, telefone, nome")
    .eq("id", opts.leadId)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!lead) return NextResponse.json({ ok: false, error: "Lead não encontrado." }, { status: 404 });

  const perfil = await resolverPerfilEnderecoDoLead(opts.supabase, lead);

  // Vincula profile_id no lead se achamos pelo e-mail/telefone
  if (perfil?.id && !lead.profile_id) {
    await opts.supabase
      .from("crm_leads")
      .update({ profile_id: perfil.id })
      .eq("id", lead.id);
  }

  return NextResponse.json({ ok: true, perfil, lead_id: lead.id });
}
