import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import { assertVendedorCrmAccess } from "@/lib/crmVendedorServer";

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
};

/**
 * Contatos da rede do vendedor: indicados diretos (profiles) + leads do pipeline.
 */
export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertVendedorCrmAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const q = String(req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

  const [{ data: membros }, { data: leads }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, whatsapp, email, city, state, municipio, uf")
      .eq("indicado_por", userId)
      .order("full_name")
      .limit(200),
    supabase
      .from("crm_leads")
      .select("id, nome, telefone, email, cidade, estado, profile_id")
      .or(`created_by.eq.${userId},responsavel_id.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);

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
    });
  }

  for (const l of leads || []) {
    const nome = String(l.nome || "").trim();
    if (!nome) continue;
    // Se o lead já tem profile e o membro já entrou, só anexa o lead_id
    if (l.profile_id) {
      const keyM = `m:${l.profile_id}`;
      const existente = mapa.get(keyM);
      if (existente) {
        existente.crm_lead_id = l.id;
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
    });
  }

  let contatos = [...mapa.values()].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR")
  );

  if (q.length >= 1) {
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
