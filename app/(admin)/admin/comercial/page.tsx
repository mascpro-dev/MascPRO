"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Kanban, Filter, ShoppingBag, RefreshCw, Package,
  Sparkles, Users, Camera, Calendar, MessageCircle, Target,
  Bell, ChevronDown, Menu, ArrowUpRight, ArrowDownRight, Loader2,
} from "lucide-react";

type ModuloId =
  | "dashboard" | "leads" | "funil" | "vendas" | "homecare" | "linhas"
  | "embaixadoras" | "distribuidores" | "provas" | "eventos" | "ia" | "metas";

type Semaforo = "ok" | "atencao" | "risco";
type Formato = "int" | "moeda";

type Kpi = {
  key: string;
  label: string;
  value: number;
  anterior: number | null;
  formato: Formato;
  status: Semaforo;
  spark: number[];
};

type Overview = {
  ok: boolean;
  error?: string;
  periodo: string;
  periodoAnterior: string;
  kpis: Kpi[];
  serie: { mes: string; label: string; leads: number; pedidos: number; faturamento: number }[];
  origens: { key: string; label: string; n: number }[];
  gauges: { label: string; value: number }[];
  funil: { key: string; label: string; n: number }[];
  topProdutos: { id: string; title: string; qtd: number; receita: number }[];
  scorecard: { area: string; atual: number; anterior: number; formato: Formato; status: Semaforo; delta: string }[];
  leitura: { origem: string; produto: string; gargalo: string; followups: string; recompra: string };
};

const NAV: { id: ModuloId; nome: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", nome: "Dashboard", icon: LayoutDashboard },
  { id: "leads", nome: "CRM de Leads", icon: Kanban },
  { id: "funil", nome: "Funil comercial", icon: Filter },
  { id: "vendas", nome: "Vendas e pedidos", icon: ShoppingBag },
  { id: "homecare", nome: "Home care", icon: RefreshCw },
  { id: "linhas", nome: "Produtos e linhas", icon: Package },
  { id: "embaixadoras", nome: "Embaixadoras", icon: Sparkles },
  { id: "distribuidores", nome: "Distribuidores", icon: Users },
  { id: "provas", nome: "Banco de provas", icon: Camera },
  { id: "eventos", nome: "Eventos", icon: Calendar },
  { id: "ia", nome: "Atendimento e IA", icon: MessageCircle },
  { id: "metas", nome: "Metas e scorecard", icon: Target },
];

const DONUT_COLORS = ["#C9A66B", "#6F8F78", "#B8A48A", "#B85C4C", "#8A847A", "#D4C4A8"];

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function num(v: number) {
  return v.toLocaleString("pt-BR");
}
function fmt(v: number, f: Formato) {
  return f === "moeda" ? moeda(v) : num(Math.round(v));
}
function tone(s: Semaforo) {
  if (s === "ok") return { text: "text-[#4F7A5A]", bg: "bg-[#E7F0EA]", bar: "#6F8F78", label: "Acima / estável" };
  if (s === "atencao") return { text: "text-[#8A6A32]", bg: "bg-[#F5EDDF]", bar: "#C9A66B", label: "Atenção" };
  return { text: "text-[#9A4338]", bg: "bg-[#F6E6E2]", bar: "#B85C4C", label: "Abaixo" };
}
function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length || values.every((v) => v === 0)) {
    return <div className="w-[88px] h-8" />;
  }
  const w = 88;
  const h = 32;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 3 - ((v - min) / (max - min || 1)) * (h - 8);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const area = `M 0 ${h} ${pts.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} L ${w} ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={area} fill={color} opacity={0.16} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AreaChart({ serie }: { serie: Overview["serie"] }) {
  const w = 560;
  const h = 220;
  const pad = { l: 36, r: 12, t: 16, b: 28 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const max = Math.max(1, ...serie.map((s) => Math.max(s.leads, s.pedidos)));
  const x = (i: number) => pad.l + (serie.length <= 1 ? innerW / 2 : (i / (serie.length - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`).join(" ");
  const area = (arr: number[]) =>
    `M ${x(0)} ${y(0)} ${arr.map((v, i) => `L ${x(i)} ${y(v)}`).join(" ")} L ${x(arr.length - 1)} ${y(0)} Z`;
  const ticks = [0, Math.round(max / 2), max];
  const leads = serie.map((s) => s.leads);
  const pedidos = serie.map((s) => s.pedidos);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[220px]" role="img" aria-label="Leads e pedidos pagos nos últimos 6 meses">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="#E7E1D6" strokeWidth="1" />
          <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#8A847A">{v}</text>
        </g>
      ))}
      {serie.length > 0 && (
        <>
          <path d={area(leads)} fill="#C9A66B" opacity="0.14" />
          <path d={path(leads)} fill="none" stroke="#C9A66B" strokeWidth="2.2" strokeLinejoin="round" />
          <path d={path(pedidos)} fill="none" stroke="#6F8F78" strokeWidth="2.2" strokeLinejoin="round" />
          {leads.map((v, i) => (
            <rect key={i} x={x(i) - 3.5} y={y(v) - 3.5} width="7" height="7" fill="#FBF9F6" stroke="#C9A66B" strokeWidth="1.5" />
          ))}
          {serie.map((s, i) => (
            <text key={s.mes} x={x(i)} y={h - 8} textAnchor="middle" fontSize="11" fill="#8A847A">{s.label}</text>
          ))}
        </>
      )}
    </svg>
  );
}

