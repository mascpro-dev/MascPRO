import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertCrmAccess } from "@/lib/crmServer";

export const dynamic = "force-dynamic";

type ContatoRede = {
  id: string;
  tipo: "membro" | "lead";
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  profile_id: string | null;
  crm_lead_id: string | null;
  order_id: string | null;
};

/**
 * Contatos para lançar pedido: membros da rede (indicados) + leads do CRM.
 * DISTRIBUIDOR: só a própria rede. ADMIN: busca ampla por nome/telefone/e-mail.
 */
export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const q = String(req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  const isAdmin = access.role === "ADMIN";

  let membrosQuery = supabase
    .from("profiles")
    .select("id, full_name, whatsapp, email, city, state, municipio, uf")
    .order("full_name")
    .limit(isAdmin && q.length >= 2 ? 80 : 200);

  let leadsQuery = supabase
    .from("crm_leads")
    .select("id, nome, telefone, email, cidade, estado, profile_id, order_id")
    .order("updated_at", { ascending: false })
    .limit(isAdmin && q.length >= 2 ? 80 : 200);

  let pularMembros = false;

  if (isAdmin) {
    if (q.length >= 2) {
      membrosQuery = membrosQuery.or(
        `full_name.ilike.%${q}%,whatsapp.ilike.%${q}%,email.ilike.%${q}%`
      );
      leadsQuery = leadsQuery.or(
        `nome.ilike.%${q}%,telefone.ilike.%${q}%,email.ilike.%${q}%,empresa.ilike.%${q}%`
      );
    } else {
      // Sem busca: só leads recentes (evita listar milhares de membros)
      pularMembros = true;
    }
  } else {
    const { data: rede } = await supabase
      .from("profiles")
      .select("id")
      .eq("indicado_por", userId);
    const redeIds = (rede || []).map((p: { id: string }) => p.id);
    const todosIds = [userId, ...redeIds];

    membrosQuery = membrosQuery.eq("indicado_por", userId);
    leadsQuery = leadsQuery.or(
      todosIds.map((id) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(",")
    );
  }

  const [membrosRes, leadsRes] = await Promise.all([
    pularMembros ? Promise.resolve({ data: [] as any[] }) : membrosQuery,
    leadsQuery,
  ]);
  const membros = membrosRes.data;
  const leads = leadsRes.data;

  const mapa = new Map<string, ContatoRede>();

  for (const m of membros || []) {
    const nome = String(m.full_name || "").trim();
    if (!nome) continue;
    const key = `m:${m.id}`;
    mapa.set(key, {
      id: key,
      tipo: "membro",
      nome,
      telefone: m.whatsapp ? String(m.whatsapp) : null,
      email: m.email ? String(m.email) : null,
      cidade: String(m.city || m.municipio || "") || null,
      estado: String(m.state || m.uf || "") || null,
      profile_id: m.id,
      crm_lead_id: null,
      order_id: null,
    });
  }

  for (const l of leads || []) {
    const nome = String(l.nome || "").trim();
    if (!nome) continue;
    if (l.profile_id) {
      const keyM = `m:${l.profile_id}`;
      const existente = mapa.get(keyM);
      if (existente) {
        existente.crm_lead_id = l.id;
        existente.order_id = l.order_id ? String(l.order_id) : existente.order_id;
        continue;
      }
    }
    const key = `l:${l.id}`;
    mapa.set(key, {
      id: key,
      tipo: "lead",
      nome,
      telefone: l.telefone ? String(l.telefone) : null,
      email: l.email ? String(l.email) : null,
      cidade: l.cidade ? String(l.cidade) : null,
      estado: l.estado ? String(l.estado) : null,
      profile_id: l.profile_id ? String(l.profile_id) : null,
      crm_lead_id: l.id,
      order_id: l.order_id ? String(l.order_id) : null,
    });
  }

  let contatos = [...mapa.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );

  if (!isAdmin && q.length >= 1) {
    contatos = contatos.filter((c) => {
      const blob = `${c.nome} ${c.telefone || ""} ${c.email || ""} ${c.cidade || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }

  return NextResponse.json({
    ok: true,
    contatos: contatos.slice(0, 80),
    total: contatos.length,
  });
}
