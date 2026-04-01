"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import Link from "next/link";
import {
  Users, Activity, ShoppingBag, DollarSign,
  ArrowDownToLine, AlertTriangle, PackageCheck,
  UserPlus, TrendingUp, Truck, PackageOpen, Clock,
  BadgeDollarSign, Loader2,
} from "lucide-react";

type Resumo = {
  membros: number;
  acessosHoje: number;
  cadastrosHoje: number;
  cadastrosSemana: number;
  ativosNoMes: number;
  totalVendas: number;
  vendasMes: number;
  pedidosPagos: number;
  pedidosPendentes: number;
  pedidosDespachados: number;
  pedidosEntregues: number;
  pedidosAguardando: number;
  saquesAbertos: number;
  valorSaquesAbertos: number;
  comissoesTotais: number;
  ultimosMembros: any[];
  ultimosPedidos: any[];
};

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  pending: { label: "Aguardando", cor: "text-zinc-400" },
  novo: { label: "Aguardando", cor: "text-zinc-400" },
  paid: { label: "Pago", cor: "text-blue-400" },
  separacao: { label: "Separação", cor: "text-yellow-400" },
  despachado: { label: "Despachado", cor: "text-emerald-400" },
  entregue: { label: "Entregue", cor: "text-green-300" },
  cancelled: { label: "Cancelado", cor: "text-red-400" },
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Card({ icon, label, value, sub, href, color = "text-[#C9A66B]", bg = "bg-[#C9A66B]/10" }: any) {
  const inner = (
    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5 flex items-center gap-4 hover:border-white/10 transition-all h-full">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">{label}</p>
        <p className="text-2xl font-black leading-tight">{value}</p>
        {sub && <p className={`text-[10px] mt-0.5 ${color}`}>{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : <div>{inner}</div>;
}

export default function AdminDashboard() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setErro("");
      const res = await fetch("/api/admin/summary", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok || !data?.resumo) {
        setErro(data?.error || "Falha ao carregar métricas.");
        setLoading(false);
        return;
      }
      setResumo(data.resumo);
      setLoading(false);
    }
    carregar();
  }, []);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black italic uppercase">
            Painel <span className="text-[#C9A66B]">Admin</span>
          </h1>
          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </span>
        </div>

        {erro && (
          <div className="mb-6 rounded-xl border border-red-800/50 bg-red-950/30 px-4 py-3 text-xs text-red-300">
            {erro}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center mt-20">
            <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
          </div>
        ) : resumo && (
          <>
            {/* ALERTAS */}
            <div className="flex flex-col gap-3 mb-8">
              {resumo.saquesAbertos > 0 && (
                <Link href="/admin/saques">
                  <div className="w-full bg-yellow-950/30 border border-yellow-700/40 rounded-2xl px-6 py-4 flex items-center justify-between group hover:border-yellow-500/60 transition-all">
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={18} className="text-yellow-400" />
                      <p className="text-yellow-300 font-bold text-sm">
                        {resumo.saquesAbertos} saque{resumo.saquesAbertos > 1 ? "s" : ""} em aberto —{" "}
                        <span className="text-white">{moeda(resumo.valorSaquesAbertos)}</span> aguardando PIX
                      </p>
                    </div>
                    <span className="text-yellow-600 text-xs font-bold uppercase tracking-widest group-hover:text-yellow-400">VER →</span>
                  </div>
                </Link>
              )}
              {resumo.pedidosPendentes > 0 && (
                <Link href="/admin/pedidos">
                  <div className="w-full bg-blue-950/30 border border-blue-700/40 rounded-2xl px-6 py-4 flex items-center justify-between group hover:border-blue-500/60 transition-all">
                    <div className="flex items-center gap-3">
                      <PackageCheck size={18} className="text-blue-400" />
                      <p className="text-blue-300 font-bold text-sm">
                        {resumo.pedidosPendentes} pedido{resumo.pedidosPendentes > 1 ? "s" : ""} aguardando separação ou despacho
                      </p>
                    </div>
                    <span className="text-blue-600 text-xs font-bold uppercase tracking-widest group-hover:text-blue-400">VER →</span>
                  </div>
                </Link>
              )}
              {resumo.pedidosAguardando > 0 && (
                <Link href="/admin/pedidos">
                  <div className="w-full bg-zinc-900 border border-zinc-700/40 rounded-2xl px-6 py-4 flex items-center justify-between group hover:border-zinc-500/60 transition-all">
                    <div className="flex items-center gap-3">
                      <Clock size={18} className="text-zinc-400" />
                      <p className="text-zinc-300 font-bold text-sm">
                        {resumo.pedidosAguardando} pedido{resumo.pedidosAguardando > 1 ? "s" : ""} aguardando confirmação de pagamento
                      </p>
                    </div>
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest group-hover:text-zinc-300">VER →</span>
                  </div>
                </Link>
              )}
            </div>

            {/* LINHA 1 — MEMBROS */}
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3">Membros</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card
                icon={<Users className="text-[#C9A66B]" size={22} />}
                label="Total da Rede"
                value={resumo.membros}
                sub={`${resumo.acessosHoje} online hoje`}
                href="/admin/membros"
              />
              <Card
                icon={<UserPlus className="text-green-400" size={22} />}
                label="Novos Hoje"
                value={resumo.cadastrosHoje}
                sub={`${resumo.cadastrosSemana} nos últimos 7 dias`}
                color="text-green-400"
                bg="bg-green-900/20"
                href="/admin/novos"
              />
              <Card
                icon={<Activity className="text-blue-400" size={22} />}
                label="Ativos este mês"
                value={resumo.ativosNoMes}
                sub="Ver termômetro →"
                color="text-blue-400"
                bg="bg-blue-900/20"
                href="/admin/ativos"
              />
              <Card
                icon={<Users className="text-red-400" size={22} />}
                label="Inativos"
                value={resumo.membros - resumo.ativosNoMes}
                sub="Ver quem está parado →"
                color="text-red-400"
                bg="bg-red-900/20"
                href="/admin/inativos"
              />
            </div>

            {/* LINHA 2 — FINANCEIRO */}
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3">Financeiro</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card
                icon={<DollarSign className="text-emerald-400" size={22} />}
                label="Total de Vendas"
                value={moeda(resumo.totalVendas)}
                sub={`${resumo.pedidosPagos} pedidos pagos`}
                color="text-emerald-400"
                bg="bg-emerald-900/20"
              />
              <Card
                icon={<TrendingUp className="text-emerald-300" size={22} />}
                label="Vendas este Mês"
                value={moeda(resumo.vendasMes)}
                color="text-emerald-300"
                bg="bg-emerald-900/10"
              />
              <Card
                icon={<BadgeDollarSign className="text-yellow-400" size={22} />}
                label="Comissões Geradas"
                value={moeda(resumo.comissoesTotais)}
                sub="Total pago a embaixadores"
                color="text-yellow-400"
                bg="bg-yellow-900/20"
                href="/admin/saques"
              />
              <Card
                icon={<ArrowDownToLine className="text-yellow-300" size={22} />}
                label="Saques Aguardando"
                value={resumo.saquesAbertos}
                sub={resumo.saquesAbertos > 0 ? `${moeda(resumo.valorSaquesAbertos)} a pagar` : "Nenhum pendente"}
                color="text-yellow-300"
                bg="bg-yellow-900/10"
                href="/admin/saques"
              />
            </div>

            {/* LINHA 3 — PEDIDOS */}
            <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3">Pedidos por Status</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card
                icon={<Clock className="text-zinc-400" size={22} />}
                label="Aguardando Pagamento"
                value={resumo.pedidosAguardando}
                color="text-zinc-400"
                bg="bg-zinc-800/40"
                href="/admin/pedidos"
              />
              <Card
                icon={<ShoppingBag className="text-blue-400" size={22} />}
                label="Pago / Separação"
                value={resumo.pedidosPendentes}
                sub="Precisam de ação →"
                color="text-blue-400"
                bg="bg-blue-900/20"
                href="/admin/pedidos"
              />
              <Card
                icon={<Truck className="text-emerald-400" size={22} />}
                label="Despachados"
                value={resumo.pedidosDespachados}
                color="text-emerald-400"
                bg="bg-emerald-900/20"
                href="/admin/pedidos"
              />
              <Card
                icon={<PackageOpen className="text-green-300" size={22} />}
                label="Entregues"
                value={resumo.pedidosEntregues}
                color="text-green-300"
                bg="bg-green-900/10"
                href="/admin/pedidos"
              />
            </div>

            {/* ATIVIDADE RECENTE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ÚLTIMOS MEMBROS */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Últimos Cadastros</p>
                  <Link href="/admin/novos" className="text-[10px] text-[#C9A66B] font-bold uppercase hover:underline">Ver todos →</Link>
                </div>
                <div className="flex flex-col gap-2">
                  {(resumo.ultimosMembros || []).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-[#C9A66B]/10 flex items-center justify-center text-[10px] font-black text-[#C9A66B]">
                          {m.full_name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-xs font-bold leading-tight">{m.full_name || "—"}</p>
                          <p className="text-[10px] text-zinc-600">{m.email}</p>
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-600">
                        {new Date(m.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ÚLTIMOS PEDIDOS */}
              <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Últimos Pedidos</p>
                  <Link href="/admin/pedidos" className="text-[10px] text-[#C9A66B] font-bold uppercase hover:underline">Ver todos →</Link>
                </div>
                <div className="flex flex-col gap-2">
                  {(resumo.ultimosPedidos || []).map((p: any) => {
                    const st = STATUS_LABEL[p.status] || { label: p.status, cor: "text-zinc-400" };
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-blue-900/20 flex items-center justify-center">
                            <ShoppingBag size={12} className="text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold leading-tight">{p.profiles?.full_name || "—"}</p>
                            <p className={`text-[10px] font-bold ${st.cor}`}>{st.label}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-white">
                          {moeda(Number(p.total))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
