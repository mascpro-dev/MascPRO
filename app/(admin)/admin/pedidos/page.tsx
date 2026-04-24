"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";
import AdminMemberAvatar from "@/componentes/AdminMemberAvatar";
import {
  ShoppingBag, CheckCircle, XCircle, Clock,
  Loader2, RefreshCw, PackageCheck, PackageOpen, Truck, Trash2,
} from "lucide-react";

type Pedido = {
  id: string;
  profile_id: string;
  total: number;
  status: string;
  payment_method: string;
  mp_payment_id: string | null;
  shipping_cost?: number | null;
  shipping_cep?: string | null;
  shipping_address?: string | null;
  created_at: string;
  profiles: { full_name: string; nivel: string; avatar_url?: string | null } | null;
  order_items: { quantidade: number; preco_unitario: number; products: { title: string } | null }[];
};

type StatusInfo = { label: string; style: string; icon: React.ReactNode };

const STATUS: Record<string, StatusInfo> = {
  novo:       { label: "Rascunho / legado",    style: "bg-zinc-800 text-zinc-400 border-zinc-700",       icon: <Clock size={10} className="inline mr-1" /> },
  pending:    { label: "Aguardando confirmação da Masc PRO", style: "bg-zinc-800 text-zinc-400 border-zinc-700",       icon: <Clock size={10} className="inline mr-1" /> },
  paid:       { label: "Pago — aguardando separação", style: "bg-blue-900/30 text-blue-400 border-blue-800/40", icon: <CheckCircle size={10} className="inline mr-1" /> },
  separacao:  { label: "Em separação",         style: "bg-yellow-900/30 text-yellow-400 border-yellow-800/40", icon: <PackageCheck size={10} className="inline mr-1" /> },
  despachado: { label: "Despachado",           style: "bg-green-900/30 text-green-400 border-green-800/40",  icon: <Truck size={10} className="inline mr-1" /> },
  entregue:   { label: "Entregue",             style: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50", icon: <PackageOpen size={10} className="inline mr-1" /> },
  cancelled:  { label: "Cancelado",            style: "bg-red-900/30 text-red-400 border-red-800/40",         icon: <XCircle size={10} className="inline mr-1" /> },
};

type Filtro = "todos" | "pending" | "paid" | "separacao" | "despachado" | "entregue" | "cancelled";

export default function AdminPedidosPage() {
  const supabase = createClientComponentClient();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("paid");
  const [processando, setProcessando] = useState<string | null>(null);
  const [adminSecret, setAdminSecret] = useState("");
  const [limpando, setLimpando] = useState(false);
  const [syncingMp, setSyncingMp] = useState(false);

  useEffect(() => { carregarPedidos(); }, [filtro]);

  function pagamentoLabel(metodo: string) {
    const m = String(metodo || "").toLowerCase();
    if (m === "mercadopago") return "Mercado Pago";
    if (m === "pix") return "PIX";
    if (m === "credito") return "Cartao credito";
    if (m === "debito") return "Cartao debito";
    if (m === "boleto") return "Boleto";
    if (m === "pendente") return "Pendente";
    return metodo || "Nao informado";
  }

  function imprimirLogisticaPdf(pedido: Pedido) {
    const itens = (pedido.order_items || [])
      .map((item) => {
        const nome = item.products?.title || "Produto";
        const qtd = Number(item.quantidade || 0);
        const unit = Number(item.preco_unitario || 0);
        const subtotal = unit * qtd;
        return `<tr>
          <td style="padding:8px;border:1px solid #ddd">${nome}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center">${qtd}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">R$ ${unit.toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right">R$ ${subtotal.toFixed(2)}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Pedido ${pedido.id}</title>
  </head>
  <body style="font-family:Arial,sans-serif;color:#111;padding:18px">
    <h2 style="margin:0 0 8px 0">MascPRO - Ficha de Separacao/Expedicao</h2>
    <p style="margin:2px 0"><strong>Pedido:</strong> ${pedido.id}</p>
    <p style="margin:2px 0"><strong>Data:</strong> ${new Date(pedido.created_at).toLocaleString("pt-BR")}</p>
    <p style="margin:2px 0"><strong>Cliente:</strong> ${pedido.profiles?.full_name || "-"}</p>
    <p style="margin:2px 0"><strong>Pagamento:</strong> ${pagamentoLabel(pedido.payment_method)}</p>
    <p style="margin:2px 0"><strong>Status:</strong> ${STATUS[pedido.status]?.label || pedido.status}</p>
    <p style="margin:2px 0"><strong>Frete:</strong> R$ ${Number(pedido.shipping_cost || 0).toFixed(2)}</p>
    <p style="margin:2px 0"><strong>CEP:</strong> ${pedido.shipping_cep || "-"}</p>
    <p style="margin:6px 0 10px 0"><strong>Endereco:</strong> ${pedido.shipping_address || "-"}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:8px">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #ddd;text-align:left">Produto</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:center">Qtd</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right">Unit.</th>
          <th style="padding:8px;border:1px solid #ddd;text-align:right">Subtotal</th>
        </tr>
      </thead>
      <tbody>${itens}</tbody>
    </table>
    <p style="margin-top:10px"><strong>Total pedido:</strong> R$ ${Number(pedido.total || 0).toFixed(2)}</p>
    <p style="margin-top:26px">Separacao: ____________________</p>
    <p style="margin-top:18px">Conferencia: ____________________</p>
    <script>window.print()</script>
  </body>
</html>`;
    const w = window.open("", "_blank", "width=980,height=720");
    if (!w) {
      alert("Nao foi possivel abrir a janela de impressao.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  async function carregarPedidos() {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select(`
        *,
        profiles!orders_profile_id_fkey(full_name, nivel, avatar_url),
        order_items(quantidade, preco_unitario, products(title))
      `)
      .order("created_at", { ascending: false });

    if (filtro === "pending") {
      query = query.in("status", ["pending", "novo"]);
    } else if (filtro !== "todos") {
      query = query.eq("status", filtro);
    }

    const { data } = await query;
    setPedidos((data as any) || []);
    setLoading(false);
  }

  async function sincronizarPendentesMP(showFeedback = false) {
    if (syncingMp) return;
    setSyncingMp(true);
    try {
      const { data: pendentes } = await supabase
        .from("orders")
        .select("id")
        .in("status", ["pending", "novo"])
        .order("created_at", { ascending: false })
        .limit(30);

      if (!pendentes?.length) return;

      for (const pedido of pendentes) {
        await fetch("/api/orders/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: pedido.id }),
        });
      }

      if (showFeedback) {
        alert("Sincronização com Mercado Pago finalizada.");
      }
    } finally {
      setSyncingMp(false);
    }
  }

  async function apagarPedidoAdmin(id: string) {
    if (!adminSecret.trim()) {
      alert("Informe o segredo de admin (ADMIN_ORDERS_SECRET) para apagar.");
      return;
    }
    if (!confirm("Apagar este pedido e itens vinculados?")) return;
    setProcessando(id);
    const res = await fetch("/api/admin/orders/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, secret: adminSecret.trim() }),
    });
    const data = await res.json().catch(() => null);
    setProcessando(null);
    if (!res.ok || !data?.ok) {
      alert(data?.error || "Erro ao apagar.");
      return;
    }
    await carregarPedidos();
  }

  async function apagarTodosPedidos() {
    if (!adminSecret.trim()) {
      alert("Informe o segredo de admin (ADMIN_ORDERS_SECRET).");
      return;
    }
    if (!confirm("ATENÇÃO: Isso apaga TODOS os pedidos do sistema. Continuar?")) return;
    setLimpando(true);
    try {
      const res = await fetch("/api/admin/orders/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: adminSecret.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Erro ao limpar pedidos.");
        return;
      }
      alert(`Pedidos removidos: ${data.removed ?? 0}`);
      await carregarPedidos();
    } finally {
      setLimpando(false);
    }
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    setProcessando(id);
    try {
      const res = await fetch("/api/admin/orders/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, novoStatus }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert(data?.error || "Erro ao atualizar status. Verifique os logs do Vercel.");
        return;
      }
      if (data?.estoqueCatalogoErro) {
        alert(`Status atualizado, mas a baixa do estoque do catálogo falhou:\n${data.estoqueCatalogoErro}`);
      }
      if (novoStatus === "entregue") {
        if (data?.estoqueErro) {
          alert(`Pedido marcado como entregue, mas o estoque automático do membro falhou:\n${data.estoqueErro}`);
        } else if (data?.estoque?.appliedLines > 0) {
          alert(
            `Estoque do salão do membro atualizado automaticamente (${data.estoque.appliedLines} produto(s) / linhas no estoque PRO).`
          );
        }
      }
    } catch (e: any) {
      alert("Erro de conexão: " + e.message);
      return;
    } finally {
      setProcessando(null);
    }
    await carregarPedidos();
  }

  const totalFiltrado = pedidos.reduce((acc, p) => acc + Number(p.total), 0);

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: "pending",    label: "Pendentes" },
    { key: "paid",       label: "Pagos" },
    { key: "separacao",  label: "Em Separação" },
    { key: "despachado", label: "Despachados" },
    { key: "entregue",   label: "Entregues" },
    { key: "cancelled",  label: "Cancelados" },
    { key: "todos",      label: "Todos" },
  ];

  useEffect(() => {
    const t = setTimeout(async () => {
      await sincronizarPendentesMP(false);
      await carregarPedidos();
    }, 5000);
    return () => clearTimeout(t);
  }, [filtro]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-8">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black italic uppercase">
              Pedidos <span className="text-[#C9A66B]">da Loja</span>
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              {pedidos.length} pedido{pedidos.length !== 1 ? "s" : ""} —{" "}
              <span className="text-white font-bold">
                R$ {totalFiltrado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>
          <button onClick={carregarPedidos} className="text-zinc-500 hover:text-white transition-colors">
            <RefreshCw size={20} />
          </button>
        </div>
        <div className="mb-4">
          <button
            type="button"
            onClick={async () => {
              await sincronizarPendentesMP(true);
              await carregarPedidos();
            }}
            disabled={syncingMp}
            className="bg-blue-950/30 border border-blue-700/40 hover:border-blue-500/60 text-blue-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          >
            {syncingMp ? "Sincronizando MP..." : "Sincronizar pagamentos MP"}
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                filtro === f.key
                  ? "bg-[#C9A66B] text-black border-[#C9A66B]"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Limpeza / pedidos de teste — requer ADMIN_ORDERS_SECRET no servidor */}
        <div className="mb-8 p-4 rounded-2xl border border-red-900/40 bg-red-950/20 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400">
            Zona perigosa — apagar pedidos
          </p>
          <p className="text-xs text-zinc-500">
            Defina <code className="text-zinc-400">ADMIN_ORDERS_SECRET</code> no Vercel (e local no{" "}
            <code className="text-zinc-400">.env.local</code>) e cole o mesmo valor abaixo para confirmar exclusões.
          </p>
          <input
            type="password"
            autoComplete="off"
            placeholder="Segredo admin (ADMIN_ORDERS_SECRET)"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            className="w-full max-w-md bg-black border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
          />
          <button
            type="button"
            onClick={apagarTodosPedidos}
            disabled={limpando}
            className="flex items-center gap-2 bg-red-900/50 hover:bg-red-800/60 text-red-200 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl border border-red-800/60 disabled:opacity-50"
          >
            {limpando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Zerar todos os pedidos (banco)
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-20 text-zinc-600">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold uppercase tracking-widest text-sm">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pedidos.map(pedido => {
              const statusInfo = STATUS[pedido.status] || STATUS.pending;
              const isProcessando = processando === pedido.id;

              return (
                <div
                  key={pedido.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4"
                >
                  {/* Linha principal */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

                    {/* Info do comprador */}
                    <div className="flex items-start gap-4 flex-1">
                      <AdminMemberAvatar
                        avatarUrl={pedido.profiles?.avatar_url}
                        name={pedido.profiles?.full_name}
                        className="rounded-lg border-[#C9A66B]/25 bg-[#C9A66B]/15 text-[#C9A66B]"
                      />
                      <div>
                        <p className="font-bold text-white">{pedido.profiles?.full_name || "—"}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {pedido.profiles?.nivel || "cabeleireiro"} · {new Date(pedido.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        {pedido.mp_payment_id && (
                          <p className="text-[10px] text-zinc-600 font-mono mt-1">MP #{pedido.mp_payment_id}</p>
                        )}
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Pagamento: <span className="text-zinc-400">{pagamentoLabel(pedido.payment_method)}</span>
                        </p>
                        <p className="text-[10px] text-zinc-600 mt-1">
                          Frete: <span className="text-zinc-400">R$ {Number(pedido.shipping_cost || 0).toFixed(2)}</span>
                          {pedido.shipping_cep ? ` · CEP ${pedido.shipping_cep}` : ""}
                        </p>
                        {pedido.shipping_address && (
                          <p className="text-[10px] text-zinc-500 mt-1 max-w-2xl leading-relaxed">
                            Envio: {pedido.shipping_address}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Total + status */}
                    <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                      <p className="text-2xl font-black text-white">
                        R$ {Number(pedido.total).toFixed(2)}
                      </p>
                      <span className={`text-[10px] font-black uppercase tracking-widest border px-3 py-1 rounded-full ${statusInfo.style}`}>
                        {statusInfo.icon}{statusInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Itens do pedido */}
                  {pedido.order_items?.length > 0 && (
                    <div className="border-t border-zinc-800 pt-3">
                      <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mb-2">Itens</p>
                      <div className="flex flex-col gap-1">
                        {pedido.order_items.map((item, i) => (
                          <div key={i} className="flex justify-between text-xs text-zinc-400">
                            <span>{item.products?.title || "Produto"} × {item.quantidade}</span>
                            <span>R$ {(Number(item.preco_unitario) * item.quantidade).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações de status */}
                  <div className="border-t border-zinc-800 pt-3 flex flex-wrap gap-2 items-center">

                    <button
                      type="button"
                      onClick={() => apagarPedidoAdmin(pedido.id)}
                      disabled={isProcessando}
                      className="flex items-center gap-1 bg-red-900/20 hover:bg-red-900/40 text-red-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50 border border-red-800/40"
                    >
                      {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      Apagar pedido
                    </button>

                    <button
                      type="button"
                      onClick={() => imprimirLogisticaPdf(pedido)}
                      className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all border border-zinc-700"
                    >
                      Imprimir PDF logistica
                    </button>

                    {/* PENDENTE / NOVO → confirmar pagamento ou cancelar */}
                    {(pedido.status === "pending" || pedido.status === "novo") && (
                      <>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "paid")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-blue-700/40 hover:bg-blue-600/60 text-blue-200 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50 border border-blue-600/40"
                        >
                          {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          CONFIRMAR PAGAMENTO
                        </button>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "cancelled")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          <XCircle size={14} /> CANCELAR
                        </button>
                      </>
                    )}

                    {/* PAGO → pode ir para separação ou cancelar */}
                    {pedido.status === "paid" && (
                      <>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "separacao")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-yellow-900/40 hover:bg-yellow-800/60 text-yellow-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <PackageCheck size={14} />}
                          SEPARAÇÃO
                        </button>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "cancelled")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-red-900/30 hover:bg-red-800/40 text-red-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          <XCircle size={14} /> CANCELAR
                        </button>
                      </>
                    )}

                    {/* SEPARAÇÃO → pode despachar ou cancelar */}
                    {pedido.status === "separacao" && (
                      <>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "despachado")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-green-900/40 hover:bg-green-800/60 text-green-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <Truck size={14} />}
                          DESPACHADO
                        </button>
                        <button
                          onClick={() => atualizarStatus(pedido.id, "paid")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                        >
                          ← VOLTAR PARA PAGO
                        </button>
                      </>
                    )}

                    {pedido.status === "despachado" && (
                      <>
                        <button
                          type="button"
                          onClick={() => atualizarStatus(pedido.id, "entregue")}
                          disabled={isProcessando}
                          className="flex items-center gap-1 bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all disabled:opacity-50 border border-emerald-800/40"
                        >
                          {isProcessando ? <Loader2 size={14} className="animate-spin" /> : <PackageOpen size={14} />}
                          ENTREGUE (+ estoque)
                        </button>
                        <span className="text-[10px] text-zinc-500 max-w-[200px] leading-tight">
                          Ou o membro confirma em Meus pedidos — nos dois casos o estoque do salão é creditado uma vez.
                        </span>
                      </>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
