import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { podeAcessarLead } from "@/lib/crmServer";
import { podeAcessarLeadVendedor } from "@/lib/crmVendedorServer";
import { api4comLigar, api4comMe, api4comRamal, numeroE164 } from "@/lib/api4com";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

async function contaDiscador(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("api4com_contas")
    .select("token, ramal, api4com_nome")
    .eq("profile_id", userId)
    .maybeSingle();
  if (error) return { error: error.message, conta: null };
  return { error: null, conta: data };
}

export async function GET() {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const { error, conta } = await contaDiscador(supabase, userId);
  if (error && /api4com_contas|schema cache|does not exist/i.test(error)) {
    return NextResponse.json({ ok: true, configurado: false, aviso: "Rode supabase/api4com_contas.sql no Supabase." });
  }
  return NextResponse.json({
    ok: true,
    configurado: Boolean(conta?.token && conta?.ramal),
    ramal: conta?.ramal || null,
    nome: conta?.api4com_nome || null,
  });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = String(perfil?.role || "").toUpperCase();

  const body = await req.json().catch(() => null);
  const leadId = String(body?.lead_id || "").trim();
  const telefoneBody = String(body?.telefone || "").trim();
  if (!leadId && !telefoneBody) {
    return NextResponse.json({ ok: false, error: "Informe o contato." }, { status: 400 });
  }

  let telefone = telefoneBody;
  if (leadId) {
    const acesso =
      role === "VENDEDOR"
        ? await podeAcessarLeadVendedor(supabase, leadId, userId)
        : await podeAcessarLead(supabase, leadId, userId, role || "ADMIN");
    if (!acesso) {
      return NextResponse.json({ ok: false, error: "Sem acesso a este contato." }, { status: 403 });
    }
    let lead: { telefone?: string | null; dono_telefone?: string | null; cabeleireiro_telefone?: string | null } | null = null;
    const sel = await supabase
      .from("crm_leads")
      .select("telefone, dono_telefone, cabeleireiro_telefone")
      .eq("id", leadId)
      .maybeSingle();
    if (sel.error && /dono_telefone|cabeleireiro|schema cache|PGRST204|does not exist/i.test(sel.error.message)) {
      const simples = await supabase.from("crm_leads").select("telefone").eq("id", leadId).maybeSingle();
      lead = simples.data;
    } else {
      lead = sel.data;
    }
    telefone = telefone || String(lead?.telefone || lead?.dono_telefone || lead?.cabeleireiro_telefone || "");
  }

  const destino = numeroE164(telefone);
  if (!destino) {
    return NextResponse.json({ ok: false, error: "Telefone sem DDD. Não dá para discar." }, { status: 400 });
  }

  const { error, conta } = await contaDiscador(supabase, userId);
  if (error && /api4com_contas|schema cache|does not exist/i.test(error)) {
    return NextResponse.json({ ok: false, error: "Rode supabase/api4com_contas.sql no Supabase." }, { status: 400 });
  }
  if (!conta?.token) {
    return NextResponse.json({ ok: false, error: "Seu usuário ainda não tem token API4COM." }, { status: 400 });
  }

  let ramal = conta.ramal;
  if (!ramal) {
    ramal = await api4comRamal(conta.token);
    if (ramal) {
      await supabase.from("api4com_contas").update({ ramal, updated_at: new Date().toISOString() }).eq("profile_id", userId);
    }
  }
  if (!ramal) {
    return NextResponse.json({ ok: false, error: "Ramal API4COM não encontrado. Confira o plano e o Webphone." }, { status: 400 });
  }

  const ligar = await api4comLigar({ token: conta.token, ramal, called: destino, leadId });
  if (!ligar.ok) return NextResponse.json({ ok: false, error: ligar.error }, { status: ligar.status === 424 ? 424 : 400 });

  if (leadId) {
    await supabase.from("crm_atividades").insert({
      lead_id: leadId,
      autor_id: userId,
      tipo: "contato",
      conteudo: "Tentativa de ligação API4COM (não confirma conversa).",
    });
  }

  return NextResponse.json({ ok: true, call_id: ligar.id, ramal });
}

/** Admin grava o token no vendedor. Valida na API4COM antes de salvar. */
export async function PUT(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }
  const { data: perfil } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (String(perfil?.role || "").toUpperCase() !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Só o administrador grava o token." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const token = String(body?.token || "").trim();
  const busca = String(body?.usuario || body?.nome || body?.email || "")
    .replace(/[^a-zA-Z0-9@._\-\s]/g, "")
    .trim()
    .slice(0, 80);
  if (!token || !busca) {
    return NextResponse.json({ ok: false, error: "Informe o usuário MASC PRO e o token." }, { status: 400 });
  }

  let dono: Api4comMeSafe;
  try {
    dono = await api4comMe(token);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Token recusado pela API4COM." }, { status: 400 });
  }
  const ramal = await api4comRamal(token);

  const { data: candidatos } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .or(`full_name.ilike.%${busca}%,email.ilike.%${busca}%`);
  const alvo = (candidatos || []).find((p) => {
    const nome = String(p.full_name || "").toLowerCase();
    const email = String(p.email || "").toLowerCase();
    const q = busca.toLowerCase();
    return nome.includes(q) || email.includes(q) || email === String(dono.email || "").toLowerCase();
  }) || (candidatos || [])[0];

  if (!alvo?.id) {
    return NextResponse.json({ ok: false, error: "Não achei esse usuário no MASC PRO." }, { status: 404 });
  }

  const { error } = await supabase.from("api4com_contas").upsert({
    profile_id: alvo.id,
    token,
    ramal,
    api4com_nome: dono.name,
    api4com_email: dono.email,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    return NextResponse.json({
      ok: false,
      error: /api4com_contas|schema cache|does not exist/i.test(error.message)
        ? "Rode supabase/api4com_contas.sql no Supabase e tente de novo."
        : error.message,
    }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    profile_id: alvo.id,
    masc_nome: alvo.full_name,
    masc_email: alvo.email,
    api4com_nome: dono.name,
    api4com_email: dono.email,
    ramal,
  });
}

type Api4comMeSafe = { name: string; email: string };
