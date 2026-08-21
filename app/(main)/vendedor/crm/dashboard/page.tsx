"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import PedidoPdfClienteButton from "@/componentes/PedidoPdfClienteButton";
import {
  LayoutDashboard, Loader2, DollarSign, TrendingUp, Kanban,
  AlertTriangle, ShoppingBag, RefreshCw, Percent, MapPin, Target,
} from "lucide-react";

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function VendedorCrmDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true);
    setErro("");
    const res = await fetch("/api/vendedor/crm/dashboard", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Falha ao carregar.");
    else setData(d);
    setLoading(false);
  }

  useEffect(() => { void carregar(); }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
      </div>
    );
  }

  if (erro || !data) {
    return (
      <ErroComVoltar mensagem={erro} onVoltar={() => window.history.back()} rotuloVoltar="Voltar" />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">CRM Vendedor</p>
          <h1 className="text-2xl font-black text-white">Olá, {data.usuario?.full_name}</h1>
        </div>
        <button
          type="button"
          onClick={() => void carregar()}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-400 hover:text-white"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
          <Kanban className="text-[#C9A66B] mb-2" size={20} />
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Leads em aberto</p>
          <p className="text-3xl font-black">{data.pipeline?.em_aberto ?? 0}</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
          <TrendingUp className="text-emerald-400 mb-2" size={20} />
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Fechados</p>
          <p className="text-3xl font-black">{data.pipeline?.fechado ?? 0}</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
          <DollarSign className="text-[#C9A66B] mb-2" size={20} />
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Vendas do mês</p>
          <p className="text-2xl font-black">{moeda(data.vendas_mes || 0)}</p>
          <p className="text-[10px] text-zinc-600">Exclui consignado</p>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
          <MapPin className="text-blue-400 mb-2" size={20} />
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Visitas do mês</p>
          <p className="text-3xl font-black">{data.visitas_mes ?? data.realizado?.visitas ?? 0}</p>
          <Link href="/vendedor/crm/visitas" className="text-[10px] text-[#C9A66B] font-bold uppercase mt-1 inline-block">Registrar</Link>
        </div>
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 sm:col-span-2 lg:col-span-1">
          <Percent className="text-yellow-400 mb-2" size={20} />
          <p className="text-[10px] text-zinc-500 uppercase font-bold">Comissão atual</p>
          <p className="text-3xl font-black">{data.comissao_percentual_atual ?? 0}%</p>
        </div>
      </div>

      {(data.meta?.meta_receita > 0 || data.meta?.meta_visitas > 0) && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
              <Target size={14} className="text-[#C9A66B]" /> Metas do mês
            </h2>
            <Link href="/vendedor/crm/metas" className="text-[10px] font-bold text-[#C9A66B] uppercase">Detalhes</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { l: "Visitas", p: data.progresso?.visitas, r: data.realizado?.visitas, m: data.meta?.meta_visitas },
              { l: "Leads", p: data.progresso?.leads, r: data.realizado?.leads, m: data.meta?.meta_leads },
              { l: "Fechados", p: data.progresso?.conversoes, r: data.realizado?.conversoes, m: data.meta?.meta_conversoes },
              { l: "Receita", p: data.progresso?.receita, r: moeda(data.realizado?.receita || 0), m: moeda(data.meta?.meta_receita || 0) },
            ].map((item) => (
              <div key={item.l} className="bg-zinc-950/50 rounded-xl p-3">
                <p className="text-[10px] text-zinc-500 uppercase">{item.l}</p>
                <p className="text-lg font-black text-[#C9A66B]">{item.p ?? 0}%</p>
                <p className="text-[10px] text-zinc-600">{item.r}/{item.m}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.pedidos_pendentes_aprovacao > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <AlertTriangle className="text-amber-400 shrink-0" />
          <p className="text-sm text-amber-200">
            {data.pedidos_pendentes_aprovacao} pedido(s) aguardando aprovação do distribuidor (desconto/bônus).
          </p>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Últimos pedidos</h2>
          <Link href="/vendedor/crm" className="text-[10px] font-bold text-[#C9A66B] uppercase tracking-widest">
            Ir ao pipeline
          </Link>
        </div>
        <ul className="space-y-2">
          {(data.ultimos_pedidos || []).map((p: any) => (
            <li key={p.id} className="flex justify-between items-center gap-2 text-sm border-b border-zinc-800/50 pb-2">
              <span className="text-zinc-400 font-mono">#{String(p.id).slice(0, 8)}</span>
              <span className="text-zinc-300">{moeda(Number(p.total))}</span>
              <span className="text-zinc-500 text-xs">{p.status}{p.aprovacao_status === "pendente" ? " · aguardando" : ""}</span>
              <PedidoPdfClienteButton orderId={p.id} compacto />
            </li>
          ))}
          {!data.ultimos_pedidos?.length && (
            <li className="text-zinc-600 text-sm flex items-center gap-2">
              <ShoppingBag size={14} /> Nenhum pedido ainda.
            </li>
          )}
        </ul>
      </div>

      <Link
        href="/vendedor/crm"
        className="inline-flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase text-xs tracking-widest px-6 py-3 rounded-xl"
      >
        <LayoutDashboard size={16} /> Abrir pipeline
      </Link>
    </div>
  );
}
