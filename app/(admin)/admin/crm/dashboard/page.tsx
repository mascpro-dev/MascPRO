"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminSidebar from "@/componentes/AdminSidebar";
import {
  LayoutDashboard, Loader2, AlertCircle, DollarSign, TrendingUp,
  Users, Kanban, AlertTriangle, ShoppingBag, ArrowDownToLine,
  CheckCircle, Clock, Target, RefreshCw, MessageCircle,
} from "lucide-react";

type DashData = {
  usuario: { full_name: string; role: string; avatar_url?: string };
  pipeline: {
    novo: number; contato_feito: number; qualificado?: number; diagnostico?: number;
    proposta: number; negociacao: number; fechado: number; perdido: number;
    reativar?: number; nao_qualificado?: number;
    total: number; valor_pipeline: number;
    followups_atrasados: number; taxa_conversao: number;
  };
  financeiro: {
    total_vendas_rede: number; vendas_mes: number;
    total_pedidos_rede: number; pedidos_mes: number;
    comissoes_pagas: number; comissoes_aguardando: number;
  };
  rede: { total: number; lista: any[] };
  membros_em_risco: { id: string; full_name: string; ultima_compra: string | null; dias: number }[];
  ultimos_pedidos: any[];
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Card({
  icon, label, value, sub, cor = "text-[#C9A66B]", bg = "bg-[#C9A66B]/10", href,
}: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; cor?: string; bg?: string; href?: string;
}) {
  const inner = (
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-white/10 transition-all h-full">
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">{label}</p>
        <p className="text-2xl font-black leading-tight">{value}</p>
        {sub && <p className={`text-[10px] mt-0.5 ${cor}`}>{sub}</p>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : <div>{inner}</div>;
}

export default function CrmDashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizando, setAtualizando] = useState(false);

  async function carregar(silencioso = false) {
    if (!silencioso) setLoading(true);
    else setAtualizando(true);
    setErro("");
    const res = await fetch("/api/admin/crm/dashboard", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Falha ao carregar dashboard.");
    } else {
      setData(d);
    }
    setLoading(false);
    setAtualizando(false);
  }

  useEffect(() => { carregar(); }, []);

  if (loading) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
        </main>
      </div>
    );
  }

  if (erro || !data) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
        <AdminSidebar />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <AlertCircle className="text-red-400 mx-auto mb-3" size={32} />
            <p className="text-red-400 font-bold">{erro}</p>
          </div>
        </main>
      </div>
    );
  }

  const { pipeline, financeiro, rede, membros_em_risco, ultimos_pedidos } = data;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />

      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black italic uppercase">
                Dashboard <span className="text-[#C9A66B]">CRM</span>
              </h1>
              <p className="text-zinc-500 text-xs">{data.usuario.full_name} · {data.usuario.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => carregar(true)}
              disabled={atualizando}
              className="flex items-center gap-2 text-[10px] text-zinc-500 hover:text-white font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all disabled:opacity-40"
            >
              <RefreshCw size={12} className={atualizando ? "animate-spin" : ""} /> Atualizar
            </button>
            <Link
              href="/admin/crm"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-[#C9A66B]/50 text-zinc-400 hover:text-[#C9A66B] transition-all"
            >
              <Kanban size={12} /> Pipeline
            </Link>
          </div>
        </div>

        {/* ALERTAS */}
        {(pipeline.followups_atrasados > 0 || membros_em_risco.length > 0) && (
          <div className="flex flex-col gap-3 mb-8">
            {pipeline.followups_atrasados > 0 && (
              <div className="w-full bg-yellow-950/30 border border-yellow-700/40 rounded-2xl px-6 py-4 flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-yellow-400" />
                  <p className="text-yellow-300 font-bold text-sm">
                    {pipeline.followups_atrasados} follow-up{pipeline.followups_atrasados > 1 ? "s" : ""} em atraso no pipeline
                  </p>
                </div>
                <Link href="/admin/crm" className="text-yellow-600 text-xs font-bold uppercase tracking-widest hover:text-yellow-400">VER →</Link>
              </div>
            )}
            {membros_em_risco.length > 0 && (
              <div className="w-full bg-red-950/30 border border-red-700/40 rounded-2xl px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle size={18} className="text-red-400" />
                  <p className="text-red-300 font-bold text-sm">
                    {membros_em_risco.length} membro{membros_em_risco.length > 1 ? "s" : ""} da rede sem comprar há mais de 30 dias
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PIPELINE */}
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3">Pipeline de Leads</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card icon={<Kanban className="text-blue-400" size={22} />} label="Total no Funil" value={pipeline.total}
            sub={`${pipeline.taxa_conversao}% de conversão`} cor="text-blue-400" bg="bg-blue-900/20" href="/admin/crm" />
          <Card icon={<Target className="text-[#C9A66B]" size={22} />} label="Valor no Funil" value={moeda(pipeline.valor_pipeline)}
            sub={`${pipeline.proposta + pipeline.negociacao} em proposta/negoc.`} />
          <Card icon={<CheckCircle className="text-green-400" size={22} />} label="Fechados" value={pipeline.fechado}
            cor="text-green-400" bg="bg-green-900/20" href="/admin/crm" />
          <Card icon={<Clock className="text-yellow-400" size={22} />} label="Follow-ups Atrasados" value={pipeline.followups_atrasados}
            sub={pipeline.followups_atrasados > 0 ? "Ação necessária!" : "Tudo em dia"}
            cor={pipeline.followups_atrasados > 0 ? "text-red-400" : "text-green-400"}
            bg={pipeline.followups_atrasados > 0 ? "bg-red-900/20" : "bg-green-900/20"} href="/admin/crm" />
        </div>

        {/* Funil visual */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-8">
          {[
            { key: "novo", label: "Novo", value: pipeline.novo, cor: "text-blue-400", bg: "bg-blue-500/10", borda: "border-blue-500/20" },
            { key: "contato_feito", label: "Atend.", value: pipeline.contato_feito, cor: "text-yellow-400", bg: "bg-yellow-500/10", borda: "border-yellow-500/20" },
            { key: "qualificado", label: "Qualif.", value: pipeline.qualificado || 0, cor: "text-cyan-400", bg: "bg-cyan-500/10", borda: "border-cyan-500/20" },
            { key: "diagnostico", label: "Diagn.", value: pipeline.diagnostico || 0, cor: "text-amber-400", bg: "bg-amber-500/10", borda: "border-amber-500/20" },
            { key: "proposta", label: "Proposta", value: pipeline.proposta, cor: "text-orange-400", bg: "bg-orange-500/10", borda: "border-orange-500/20" },
            { key: "negociacao", label: "Negoc.", value: pipeline.negociacao, cor: "text-purple-400", bg: "bg-purple-500/10", borda: "border-purple-500/20" },
            { key: "fechado", label: "Fechado", value: pipeline.fechado, cor: "text-green-400", bg: "bg-green-500/10", borda: "border-green-500/20" },
            { key: "perdido", label: "Perdido", value: pipeline.perdido, cor: "text-red-400", bg: "bg-red-500/10", borda: "border-red-500/20" },
            { key: "reativar", label: "Reativar", value: pipeline.reativar || 0, cor: "text-pink-400", bg: "bg-pink-500/10", borda: "border-pink-500/20" },
            { key: "nao_qualificado", label: "Não qual.", value: pipeline.nao_qualificado || 0, cor: "text-zinc-400", bg: "bg-zinc-500/10", borda: "border-zinc-500/20" },
          ].map((col) => (
            <div key={col.key} className={`${col.bg} border ${col.borda} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-black ${col.cor}`}>{col.value}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${col.cor}`}>{col.label}</p>
            </div>
          ))}
        </div>

        {/* FINANCEIRO */}
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3">Financeiro da Rede</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card icon={<DollarSign className="text-emerald-400" size={22} />} label="Total Vendas Rede" value={moeda(financeiro.total_vendas_rede)}
            sub={`${financeiro.total_pedidos_rede} pedidos pagos`} cor="text-emerald-400" bg="bg-emerald-900/20" />
          <Card icon={<TrendingUp className="text-emerald-300" size={22} />} label="Vendas este Mês" value={moeda(financeiro.vendas_mes)}
            sub={`${financeiro.pedidos_mes} pedidos`} cor="text-emerald-300" bg="bg-emerald-900/10" />
          <Card icon={<CheckCircle className="text-[#C9A66B]" size={22} />} label="Comissões Recebidas" value={moeda(financeiro.comissoes_pagas)}
            sub="Total histórico pago" />
          <Card icon={<ArrowDownToLine className="text-yellow-400" size={22} />} label="Comissões Aguardando" value={moeda(financeiro.comissoes_aguardando)}
            sub={financeiro.comissoes_aguardando > 0 ? "A receber" : "Nenhuma pendente"}
            cor={financeiro.comissoes_aguardando > 0 ? "text-yellow-400" : "text-zinc-500"} bg="bg-yellow-900/20" />
        </div>

        {/* REDE */}
        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3">Rede</p>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card icon={<Users className="text-blue-400" size={22} />} label="Membros na Rede" value={rede.total}
            sub="Indicados diretos" cor="text-blue-400" bg="bg-blue-900/20" />
          <Card icon={<AlertTriangle className="text-red-400" size={22} />} label="Em Risco (30+ dias)" value={membros_em_risco.length}
            sub={membros_em_risco.length > 0 ? "Precisam de contato" : "Rede saudável"}
            cor={membros_em_risco.length > 0 ? "text-red-400" : "text-green-400"}
            bg={membros_em_risco.length > 0 ? "bg-red-900/20" : "bg-green-900/10"} />
        </div>

        {/* ATIVIDADE RECENTE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Membros em risco */}
          {membros_em_risco.length > 0 && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">
                Membros em Risco de Abandono
              </p>
              <div className="flex flex-col gap-2">
                {membros_em_risco.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-red-900/20 flex items-center justify-center shrink-0">
                        <AlertTriangle size={12} className="text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold leading-tight">{m.full_name}</p>
                        <p className="text-[10px] text-zinc-600">
                          {m.ultima_compra
                            ? `Última compra há ${m.dias} dias`
                            : "Nunca comprou"}
                        </p>
                      </div>
                    </div>
                    {m.ultima_compra && (
                      <a
                        href={`https://wa.me/`}
                        className="w-7 h-7 rounded-lg bg-green-900/20 flex items-center justify-center hover:bg-green-900/40 transition-colors"
                      >
                        <MessageCircle size={13} className="text-green-400" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Últimos pedidos da rede */}
          {ultimos_pedidos.length > 0 && (
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">
                Últimos Pedidos da Rede
              </p>
              <div className="flex flex-col gap-2">
                {ultimos_pedidos.map((p: any) => {
                  const STATUS_COR: Record<string, string> = {
                    paid: "text-blue-400", separacao: "text-yellow-400",
                    despachado: "text-emerald-400", entregue: "text-green-300",
                    pending: "text-zinc-500", cancelled: "text-red-400",
                  };
                  const STATUS_LABEL: Record<string, string> = {
                    paid: "Pago", separacao: "Separação", despachado: "Despachado",
                    entregue: "Entregue", pending: "Aguardando", cancelled: "Cancelado",
                  };
                  return (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-900/20 flex items-center justify-center shrink-0">
                          <ShoppingBag size={12} className="text-blue-400" />
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase ${STATUS_COR[p.status] || "text-zinc-400"}`}>
                            {STATUS_LABEL[p.status] || p.status}
                          </p>
                          <p className="text-[10px] text-zinc-600">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                        </div>
                      </div>
                      <span className="text-sm font-black text-white">{moeda(Number(p.total))}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
