import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertForcaAcesso, listarLeadsDaForca, normalizarUf, podeOperarLeadForca, type ForcaAcesso } from "@/lib/forcaAcesso";

export const dynamic = "force-dynamic";

const PAPEL_INTERNO = new Set(["ADMIN", "DISTRIBUIDOR", "VENDEDOR"]);

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });
  const access = await assertForcaAcesso(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const carteira = await listarLeadsDaForca(supabase, access, userId);
  if (carteira.error) return NextResponse.json({ ok: false, error: carteira.error }, { status: 500 });

  const ufPedido = normalizarUf(req.nextUrl.searchParams.get("uf"));
  const uf = access.papel === "DISTRIBUIDOR" ? access.uf : ufPedido || access.uf;
  let cadastros: Array<Record<string, unknown>> = [];
  if (uf && access.papel !== "VENDEDOR") {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, whatsapp, email, city, municipio, state, uf, role")
      .or(`uf.ilike.${uf},state.ilike.${uf}`)
      .limit(1000);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    const ligados = new Set(
      (carteira.leads as Array<{ profile_id?: string | null }>).map((l) => String(l.profile_id || "")).filter(Boolean)
    );
    cadastros = (data || []).filter((p) => {
      const papel = String(p.role || "").toUpperCase();
      if (PAPEL_INTERNO.has(papel)) return false;
      return !ligados.has(p.id);
    });
  }

  return NextResponse.json({
    ok: true,
    papel: access.papel,
    uf: access.uf,
    aviso: carteira.aviso,
    leads: carteira.leads,
    cadastros,
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });
  const access = await assertForcaAcesso(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  const profileId = String(body?.profile_id || "");
  if (!profileId) return criarCliente(supabase, access, userId, body);
  if (access.papel === "VENDEDOR") {
    return NextResponse.json({ ok: false, error: "O vendedor vende na carteira atribuída." }, { status: 403 });
  }

  const { data: perfil } = await supabase
    .from("profiles")
    .select("id, full_name, whatsapp, email, city, municipio, state, uf, role")
    .eq("id", profileId)
    .maybeSingle();
  if (!perfil) return NextResponse.json({ ok: false, error: "Cadastro não encontrado." }, { status: 404 });

  const ufPerfil = normalizarUf(perfil.uf || perfil.state);
  if (access.papel === "DISTRIBUIDOR") {
    if (!access.uf) {
      return NextResponse.json({ ok: false, error: "Cadastre a UF do distribuidor antes de vender na região." }, { status: 400 });
    }
    if (ufPerfil !== access.uf) {
      return NextResponse.json({ ok: false, error: "Este cadastro está fora da sua região." }, { status: 403 });
    }
  }

  const { data: existente } = await supabase
    .from("crm_leads")
    .select("id")
    .eq("profile_id", profileId)
    .limit(1)
    .maybeSingle();
  if (existente?.id) {
    const pode = await podeOperarLeadForca(supabase, access, userId, existente.id);
    if (!pode) return NextResponse.json({ ok: false, error: "Sem acesso a este salão." }, { status: 403 });
    return NextResponse.json({ ok: true, lead_id: existente.id });
  }

  const { data: criado, error } = await supabase
    .from("crm_leads")
    .insert({
      nome: perfil.full_name || "Cadastro",
      telefone: perfil.whatsapp,
      email: perfil.email,
      cidade: perfil.city || perfil.municipio,
      estado: ufPerfil || access.uf,
      profile_id: perfil.id,
      responsavel_id: access.distribuidor_id || userId,
      created_by: userId,
      origem: "manual",
    })
    .select("id")
    .single();
  if (error || !criado) {
    return NextResponse.json({ ok: false, error: error?.message || "Falha ao abrir o salão." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, lead_id: criado.id });
}

async function criarCliente(
  supabase: NonNullable<Awaited<ReturnType<typeof getAdminContext>>["supabase"]>,
  access: ForcaAcesso,
  userId: string,
  body: Record<string, unknown> | null
) {
  const nome = String(body?.nome || body?.empresa || "").trim();
  const telefone = String(body?.telefone || "").trim();
  const cidade = String(body?.cidade || "").trim();
  const endereco = String(body?.endereco || "").trim();
  const bairro = String(body?.bairro || "").trim();
  let estado = normalizarUf(body?.estado);
  if (!nome) return NextResponse.json({ ok: false, error: "Informe o nome do salão." }, { status: 400 });
  if (!telefone) return NextResponse.json({ ok: false, error: "Informe o telefone." }, { status: 400 });
  if (!cidade) return NextResponse.json({ ok: false, error: "Informe a cidade." }, { status: 400 });
  if (body?.estado && !estado) {
    return NextResponse.json({ ok: false, error: "A UF precisa ter 2 letras." }, { status: 400 });
  }
  if (access.papel === "DISTRIBUIDOR") {
    if (!access.uf) {
      return NextResponse.json({ ok: false, error: "Cadastre a UF do distribuidor antes de abrir cliente na região." }, { status: 400 });
    }
    if (estado && estado !== access.uf) {
      return NextResponse.json({ ok: false, error: "O cliente precisa estar na UF da sua região." }, { status: 403 });
    }
    estado = access.uf;
  }

  const payload = {
    nome,
    empresa: nome,
    telefone,
    cidade,
    estado: estado || null,
    endereco: endereco || null,
    bairro: bairro || null,
    status: "novo",
    origem: "manual",
    responsavel_id: access.distribuidor_id || userId,
    created_by: userId,
  };
  let ins = await supabase.from("crm_leads").insert(payload).select("id").single();
  if (ins.error && /endereco|bairro|schema cache|PGRST204/i.test(ins.error.message)) {
    const { endereco: _endereco, bairro: _bairro, ...semEndereco } = payload;
    void _endereco;
    void _bairro;
    ins = await supabase.from("crm_leads").insert(semEndereco).select("id").single();
  }
  if (ins.error || !ins.data) {
    return NextResponse.json({ ok: false, error: ins.error?.message || "Falha ao cadastrar o cliente." }, { status: 500 });
  }
  await supabase.from("crm_atividades").insert({
    lead_id: ins.data.id,
    autor_id: userId,
    tipo: "criacao",
    conteudo: "Cliente cadastrado na Força de Vendas.",
  });
  return NextResponse.json({ ok: true, lead_id: ins.data.id });
}
