"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";
import {
  ShoppingBag, CheckCircle, XCircle, Clock,
  Loader2, RefreshCw, PackageCheck, Truck,
} from "lucide-react";

type Pedido = {
  id: string;
  profile_id: string;
  total: number;
  status: string;
  payment_method: string;
  mp_payment_id: string | null;
  created_at: string;
  profiles: { full_name: string; nivel: string } | null;
  order_items: { quantidade: number; preco_unitario: number; products: { title: string } | null }[];
};

type StatusInfo = { label: string; style: string; icon: React.ReactNode };

const STATUS: Record<string, StatusInfo> = {
  pending:    { label: "Aguardando pagamento", style: "bg-zinc-800 text-zinc-400 border-zinc-700",       icon: <Clock size={10} className="inline mr-1" /> },
  paid:       { label: "Pago — aguardando separação", style: "bg-blue-900/30 text-blue-400 border-blue-800/40", icon: <CheckCircle size={10} className="inline mr-1" /> },
  separacao:  { label: "Em separação",         style: "bg-yellow-900/30 text-yellow-400 border-yellow-800/40", icon: <PackageCheck size={10} className="inline mr-1" /> },
  despachado: { label: "Despachado",           style: "bg-green-900/30 text-green-400 border-green-800/40",  icon: <Truck size={10} className="inline mr-1" /> },
  cancelled:  { label: "Cancelado",            style: "bg-red-900/30 text-red-400 border-red-800/40",         icon: <XCircle size={10} className="inline mr-1" /> },
};

type Filtro = "todos" | "paid" | "separacao" | "despachado" | "cancelled";

export default function AdminPedidosPage() {
  const supabase = createClientComponentClient();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("paid");
  const [processando, setProcessando] = useState<string | null>(null);

  useEffect(() => { carregarPedidos(); }, [filtro]);

  async function carregarPedidos() {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select(`
        *,
        profiles!orders_profile_id_fkey(full_name, nivel),
        order_items(quantidade, preco_unitario, products(title))
      `)
      .order("created_at", { ascending: false });

    if (filtro !== "todos") query = query.eq("status", filtro);

    const { data } = await query;
    setPedidos((data as any) || []);
    setLoading(false);
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    setProcessando(id);
    await supabase.from("orders").update({ status: novoStatus }).eq("id", id);
    await carregarPedidos();
    setProcessando(null);
  }

  const totalFiltrado = pedidos.reduce((acc, p) => acc + Number(p.total), 0);

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: "paid",       label: "Pagos" },
    { key: "separacao",  label: "Em Separação" },
    { key: "despachado", label: "Despachados" },
    { key: "cancelled",  label: "Cancelados" },
    { key: "todos",      label: "Todos" },
  ];

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8">

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
              const statusInfo = STATUS[pedido.status] || STATUS["pending"];
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
                      <div className="w-10 h-10 rounded-lg bg-[#C9A66B]/20 text-[#C9A66B] flex items-center justify-center font-black text-lg shrink-0">
                        {pedido.profiles?.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-bold text-white">{pedido.profiles?.full_name || "—"}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {pedido.profiles?.nivel || "cabeleireiro"} · {new Date(pedido.created_at).toLocaleDateString("pt-BR")}
                        </p>
                        {pedido.mp_payment_id && (
                          <p className="text-[10px] text-zinc-600 font-mono mt-1">MP #{pedido.mp_payment_id}</p>
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
                  <div className="border-t border-zinc-800 pt-3 flex flex-wrap gap-2">

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

                    {/* DESPACHADO — estado final positivo */}
                    {pedido.status === "despachado" && (
                      <span className="flex items-center gap-1 text-green-500 text-xs font-bold uppercase tracking-widest">
                        <CheckCircle size={14} /> Pedido concluído
                      </span>
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
