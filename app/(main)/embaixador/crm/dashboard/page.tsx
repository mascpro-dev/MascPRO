"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import {
  LayoutDashboard, Loader2, DollarSign, TrendingUp, Users,
  Kanban, AlertTriangle, ShoppingBag, RefreshCw, Sparkles,
} from "lucide-react";

type DashData = {
  usuario: { full_name: string };
  pipeline: {
    novo: number; contato_feito: number; proposta: number;
    negociacao: number; fechado: number; perdido: number;
    total: number; valor_pipeline: number;
    followups_atrasados: number; taxa_conversao: number;
  };
  resumo: {
    vendas_mes: number; pedidos_mes: number;
    comissao_mes: number; indicados: number;
  };
  rede: { id: string; full_name: string; role: string; created_at: string }[];
  ultimos_pedidos: { id: string; total: number; status: string; created_at: string }[];
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
    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex items-center gap-4 hover:border-[#C9A66B]/20 transition-all h-full">
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

export default function EmbaixadoraCrmDashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizando, setAtualizando] = useState(false);

  async function carregar(silencioso = false) {
    if (!silencioso) setLoading(true);
    else setAtualizando(true);
    setErro("");
    const res = await fetch("/api/embaixador/crm/dashboard", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Falha ao carregar dashboard.");
    } else {
      setData(d);
    }
    setLoading(false);
    setAtualizando(false);
  }

  useEffect(() => { void carregar(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
      </div>
    );
  }

  if (erro || !data) {
    return (
      <ErroComVoltar
        mensagem={erro || "Não foi possível carregar."}
        onVoltar={() => window.history.back()}
        onTentarNovamente={() => { setLoading(true); void carregar(); }}
        rotuloVoltar="Voltar"
      />
    );
  }

  const { pipeline, resumo, rede, ultimos_pedidos } = data;
  const emAberto = pipeline.novo + pipeline.contato_feito + pipeline.proposta + pipeline.negociacao;

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/15 border border-[#C9A66B]/25 flex items-center justify-center">
            <LayoutDashboard className="text-[#C9A66B]" size={22} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase italic">
              Dashboard <span className="text-[#C9A66B]">CRM</span>
            </h1>
            <p className="text-zinc-500 text-xs">{data.usuario.full_name} · Rede</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void carregar(true)}
          disabled={atualizando}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#C9A66B] px-3 py-2 rounded-lg border border-zinc-800 hover:border-[#C9A66B]/30 disabled:opacity-50"
        >
          <RefreshCw size={12} className={atualizando ? "animate-spin" : ""} />
          Atualizar
        </button>
      </div>

      <div className="rounded-xl border border-[#C9A66B]/15 bg-zinc-900/40 px-4 py-3 flex items-start gap-3">
        <Sparkles size={16} className="text-[#C9A66B] shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-400 leading-relaxed">
          Acompanhe sua rede e registre <strong className="text-[#C9A66B]">pedidos da MascPRO</strong> para cabeleireiras e novas embaixadoras.
          Separação e envio ficam com a equipe.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card
          icon={<DollarSign size={20} className="text-[#C9A66B]" />}
          label="Vendas do mês"
          value={moeda(resumo.vendas_mes)}
          sub={`${resumo.pedidos_mes} pedido(s) pago(s)`}
          href="/embaixador/crm"
        />
        <Card
          icon={<TrendingUp size={20} className="text-emerald-400" />}
          label="Comissão do mês"
          value={moeda(resumo.comissao_mes)}
          cor="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <Card
          icon={<Kanban size={20} className="text-blue-400" />}
          label="Leads em aberto"
          value={emAberto}
          sub={`${pipeline.taxa_conversao}% conversão`}
          cor="text-blue-400"
          bg="bg-blue-500/10"
          href="/embaixador/crm"
        />
        <Card
          icon={<Users size={20} className="text-pink-400" />}
          label="Indicados diretos"
          value={resumo.indicados}
          cor="text-pink-400"
          bg="bg-pink-500/10"
          href="/rede"
        />
      </div>

      {pipeline.followups_atrasados > 0 && (
        <Link
          href="/embaixador/crm"
          className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 hover:bg-red-500/15 transition-colors"
        >
          <AlertTriangle className="text-red-400 shrink-0" size={18} />
          <div>
            <p className="text-sm font-bold text-red-300">
              {pipeline.followups_atrasados} follow-up(s) em atraso
            </p>
            <p className="text-[10px] text-zinc-500">Ver no pipeline →</p>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <Kanban size={14} className="text-[#C9A66B]" />
            Funil da rede
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { k: "novo", l: "Novo", c: "text-blue-400" },
              { k: "contato_feito", l: "Contato", c: "text-yellow-400" },
              { k: "proposta", l: "Proposta", c: "text-orange-400" },
              { k: "negociacao", l: "Negociação", c: "text-purple-400" },
              { k: "fechado", l: "Fechado", c: "text-green-400" },
              { k: "perdido", l: "Perdido", c: "text-red-400" },
            ].map((col) => (
              <div key={col.k} className="bg-black/40 rounded-xl p-3 text-center border border-zinc-800">
                <p className={`text-lg font-black ${col.c}`}>
                  {pipeline[col.k as keyof typeof pipeline] as number}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold">{col.l}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-500 mt-3">
            Pipeline estimado: {moeda(pipeline.valor_pipeline)}
          </p>
        </div>

        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <Users size={14} className="text-pink-400" />
            Sua rede direta
          </h2>
          {rede.length === 0 ? (
            <p className="text-sm text-zinc-600">Nenhum indicado cadastrado ainda.</p>
          ) : (
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {rede.map((m) => (
                <li key={m.id} className="flex justify-between items-center text-sm py-2 border-b border-zinc-800/50 last:border-0">
                  <span className="font-medium truncate">{m.full_name}</span>
                  <span className="text-[10px] uppercase text-zinc-500 shrink-0 ml-2">
                    {m.role === "EMBAIXADOR" ? "Embaixadora" : "Cabeleireira"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {ultimos_pedidos.length > 0 && (
        <div className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
            <ShoppingBag size={14} className="text-[#C9A66B]" />
            Últimos pedidos da rede
          </h2>
          <ul className="divide-y divide-zinc-800">
            {ultimos_pedidos.map((p) => (
              <li key={p.id} className="flex justify-between items-center py-3 text-sm">
                <span className="text-zinc-400 font-mono text-xs">#{p.id.slice(0, 8)}</span>
                <span className="font-bold text-[#C9A66B]">{moeda(Number(p.total))}</span>
                <span className="text-[10px] uppercase text-zinc-500">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
