import { NextRequest, NextResponse } from "next/server";
import { applyOrderToProInventory } from "@/lib/applyOrderToProInventory";
import { applyOrderCatalogStock } from "@/lib/applyOrderCatalogStock";
import { applyOrderRewards } from "@/lib/applyOrderRewards";
import { registrarAudit } from "@/lib/auditLog";
import { getAdminContext } from "@/lib/adminServer";
import { assertCanChangeOrderStatus } from "@/lib/orderGestor";

export const dynamic = "force-dynamic";

function normalizeOrderStatus(raw: unknown): string {
  return String(raw || "").trim().toLowerCase();
}

const ALLOWED_STATUS = new Set([
  "novo",
  "pending",
  "paid",
  "separacao",
  "despachado",
  "entregue",
  "cancelled",
]);

const STATUS_PAGO = new Set(["paid", "separacao", "despachado", "entregue"]);

export async function POST(req: NextRequest) {
  try {
    const { orderId, novoStatus } = await req.json();
    if (!orderId || !novoStatus) {
      return NextResponse.json({ ok: false, error: "orderId e novoStatus obrigatórios" }, { status: 400 });
    }
    const statusNormalizado = normalizeOrderStatus(novoStatus);
    if (!ALLOWED_STATUS.has(statusNormalizado)) {
      return NextResponse.json({ ok: false, error: "Status invalido." }, { status: 400 });
    }

    const { supabase, userId, error: authErr, status: authStatus } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json(
        { ok: false, error: authErr || "Não autenticado." },
        { status: authStatus || 401 }
      );
    }

    const { data: orderAtual } = await supabase
      .from("orders")
      .select("status, total, profile_id, gestor_tipo, distribuidor_gestor_id")
      .eq("id", orderId)
      .single();

    if (!orderAtual) {
      return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
    }

    const perm = await assertCanChangeOrderStatus(supabase, userId, orderAtual);
    if (!perm.ok) {
      return NextResponse.json({ ok: false, error: perm.error }, { status: 403 });
    }
    const jaEstavaPago = STATUS_PAGO.has(normalizeOrderStatus(orderAtual?.status));

    const { error } = await supabase
      .from("orders")
      .update({ status: statusNormalizado })
      .eq("id", orderId);

    if (error) {
      console.error("[admin/orders/status] erro update:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    await registrarAudit(supabase, {
      usuarioId: userId,
      acao: "CHANGE_ORDER_STATUS",
      entidade: "orders",
      entidadeId: orderId,
      dadosAntes: { status: orderAtual?.status },
      dadosApos: { status: statusNormalizado },
    });

    let rewardsErro: string | undefined;
    let estoqueCatalogoErro: string | undefined;
    let estoqueErro: string | undefined;
    let estoque: Awaited<ReturnType<typeof applyOrderToProInventory>> | undefined;

    if (STATUS_PAGO.has(statusNormalizado) && !jaEstavaPago) {
      const rewards = await applyOrderRewards(supabase, orderId);
      if (!rewards.ok) {
        console.error("[admin/orders/status] comissão/PRO:", rewards.error);
        rewardsErro = rewards.error;
      }
    }

    if (STATUS_PAGO.has(statusNormalizado)) {
      const baixa = await applyOrderCatalogStock(supabase, orderId);
      if (!baixa.ok) {
        console.error("[admin/orders/status] estoque catálogo:", baixa.error);
        estoqueCatalogoErro = baixa.error;
      }
    }

    if (statusNormalizado === "entregue") {
      const inv = await applyOrderToProInventory(supabase, orderId);
      if (!inv.ok) {
        console.error("[admin/orders/status] estoque membro:", inv.error);
        estoqueErro = inv.error;
      } else {
        estoque = inv;
      }
    }

    return NextResponse.json({
      ok: true,
      ...(rewardsErro ? { rewardsErro } : {}),
      ...(estoqueCatalogoErro ? { estoqueCatalogoErro } : {}),
      ...(estoqueErro ? { estoqueErro } : {}),
      ...(estoque ? { estoque } : {}),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro interno.";
    console.error("[admin/orders/status] erro geral:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
