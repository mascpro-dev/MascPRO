import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  calcularTotalPedido,
  sincronizarTotalPedido,
} from "@/lib/pedidoTotalSync";

export const dynamic = "force-dynamic";

/**
 * Lista pedidos para o painel admin usando service role (ignora RLS).
 * Sem esta rota, /admin/pedidos só mostraria pedidos que a RLS deixa o
 * usuário logado ver — o que normalmente é só os próprios.
 */
export async function GET(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json(
        { ok: false, error: error || "Falha de autenticação." },
        { status: status || 401 }
      );
    }
    const { data: perfil } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    const role = String(perfil?.role || "").trim().toUpperCase();
    if (!["ADMIN", "DISTRIBUIDOR"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "Acesso restrito a administradores e distribuidores." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filtro = String(searchParams.get("filtro") || "todos").toLowerCase();
    const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit")) || 200));

    let query = supabase
      .from("orders")
      .select(
        `*,
        profiles!orders_profile_id_fkey(full_name, nivel, avatar_url, email, whatsapp, cpf_cnpj),
        order_items(quantidade, preco_unitario, bonificado, products(title, linha))`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (role === "DISTRIBUIDOR") {
      query = query
        .eq("gestor_tipo", "distribuidor")
        .eq("distribuidor_gestor_id", userId);
    } else {
      const gestao = searchParams.get("gestao");
      if (gestao === "empresa") {
        query = query.eq("gestor_tipo", "empresa");
      } else if (gestao === "distribuidor") {
        query = query.eq("gestor_tipo", "distribuidor");
      }
    }

    if (filtro === "pending") {
      query = query.in("status", ["pending", "novo"]);
    } else if (filtro !== "todos" && filtro !== "abandonados") {
      query = query.eq("status", filtro);
    }

    const { data, error: qerr } = await query;
    if (qerr) {
      return NextResponse.json(
        {
          ok: false,
          error: `${qerr.message}. Dica: confira se a tabela orders tem policy para ADMIN, ou configure SUPABASE_SERVICE_ROLE_KEY no Vercel para o painel admin ler tudo.`,
        },
        { status: 500 }
      );
    }

    // Auto-corrige totais divergentes dos itens (ex.: remoção na separação)
    const pedidos = [];
    for (const p of data || []) {
      const totalCalc = calcularTotalPedido({
        itens: p.order_items,
        shipping_cost: p.shipping_cost,
        desconto_total: p.desconto_total,
      });
      const totalGravado = Number(p.total || 0);
      if (Math.abs(totalCalc - totalGravado) > 0.009) {
        const sync = await sincronizarTotalPedido(supabase, p.id);
        pedidos.push({
          ...p,
          total: sync.ok ? sync.total : totalCalc,
          total_corrigido: true,
        });
      } else {
        pedidos.push(p);
      }
    }

    const leadIds = [
      ...new Set(
        pedidos
          .map((p) => (p as { crm_lead_id?: string | null }).crm_lead_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const leadsPorId = new Map<
      string,
      { nome: string | null; telefone: string | null; email: string | null }
    >();
    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("crm_leads")
        .select("id, nome, telefone, email")
        .in("id", leadIds);
      for (const lead of leads || []) {
        leadsPorId.set(lead.id, lead);
      }
    }

    const pedidosComCliente = [];
    for (const bruto of pedidos) {
      const p = bruto as typeof bruto & {
        profile_id?: string | null;
        crm_lead_id?: string | null;
        profiles?: {
          full_name?: string | null;
          nivel?: string | null;
          avatar_url?: string | null;
          email?: string | null;
          whatsapp?: string | null;
          cpf_cnpj?: string | null;
        } | null;
      };
      const lead = p.crm_lead_id ? leadsPorId.get(p.crm_lead_id) : undefined;
      const perfil = p.profiles;
      const nomePerfil = String(perfil?.full_name || "").trim();
      const nomeLead = String(lead?.nome || "").trim();
      const nome = nomePerfil || nomeLead;
      const email = String(perfil?.email || "").trim() || lead?.email || null;
      const whatsapp = String(perfil?.whatsapp || "").trim() || lead?.telefone || null;

      if (p.profile_id && perfil) {
        const patch: Record<string, string> = {};
        if (!nomePerfil && nomeLead) patch.full_name = nomeLead;
        if (!String(perfil.whatsapp || "").trim() && lead?.telefone) {
          patch.whatsapp = lead.telefone;
        }
        if (Object.keys(patch).length > 0) {
          await supabase.from("profiles").update(patch).eq("id", p.profile_id);
        }
      }

      pedidosComCliente.push({
        ...p,
        profiles: nome || perfil
          ? {
              full_name: nome,
              nivel: perfil?.nivel || null,
              avatar_url: perfil?.avatar_url || null,
              email,
              whatsapp,
              cpf_cnpj: perfil?.cpf_cnpj || null,
            }
          : perfil,
      });
    }

    return NextResponse.json({ ok: true, pedidos: pedidosComCliente });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
