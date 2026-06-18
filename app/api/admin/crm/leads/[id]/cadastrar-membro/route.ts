import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess, podeAcessarLead } from "@/lib/crmServer";
import { criarMembroDeLead } from "@/lib/crmCadastroMembro";

export const dynamic = "force-dynamic";

/** Cria cadastro no app para lead sem profile (senha padrão temporária). */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        ok: false,
        error: "Criação de cadastro requer SUPABASE_SERVICE_ROLE_KEY no servidor.",
      },
      { status: 500 }
    );
  }

  const permitido = await podeAcessarLead(supabase, params.id, userId, access.role);
  if (!permitido) {
    return NextResponse.json({ ok: false, error: "Sem acesso a este lead." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));

  const { data: lead, error: errLead } = await supabase
    .from("crm_leads")
    .select(
      "id, nome, email, telefone, instagram, cidade, estado, responsavel_id, profile_id"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (errLead || !lead) {
    return NextResponse.json(
      { ok: false, error: errLead?.message || "Lead não encontrado." },
      { status: 404 }
    );
  }

  const resultado = await criarMembroDeLead(supabase, {
    lead,
    email: body.email ? String(body.email) : undefined,
    closingUserId: userId,
    vincularLead: true,
  });

  if (!resultado.ok) {
    if (resultado.profile_id) {
      const { data: perfil } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, cep, logradouro, numero, complemento, bairro, municipio, uf")
        .eq("id", resultado.profile_id)
        .maybeSingle();
      return NextResponse.json({
        ok: true,
        vinculado_existente: true,
        profile_id: resultado.profile_id,
        perfil,
        aviso: resultado.error,
      });
    }
    return NextResponse.json({ ok: false, error: resultado.error }, { status: 400 });
  }

  await supabase.from("crm_atividades").insert({
    lead_id: lead.id,
    autor_id: userId,
    tipo: "nota",
    conteudo: `Cadastro criado no app (${resultado.email}). Senha temporária: ${resultado.senha_temporaria} — oriente a cliente a alterar no primeiro acesso.`,
  });

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, cep, logradouro, numero, complemento, bairro, municipio, uf")
    .eq("id", resultado.profile_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    profile_id: resultado.profile_id,
    email: resultado.email,
    senha_temporaria: resultado.senha_temporaria,
    perfil,
  });
}
