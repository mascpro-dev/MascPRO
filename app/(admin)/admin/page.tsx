"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";
import Link from "next/link";
import {
  Users, Activity, ShoppingBag, DollarSign,
  ArrowDownToLine, AlertTriangle, PackageCheck,
} from "lucide-react";

export default function AdminDashboard() {
  const supabase = createClientComponentClient();
  const [membros, setMembros] = useState(0);
  const [acessosHoje, setAcessosHoje] = useState(0);
  const [totalVendas, setTotalVendas] = useState(0);
  const [pedidosPagos, setPedidosPagos] = useState(0);
  const [pedidosPendentes, setPedidosPendentes] = useState(0);
  const [saquesAbertos, setSaquesAbertos] = useState(0);
  const [valorSaquesAbertos, setValorSaquesAbertos] = useState(0);

  useEffect(() => {
    async function carregar() {
      const hoje = new Date().toISOString().split("T")[0];

      const { data: perfis } = await supabase.from("profiles").select("id, last_sign_in_at");
      if (perfis) {
        setMembros(perfis.length);
        setAcessosHoje(perfis.filter((u: any) => u.last_sign_in_at?.startsWith(hoje)).length);
      }

      const { data: vendas } = await supabase.from("orders").select("total").eq("status", "paid");
      if (vendas) {
        setPedidosPagos(vendas.length);
        setTotalVendas(vendas.reduce((acc: number, p: any) => acc + Number(p.total), 0));
      }

      const { count: pendentes } = await supabase
        .from("orders").select("id", { count: "exact", head: true })
        .in("status", ["paid", "separacao"]);
      setPedidosPendentes(pendentes || 0);

      const { data: saques } = await supabase
        .from("withdrawal_requests").select("valor_liquido").eq("status", "aguardando");
      if (saques) {
        setSaquesAbertos(saques.length);
        setValorSaquesAbertos(saques.reduce((acc: number, s: any) => acc + Number(s.valor_liquido), 0));
      }
    }
    carregar();
  }, [supabase]);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-black italic uppercase mb-8">
          Painel <span className="text-[#C9A66B]">Admin</span>
        </h1>

        {/* ALERTAS */}
        <div className="flex flex-col gap-3 mb-8">
          {saquesAbertos > 0 && (
            <Link href="/admin/saques">
              <div className="w-full bg-yellow-950/30 border border-yellow-700/40 rounded-2xl px-6 py-4 flex items-center justify-between group hover:border-yellow-500/60 transition-all">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={20} className="text-yellow-400" />
                  <p className="text-yellow-300 font-bold text-sm">
                    {saquesAbertos} saque{saquesAbertos > 1 ? "s" : ""} em aberto —{" "}
                    <span className="text-white">R$ {valorSaquesAbertos.toFixed(2)}</span> aguardando PIX
                  </p>
                </div>
                <span className="text-yellow-600 text-xs font-bold uppercase tracking-widest group-hover:text-yellow-400">VER SAQUES →</span>
              </div>
            </Link>
          )}
          {pedidosPendentes > 0 && (
            <Link href="/admin/pedidos">
              <div className="w-full bg-blue-950/30 border border-blue-700/40 rounded-2xl px-6 py-4 flex items-center justify-between group hover:border-blue-500/60 transition-all">
                <div className="flex items-center gap-3">
                  <PackageCheck size={20} className="text-blue-400" />
                  <p className="text-blue-300 font-bold text-sm">
                    {pedidosPendentes} pedido{pedidosPendentes > 1 ? "s" : ""} aguardando separação ou despacho
                  </p>
                </div>
                <span className="text-blue-600 text-xs font-bold uppercase tracking-widest group-hover:text-blue-400">VER PEDIDOS →</span>
              </div>
            </Link>
          )}
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#C9A66B]/10 flex items-center justify-center">
              <Users className="text-[#C9A66B]" size={26} />
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Total da Rede</p>
              <p className="text-3xl font-black">{membros}</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-900/20 flex items-center justify-center">
              <Activity className="text-green-500" size={26} />
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Acessos Hoje</p>
              <p className="text-3xl font-black">{acessosHoje}</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-900/20 flex items-center justify-center">
              <DollarSign className="text-emerald-400" size={26} />
            </div>
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Total de Vendas</p>
              <p className="text-3xl font-black">
                R$ {totalVendas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[10px] text-zinc-600">{pedidosPagos} pedido{pedidosPagos !== 1 ? "s" : ""} pago{pedidosPagos !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <Link href="/admin/pedidos">
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex items-center gap-4 hover:border-blue-500/30 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-blue-900/20 flex items-center justify-center">
                <ShoppingBag className="text-blue-400" size={26} />
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Pedidos em Aberto</p>
                <p className="text-3xl font-black">{pedidosPendentes}</p>
                <p className="text-[10px] text-blue-600 group-hover:text-blue-400 transition-colors">Ver pedidos →</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/saques">
            <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex items-center gap-4 hover:border-yellow-500/30 transition-all cursor-pointer group">
              <div className="w-12 h-12 rounded-xl bg-yellow-900/20 flex items-center justify-center">
                <ArrowDownToLine className="text-yellow-400" size={26} />
              </div>
              <div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Saques Aguardando</p>
                <p className="text-3xl font-black">{saquesAbertos}</p>
                <p className="text-[10px] text-yellow-600 group-hover:text-yellow-400 transition-colors">
                  {saquesAbertos > 0 ? `R$ ${valorSaquesAbertos.toFixed(2)} a pagar →` : "Nenhum pendente"}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
