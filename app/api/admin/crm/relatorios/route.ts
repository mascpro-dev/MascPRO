import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  enriquecerPerfilComEndereco,
  montarEnderecoTexto,
  PROFILE_ENDERECO_SELECT,
} from "@/lib/profileEndereco";

export const dynamic = "force-dynamic";

async function assertAccess(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = String(data?.role || "").toUpperCase();
  if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) return { ok: false as const, error: "Sem acesso." };
  return { ok: true as const, role };
}

function csvRow(cols: (string | number | null | undefined)[]): string {
  return cols.map(c => {
    const s = String(c ?? "").replace(/"/g, '""');
    return `"${s}"`;
  }).join(";");
}

// GET /api/admin/crm/relatorios?tipo=pedidos|leads|clientes|comissoes&inicio=YYYY-MM-DD&fim=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const access = await assertAccess(supabase, userId);
  if (!access.ok) return NextResponse.json({ ok: false, error: access.error }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const tipo   = params.get("tipo") || "pedidos";
  const inicio = params.get("inicio") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const fim    = params.get("fim")    || new Date().toISOString().slice(0, 10);

  let redeIds: string[] = [];
  if (access.role !== "ADMIN") {
    const { data: rede } = await supabase.from("profiles").select("id").eq("indicado_por", userId);
    redeIds = (rede || []).map((p: any) => p.id);
  }
  const todosIds = access.role === "ADMIN" ? null : [userId, ...redeIds];

  let csv = "";
  let filename = `${tipo}_${inicio}_${fim}.csv`;

  if (tipo === "pedidos") {
    let q = supabase
      .from("orders")
      .select("id, created_at, total, status, payment_method, shipping_cost, shipping_cep, shipping_address, codigo_rastreio, transportadora, profile_id, profiles!orders_profile_id_fkey(full_name, email, whatsapp)")
      .gte("created_at", inicio)
      .lte("created_at", `${fim}T23:59:59`)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (todosIds) q = q.in("profile_id", todosIds);
    const { data } = await q;

    const rows = [csvRow(["ID","Data","Cliente","Email","WhatsApp","Total","Status","Pagamento","Frete","CEP Entrega","Endereço Entrega","Rastreio","Transportadora"])];
    for (const p of (data || []) as any[]) {
      const perfil = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
      rows.push(csvRow([
        p.id, p.created_at?.slice(0,10), perfil?.full_name, perfil?.email, perfil?.whatsapp,
        Number(p.total).toFixed(2), p.status, p.payment_method,
        Number(p.shipping_cost || 0).toFixed(2), p.shipping_cep, p.shipping_address,
        p.codigo_rastreio, p.transportadora,
      ]));
    }
    csv = rows.join("\n");
  }

  else if (tipo === "leads") {
    let q = supabase
      .from("crm_leads")
      .select("id, created_at, nome, empresa, telefone, email, status, origem, valor_estimado, data_followup, responsavel:profiles!crm_leads_responsavel_id_fkey(full_name)")
      .gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`)
      .order("created_at", { ascending: false }).limit(5000);
    if (todosIds) q = q.or(todosIds.map((id: string) => `created_by.eq.${id},responsavel_id.eq.${id}`).join(","));
    const { data } = await q;

    const rows = [csvRow(["ID","Data","Nome","Empresa","Telefone","Email","Status","Origem","Valor Est.","Follow-up","Responsável"])];
    for (const l of (data || [])) {
      rows.push(csvRow([
        l.id, l.created_at?.slice(0,10), l.nome, l.empresa, l.telefone, l.email,
        l.status, l.origem, Number(l.valor_estimado || 0).toFixed(2),
        l.data_followup, (l.responsavel as any)?.full_name,
      ]));
    }
    csv = rows.join("\n");
  }

  else if (tipo === "clientes") {
    let q = supabase
      .from("profiles")
      .select(`id, full_name, email, whatsapp, role, created_at, pro_total, total_compras_proprias, ${PROFILE_ENDERECO_SELECT}`)
      .order("full_name", { ascending: true }).limit(5000);
    if (todosIds) q = q.in("id", todosIds);
    const { data } = await q;

    const rows = [csvRow([
      "ID","Nome","Email","WhatsApp","Role",
      "CEP","Rua","Número","Complemento","Bairro","Cidade","UF",
      "Endereço Completo","Cadastro","PRO Total","Total Compras",
    ])];
    for (const c of (data || [])) {
      const e = enriquecerPerfilComEndereco(c as any);
      rows.push(csvRow([
        e.id as string, e.full_name as string, e.email as string, e.whatsapp as string, e.role as string,
        e.cep, e.logradouro, e.numero, e.complemento, e.bairro, e.municipio, e.uf,
        montarEnderecoTexto(e),
        String(e.created_at || "").slice(0, 10),
        Number(e.pro_total || 0), Number(e.total_compras_proprias || 0).toFixed(2),
      ]));
    }
    csv = rows.join("\n");
  }

  else if (tipo === "comissoes") {
    let q = supabase
      .from("commissions")
      .select("id, created_at, valor_pedido, percentual, valor_comissao, status, embaixador:profiles!commissions_embaixador_id_fkey(full_name), cabeleireiro:profiles!commissions_cabeleireiro_id_fkey(full_name)")
      .gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`)
      .order("created_at", { ascending: false }).limit(5000);
    if (todosIds) q = q.in("cabeleireiro_id", todosIds);
    const { data } = await q;

    const rows = [csvRow(["ID","Data","Embaixador","Cabeleireiro","Valor Pedido","Percentual","Comissão","Status"])];
    for (const c of (data || [])) {
      rows.push(csvRow([
        c.id, c.created_at?.slice(0,10),
        (c.embaixador as any)?.full_name, (c.cabeleireiro as any)?.full_name,
        Number(c.valor_pedido).toFixed(2), c.percentual,
        Number(c.valor_comissao).toFixed(2), c.status,
      ]));
    }
    csv = rows.join("\n");
  }

  const bom = "\uFEFF"; // BOM para Excel abrir UTF-8 corretamente
  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