function DonutOrigem({ origens }: { origens: Overview["origens"] }) {
  const total = origens.reduce((s, o) => s + o.n, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const parts = origens.map((o, i) => {
    const pct = total ? o.n / total : 0;
    const dash = pct * c;
    const item = { ...o, dash, offset, color: DONUT_COLORS[i % DONUT_COLORS.length], pct };
    offset += dash;
    return item;
  });
  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="160" viewBox="0 0 160 160" aria-label="Origem dos leads">
        <circle cx="80" cy="80" r={r} fill="none" stroke="#EEEAE2" strokeWidth="14" />
        {total > 0 && parts.map((p) => (
          <circle
            key={p.key}
            cx="80" cy="80" r={r}
            fill="none"
            stroke={p.color}
            strokeWidth="14"
            strokeDasharray={`${p.dash} ${c - p.dash}`}
            strokeDashoffset={-p.offset}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="600" fill="#2A2723">{total}</text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="#8A847A">leads</text>
      </svg>
      <ul className="mt-2 w-full space-y-1.5 text-[12px] text-[#6B6560]">
        {parts.slice(0, 5).map((p) => (
          <li key={p.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="truncate">{p.label}</span>
            </span>
            <span className="tabular-nums text-[#8A847A]">{Math.round(p.pct * 100)}%</span>
          </li>
        ))}
        {total === 0 && <li className="text-[#8A847A]">Sem origem registrada</li>}
      </ul>
    </div>
  );
}

function Gauge({ value, label }: { value: number; label: string }) {
  const r = 42;
  const circ = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * circ;
  const color = value >= 75 ? "#6F8F78" : value >= 50 ? "#C9A66B" : "#B85C4C";
  return (
    <div className="flex flex-col items-center gap-1 min-w-[96px]">
      <svg width="112" height="72" viewBox="0 0 112 72" aria-label={`${label} ${value}%`}>
        <path d="M 14 64 A 42 42 0 0 1 98 64" fill="none" stroke="#EEEAE2" strokeWidth="10" strokeLinecap="round" />
        <path
          d="M 14 64 A 42 42 0 0 1 98 64"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
        <text x="56" y="58" textAnchor="middle" fontSize="18" fontWeight="600" fill="#2A2723">{value}%</text>
      </svg>
      <span className="text-[11px] text-[#8A847A]">{label}</span>
    </div>
  );
}

function BarsProdutos({ itens }: { itens: Overview["topProdutos"] }) {
  const max = Math.max(1, ...itens.map((p) => p.receita));
  if (!itens.length) {
    return <p className="text-[13px] text-[#8A847A] py-10">Nenhum item vendido neste mês.</p>;
  }
  return (
    <div className="flex items-end gap-3 h-44 pt-2">
      {itens.map((p) => (
        <div key={p.id} className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0">
          <span className="text-[10px] font-medium text-[#6B6560] tabular-nums">
            {p.receita >= 1000 ? `${(p.receita / 1000).toFixed(1)}k` : Math.round(p.receita)}
          </span>
          <div
            className="w-full max-w-[36px] rounded-t-2xl bg-[#C9A66B]"
            style={{ height: `${Math.max(8, (p.receita / max) * 100)}%`, opacity: 0.45 + (p.receita / max) * 0.55 }}
            title={`${p.title} · ${moeda(p.receita)}`}
          />
          <span className="text-[10px] text-[#8A847A] text-center leading-tight line-clamp-2 w-full">{p.title}</span>
        </div>
      ))}
    </div>
  );
}

export default function PainelComercialPage() {
  const [modulo, setModulo] = useState<ModuloId>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [periodo, setPeriodo] = useState(ymNow);
  const [data, setData] = useState<Overview | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  const periodos = useMemo(() => {
    const d = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const ym = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}`;
      const label = x.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      return { ym, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }, []);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro("");
    fetch(`/api/admin/comercial/overview?periodo=${periodo}`, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as Overview | null;
        if (!ativo) return;
        if (!res.ok || !json?.ok) {
          setErro(json?.error || "Falha ao carregar o painel.");
          setData(null);
        } else {
          setData(json);
        }
      })
      .catch(() => {
        if (ativo) setErro("Falha ao carregar o painel.");
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => { ativo = false; };
  }, [periodo]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#F6F3EE] text-[#2A2723]">
      {menuOpen && (
        <button className="fixed inset-0 z-30 bg-[#2A2723]/20 md:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`fixed md:static z-40 h-full w-[248px] shrink-0 bg-[#FBF9F6] border-r border-[#E7E1D6] flex flex-col transition-transform ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="px-5 pt-6 pb-4">
          <p className="text-[10px] tracking-[0.22em] uppercase text-[#C9A66B] font-semibold">Masc PRO</p>
          <p className="text-[15px] font-semibold mt-1">Controle comercial</p>
          <p className="text-[11px] text-[#8A847A] mt-0.5">Layout claro · dados reais</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = modulo === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setModulo(item.id); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] mb-0.5 text-left transition-colors ${
                  active ? "bg-[#EDE4D4] text-[#2A2723] font-medium" : "text-[#6B6560] hover:bg-[#F3EEE6]"
                }`}
              >
                <Icon size={16} strokeWidth={1.6} className={active ? "text-[#C9A66B]" : "text-[#A39C90]"} />
                {item.nome}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[#E7E1D6]">
          <Link href="/admin" className="text-[12px] text-[#8A847A] hover:text-[#2A2723]">← Voltar ao admin atual</Link>
        </div>
      </aside>

      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-20 bg-[#F6F3EE]/90 backdrop-blur-sm border-b border-[#E7E1D6]">
          <div className="px-4 md:px-8 py-4 flex flex-wrap items-center gap-3">
            <button className="md:hidden p-2 rounded-xl hover:bg-white" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <Menu size={18} />
            </button>
            <div className="flex-1 min-w-[160px]">
              <h1 className="text-lg md:text-xl font-semibold tracking-tight">
                {NAV.find((n) => n.id === modulo)?.nome}
              </h1>
              <p className="text-[12px] text-[#8A847A]">Semáforo = mês atual contra o mês anterior</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="flex items-center gap-1.5 bg-white border border-[#E7E1D6] rounded-2xl px-3 h-10 text-[12px] text-[#6B6560]">
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="bg-transparent outline-none capitalize max-w-[160px]"
                >
                  {periodos.map((p) => (
                    <option key={p.ym} value={p.ym}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <span className="hidden sm:flex items-center h-10 px-3 rounded-2xl bg-white border border-[#E7E1D6] text-[12px] text-[#8A847A]">
                CRM + pedidos pagos
              </span>
              <button className="w-10 h-10 rounded-2xl bg-white border border-[#E7E1D6] grid place-items-center text-[#8A847A]" aria-label="Alertas">
                <Bell size={16} strokeWidth={1.6} />
              </button>
            </div>
          </div>
        </header>

        <div className="px-4 md:px-8 py-6 max-w-[1400px]">
          {modulo !== "dashboard" ? (
            <Placeholder id={modulo} />
          ) : loading ? (
            <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#C9A66B]" size={28} /></div>
          ) : erro || !data ? (
            <p className="text-[#9A4338] text-sm">{erro || "Sem dados."}</p>
          ) : (
            <Dashboard data={data} />
          )}
        </div>
      </main>
    </div>
  );
}

function Dashboard({ data }: { data: Overview }) {
  const maxFunil = Math.max(1, ...data.funil.map((f) => f.n));
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {data.kpis.map((k) => {
          const t = tone(k.status);
          const sub = k.anterior == null ? "posição atual" : `mês ant. ${fmt(k.anterior, k.formato)}`;
          const d = k.anterior == null ? null : k.value - k.anterior;
          return (
            <div key={k.key} className="bg-white rounded-[22px] border border-[#E7E1D6] p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8A847A]">{k.label}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.bg} ${t.text}`}>{t.label}</span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-[22px] leading-none font-semibold tabular-nums">{fmt(k.value, k.formato)}</p>
                  <p className="text-[11px] text-[#A39C90] mt-1">{sub}</p>
                </div>
                <Sparkline values={k.spark} color={t.bar} />
              </div>
              {d != null && (
                <span className={`flex items-center gap-0.5 text-[11px] ${d >= 0 ? "text-[#4F7A5A]" : "text-[#9A4338]"}`}>
                  {d >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {k.formato === "moeda" ? (d >= 0 ? "+" : "") + moeda(d) : `${d >= 0 ? "+" : ""}${num(Math.round(d))}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <div className="flex items-start justify-between mb-2 gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Leads do CRM e pedidos pagos</h2>
              <p className="text-[12px] text-[#8A847A]">Últimos 6 meses · mesma escala (quantidade)</p>
            </div>
            <div className="flex gap-3 text-[11px] text-[#8A847A] shrink-0">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#C9A66B] inline-block" /> Leads</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#6F8F78] inline-block" /> Pedidos</span>
            </div>
          </div>
          <AreaChart serie={data.serie} />
        </section>

        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Origem dos leads</h2>
          <p className="text-[12px] text-[#8A847A] mb-2">Mês selecionado; se vazio, usa o histórico</p>
          <DonutOrigem origens={data.origens} />
        </section>
      </div>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <h2 className="text-[15px] font-semibold">Taxas do funil MASC</h2>
        <p className="text-[12px] text-[#8A847A] mb-4">
          Contato, proposta e fechamento sobre o pipeline do CRM · recompra = quem já comprou 2+ vezes nos pedidos pagos
        </p>
        <div className="flex flex-wrap justify-between gap-4">
          {data.gauges.map((g) => (
            <Gauge key={g.label} value={g.value} label={g.label} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Faturamento por produto</h2>
          <p className="text-[12px] text-[#8A847A] mb-3">Itens de pedidos pagos no mês · top 7</p>
          <BarsProdutos itens={data.topProdutos} />
        </section>

        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Pipeline do CRM</h2>
          <p className="text-[12px] text-[#8A847A] mb-4">Posição atual das colunas · não é o funil do PDF (ainda sem diagnóstico)</p>
          <div className="space-y-2.5">
            {data.funil.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <span className="w-28 text-[12px] text-[#6B6560] shrink-0">{f.label}</span>
                <div className="flex-1 h-8 rounded-full bg-[#F3EEE6] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#EDE4D4] flex items-center px-3 text-[11px] font-medium text-[#2A2723]"
                    style={{ width: `${Math.max(f.n ? 12 : 0, (f.n / maxFunil) * 100)}%` }}
                  >
                    {f.n}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4">
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5 overflow-x-auto">
          <h2 className="text-[15px] font-semibold mb-1">Comparativo mensal</h2>
          <p className="text-[12px] text-[#8A847A] mb-4">Mesmo recorte do filtro · sem meta inventada do PDF</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">
                <th className="font-medium pb-3">Indicador</th>
                <th className="font-medium pb-3 text-right">Mês</th>
                <th className="font-medium pb-3 text-right">Anterior</th>
                <th className="font-medium pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.scorecard.map((r) => {
                const t = tone(r.status);
                return (
                  <tr key={r.area} className="border-t border-[#F0EBE3]">
                    <td className="py-3">{r.area}</td>
                    <td className="py-3 text-right tabular-nums">{fmt(r.atual, r.formato)}</td>
                    <td className="py-3 text-right tabular-nums text-[#8A847A]">{fmt(r.anterior, r.formato)}</td>
                    <td className="py-3">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${t.bg} ${t.text}`}>{t.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold mb-1">Leitura do período</h2>
          <p className="text-[12px] text-[#8A847A] mb-4">Cinco perguntas do painel, com o que o sistema já mede</p>
          <dl className="space-y-3 text-[13px]">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">De onde vêm os leads</dt>
              <dd className="mt-0.5">{data.leitura.origem}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Qual produto gira</dt>
              <dd className="mt-0.5">{data.leitura.produto}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Onde o funil afunila</dt>
              <dd className="mt-0.5">{data.leitura.gargalo}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Follow-up</dt>
              <dd className="mt-0.5">{data.leitura.followups}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Recompra</dt>
              <dd className="mt-0.5">{data.leitura.recompra}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function Placeholder({ id }: { id: ModuloId }) {
  const nome = NAV.find((n) => n.id === id)?.nome;
  return (
    <div className="bg-white rounded-[22px] border border-[#E7E1D6] p-8 max-w-xl">
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#C9A66B] font-semibold">Só o dashboard está ligado</p>
      <h2 className="text-xl font-semibold mt-2">{nome}</h2>
      <p className="text-[14px] text-[#6B6560] mt-3 leading-relaxed">
        O visual desta aba entra depois. Os números reais já alimentam o dashboard executivo.
      </p>
    </div>
  );
}
