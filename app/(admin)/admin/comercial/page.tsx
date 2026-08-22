"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, Filter, Target, Kanban, ShoppingBag, RefreshCw,
  ChevronDown, Menu, ArrowUpRight, ArrowDownRight, Loader2, Save,
  Sparkles, Users, Camera, Calendar,
} from "lucide-react";
import ComercialHomeCare from "@/componentes/ComercialHomeCare";
import ComercialPipeline from "@/componentes/ComercialPipeline";
import ComercialPedidos from "@/componentes/ComercialPedidos";
import ComercialRede from "@/componentes/ComercialRede";
import ComercialProvas from "@/componentes/ComercialProvas";
import ComercialEventos from "@/componentes/ComercialEventos";

type Aba = "dashboard" | "pipeline" | "pedidos" | "funil" | "homecare" | "embaixadoras" | "distribuidores" | "provas" | "eventos" | "metas";
type Semaforo = "ok" | "atencao" | "risco";
type Formato = "int" | "moeda";

type Kpi = {
  key: string;
  label: string;
  value: number;
  anterior: number | null;
  formato: Formato;
  meta: number | null;
  progresso: number | null;
  nota: number | null;
  status: Semaforo;
  spark: number[];
  referencia: string;
};

type Overview = {
  ok: boolean;
  error?: string;
  periodo: string;
  periodoAnterior: string;
  metas: { leads: number; pedidos: number; receita: number; recompras: number };
  kpis: Kpi[];
  serie: { mes: string; label: string; leads: number; pedidos: number; faturamento: number }[];
  origens: { key: string; label: string; n: number }[];
  gauges: { label: string; value: number; formula?: string }[];
  funil: { key: string; label: string; n: number }[];
  diagnosticos: { problema: string; leitura: string }[];
  topProdutos: { id: string; title: string; qtd: number; receita: number }[];
  porLinha: { key: string; label: string; qtd: number; receita: number }[];
  leadsPorLinha: { key: string; label: string; n: number }[];
  quemConverte: { role: string; label: string; pedidos: number; faturamento: number }[];
  scorecard: {
    area: string; atual: number; anterior: number | null; meta: number | null;
    progresso: number | null; nota: number | null; formato: Formato; status: Semaforo; referencia: string;
  }[];
  definicoes: { termo: string; texto: string }[];
  leitura: {
    origem: string; converte: string; produto: string; linha?: string;
    gargalo: string; followups: string; recompra: string;
  };
};

const ABAS: { id: Aba; nome: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", nome: "Dashboard", icon: LayoutDashboard },
  { id: "pipeline", nome: "Pipeline", icon: Kanban },
  { id: "pedidos", nome: "Pedidos", icon: ShoppingBag },
  { id: "funil", nome: "Funil", icon: Filter },
  { id: "homecare", nome: "Home care", icon: RefreshCw },
  { id: "embaixadoras", nome: "Embaixadoras", icon: Sparkles },
  { id: "distribuidores", nome: "Distribuidores", icon: Users },
  { id: "provas", nome: "Provas", icon: Camera },
  { id: "eventos", nome: "Eventos", icon: Calendar },
  { id: "metas", nome: "Metas do ciclo", icon: Target },
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
  if (s === "ok") return { text: "text-[#4F7A5A]", bg: "bg-[#E7F0EA]", bar: "#6F8F78", label: "No alvo" };
  if (s === "atencao") return { text: "text-[#8A6A32]", bg: "bg-[#F5EDDF]", bar: "#C9A66B", label: "Atenção" };
  return { text: "text-[#9A4338]", bg: "bg-[#F6E6E2]", bar: "#B85C4C", label: "Abaixo" };
}
function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (!values.length || values.every((v) => v === 0)) return <div className="w-[88px] h-8" />;
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
            cx="80" cy="80" r={r} fill="none" stroke={p.color} strokeWidth="14"
            strokeDasharray={`${p.dash} ${c - p.dash}`}
            strokeDashoffset={-p.offset}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="600" fill="#2A2723">{total}</text>
        <text x="80" y="96" textAnchor="middle" fontSize="11" fill="#8A847A">leads no mês</text>
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
        {total === 0 && <li className="text-[#8A847A]">Nenhum lead neste mês</li>}
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
          fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
        />
        <text x="56" y="58" textAnchor="middle" fontSize="18" fontWeight="600" fill="#2A2723">{value}%</text>
      </svg>
      <span className="text-[11px] text-[#8A847A]">{label}</span>
    </div>
  );
}

function BarsReceita({
  itens,
}: {
  itens: { key?: string; id?: string; title?: string; label?: string; qtd?: number; receita: number }[];
}) {
  const max = Math.max(1, ...itens.map((p) => p.receita));
  if (!itens.length || itens.every((p) => p.receita <= 0)) {
    return <p className="text-[13px] text-[#8A847A] py-10">Nenhum item classificado neste mês.</p>;
  }
  return (
    <div className="flex items-end gap-3 h-44 pt-2">
      {itens.map((p) => {
        const nome = p.title || p.label || "—";
        return (
          <div key={p.id || p.key || nome} className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0">
            <span className="text-[10px] font-medium text-[#6B6560] tabular-nums">
              {p.receita >= 1000 ? `${(p.receita / 1000).toFixed(1)}k` : Math.round(p.receita)}
            </span>
            <div
              className="w-full max-w-[36px] rounded-t-2xl bg-[#C9A66B]"
              style={{ height: `${Math.max(8, (p.receita / max) * 100)}%`, opacity: 0.45 + (p.receita / max) * 0.55 }}
              title={`${nome} · ${moeda(p.receita)}`}
            />
            <span className="text-[10px] text-[#8A847A] text-center leading-tight line-clamp-2 w-full">{nome}</span>
          </div>
        );
      })}
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
  const [aba, setAba] = useState<Aba>("dashboard");
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

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`/api/admin/comercial/overview?periodo=${periodo}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Overview | null;
      if (!res.ok || !json?.ok) {
        setErro(json?.error || "Falha ao carregar o painel.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setErro("Falha ao carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-[#F6F3EE] text-[#2A2723]">
      {menuOpen && (
        <button className="fixed inset-0 z-30 bg-[#2A2723]/20 md:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />
      )}

      <aside className={`fixed md:static z-40 h-full w-[248px] shrink-0 bg-[#FBF9F6] border-r border-[#E7E1D6] flex flex-col transition-transform ${menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="px-5 pt-6 pb-4">
          <p className="text-[10px] tracking-[0.22em] uppercase text-[#C9A66B] font-semibold">Masc PRO · Fase 5</p>
          <p className="text-[15px] font-semibold mt-1">Controle comercial</p>
          <p className="text-[11px] text-[#8A847A] mt-0.5">Prova · evento · calendário intacto</p>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#A39C90] px-3 mb-2">Este painel</p>
          {ABAS.map((item) => {
            const Icon = item.icon;
            const active = aba === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setAba(item.id); setMenuOpen(false); }}
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
          <Link href="/admin" className="text-[12px] text-[#8A847A] hover:text-[#2A2723]">← Admin operacional</Link>
        </div>
      </aside>

      <main className={`flex-1 min-h-0 min-w-0 flex flex-col ${aba === "pipeline" ? "overflow-hidden" : "overflow-y-auto"}`}>
        <header className="sticky top-0 z-20 bg-[#F6F3EE]/90 backdrop-blur-sm border-b border-[#E7E1D6] shrink-0">
          <div className="px-4 md:px-8 py-4 flex flex-wrap items-center gap-3">
            <button className="md:hidden p-2 rounded-xl hover:bg-white" onClick={() => setMenuOpen(true)} aria-label="Menu">
              <Menu size={18} />
            </button>
            <div className="flex-1 min-w-[160px]">
              <h1 className="text-lg md:text-xl font-semibold tracking-tight">
                {ABAS.find((n) => n.id === aba)?.nome}
              </h1>
              <p className="text-[12px] text-[#8A847A]">
                {aba === "homecare"
                  ? "Kit é marca manual. Régua 7/15/30 · recompra 30/45/60"
                  : aba === "pipeline"
                    ? "Mesmos leads do CRM · visual deste painel"
                    : aba === "pedidos"
                      ? "Mesmos pedidos da loja · visual deste painel"
                      : aba === "embaixadoras"
                        ? "Score 0–100 do mês · nível da jornada só se lê"
                        : aba === "distribuidores"
                          ? "Venda, equipe e visita derivados · salão e exclusividade à mão"
                          : aba === "provas"
                            ? "Linha, cidade, protocolo e autorização. Post não entra sozinho"
                            : aba === "eventos"
                              ? "Resultado comercial · flyer e data ficam no calendário"
                              : "Pedido fechado = pago, separação, despachado ou entregue"}
              </p>
            </div>
            {aba !== "pipeline" && (
              <label className="flex items-center gap-1.5 bg-white border border-[#E7E1D6] rounded-2xl px-3 h-10 text-[12px] text-[#6B6560]">
                <select
                  value={periodo}
                  onChange={(e) => setPeriodo(e.target.value)}
                  className="bg-transparent outline-none capitalize max-w-[180px]"
                >
                  {periodos.map((p) => (
                    <option key={p.ym} value={p.ym}>{p.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
            )}
          </div>
        </header>

        <div className={aba === "pipeline" ? "flex-1 min-h-0 px-4 md:px-8 py-4" : "px-4 md:px-8 py-6 max-w-[1400px]"}>
          {aba === "pipeline" ? (
            <ComercialPipeline />
          ) : aba === "pedidos" ? (
            <ComercialPedidos periodo={periodo} />
          ) : aba === "homecare" ? (
            <ComercialHomeCare periodo={periodo} />
          ) : aba === "embaixadoras" ? (
            <ComercialRede periodo={periodo} papel="embaixadora" />
          ) : aba === "distribuidores" ? (
            <ComercialRede periodo={periodo} papel="distribuidor" />
          ) : aba === "provas" ? (
            <ComercialProvas periodo={periodo} />
          ) : aba === "eventos" ? (
            <ComercialEventos periodo={periodo} />
          ) : loading ? (
            <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#C9A66B]" size={28} /></div>
          ) : erro || !data ? (
            <p className="text-[#9A4338] text-sm">{erro || "Sem dados."}</p>
          ) : aba === "funil" ? (
            <FunilView data={data} />
          ) : aba === "metas" ? (
            <MetasView data={data} periodo={periodo} onSaved={carregar} />
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
          const sub = k.meta
            ? `meta ${fmt(k.meta, k.formato)}${k.progresso != null ? ` · ${k.progresso}%` : ""}`
            : k.anterior != null
              ? `mês ant. ${fmt(k.anterior, k.formato)}`
              : "posição atual";
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
              {k.meta ? (
                <div className="h-1.5 rounded-full bg-[#EEEAE2] overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, k.progresso || 0)}%`, background: t.bar }} />
                </div>
              ) : d != null ? (
                <span className={`flex items-center gap-0.5 text-[11px] ${d >= 0 ? "text-[#4F7A5A]" : "text-[#9A4338]"}`}>
                  {d >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {k.formato === "moeda" ? `${d >= 0 ? "+" : ""}${moeda(d)}` : `${d >= 0 ? "+" : ""}${num(Math.round(d))}`}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <div className="flex items-start justify-between mb-2 gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Leads do CRM e pedidos pagos</h2>
              <p className="text-[12px] text-[#8A847A]">Últimos 6 meses · quantidade</p>
            </div>
            <div className="flex gap-3 text-[11px] text-[#8A847A] shrink-0">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#C9A66B] inline-block" /> Leads</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#6F8F78] inline-block" /> Pedidos</span>
            </div>
          </div>
          <AreaChart serie={data.serie} />
        </section>
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">De onde vêm os leads</h2>
          <p className="text-[12px] text-[#8A847A] mb-2">Somente leads criados no mês</p>
          <DonutOrigem origens={data.origens} />
        </section>
      </div>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <h2 className="text-[15px] font-semibold">Taxas do funil</h2>
        <p className="text-[12px] text-[#8A847A] mb-4">Pipeline atual do CRM · recompra nos pedidos pagos</p>
        <div className="flex flex-wrap justify-between gap-4">
          {data.gauges.map((g) => (
            <Gauge key={g.label} value={g.value} label={g.label} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Receita por linha</h2>
          <p className="text-[12px] text-[#8A847A] mb-3">Pedidos pagos do mês · products.linha</p>
          <BarsReceita itens={data.porLinha || []} />
        </section>
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Qual produto gira</h2>
          <p className="text-[12px] text-[#8A847A] mb-3">Itens de pedidos pagos no mês · top 7</p>
          <BarsProdutos itens={data.topProdutos} />
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Leads por linha de interesse</h2>
          <p className="text-[12px] text-[#8A847A] mb-3">Leads criados no mês · campo do CRM</p>
          {(data.leadsPorLinha || []).every((l) => l.n === 0) ? (
            <p className="text-[13px] text-[#8A847A] py-8">Nenhum lead do mês com linha preenchida.</p>
          ) : (
            <div className="space-y-2.5">
              {(data.leadsPorLinha || []).map((l) => {
                const maxL = Math.max(1, ...(data.leadsPorLinha || []).map((x) => x.n));
                return (
                  <div key={l.key} className="flex items-center gap-3">
                    <span className="w-24 text-[12px] text-[#6B6560] shrink-0">{l.label}</span>
                    <div className="flex-1 h-8 rounded-full bg-[#F3EEE6] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#EDE4D4] flex items-center px-3 text-[11px] font-medium"
                        style={{ width: `${Math.max(l.n ? 12 : 0, (l.n / maxL) * 100)}%` }}
                      >
                        {l.n}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Pipeline agora</h2>
          <p className="text-[12px] text-[#8A847A] mb-4">Estoque de leads por coluna · não é coorte</p>
          <div className="space-y-2.5">
            {data.funil.map((f) => (
              <div key={f.key} className="flex items-center gap-3">
                <span className="w-28 text-[12px] text-[#6B6560] shrink-0">{f.label}</span>
                <div className="flex-1 h-8 rounded-full bg-[#F3EEE6] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#EDE4D4] flex items-center px-3 text-[11px] font-medium"
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
          <h2 className="text-[15px] font-semibold mb-1">Scorecard</h2>
          <p className="text-[12px] text-[#8A847A] mb-4">Nota 0 / 5 / 8 / 10 quando há meta · senão compara o mês anterior</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">
                <th className="font-medium pb-3">Indicador</th>
                <th className="font-medium pb-3 text-right">Realizado</th>
                <th className="font-medium pb-3 text-right">Meta / ant.</th>
                <th className="font-medium pb-3 text-right">Nota</th>
                <th className="font-medium pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.scorecard.map((r) => {
                const t = tone(r.status);
                const base = r.meta != null ? r.meta : r.anterior;
                return (
                  <tr key={r.area} className="border-t border-[#F0EBE3]">
                    <td className="py-3">{r.area}</td>
                    <td className="py-3 text-right tabular-nums">{fmt(r.atual, r.formato)}</td>
                    <td className="py-3 text-right tabular-nums text-[#8A847A]">{base != null ? fmt(base, r.formato) : "—"}</td>
                    <td className="py-3 text-right tabular-nums">{r.nota ?? "—"}</td>
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
          <h2 className="text-[15px] font-semibold mb-1">Perguntas do dia</h2>
          <p className="text-[12px] text-[#8A847A] mb-4">Só o que o sistema já mede</p>
          <dl className="space-y-3 text-[13px]">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">De onde vêm os leads</dt>
              <dd className="mt-0.5">{data.leitura.origem}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Quem está convertendo</dt>
              <dd className="mt-0.5">{data.leitura.converte}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Qual produto está girando</dt>
              <dd className="mt-0.5">{data.leitura.produto}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Qual linha está girando</dt>
              <dd className="mt-0.5">{data.leitura.linha || "Classifique products.linha para ler este gráfico"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Onde a venda trava</dt>
              <dd className="mt-0.5">{data.leitura.gargalo}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">Follow-up e recompra</dt>
              <dd className="mt-0.5">{data.leitura.followups}. {data.leitura.recompra}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function FunilView({ data }: { data: Overview }) {
  const maxFunil = Math.max(1, ...data.funil.map((f) => f.n));
  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <h2 className="text-[15px] font-semibold">Colunas do CRM</h2>
        <p className="text-[12px] text-[#8A847A] mb-4">
          Foto do pipeline agora. Qualificado, diagnóstico, reativar e não qualificado entram na fase 2.
        </p>
        <div className="space-y-2.5">
          {data.funil.map((f) => (
            <div key={f.key} className="flex items-center gap-3">
              <span className="w-32 text-[13px] text-[#6B6560] shrink-0">{f.label}</span>
              <div className="flex-1 h-9 rounded-full bg-[#F3EEE6] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#EDE4D4] flex items-center px-3 text-[12px] font-medium"
                  style={{ width: `${Math.max(f.n ? 10 : 0, (f.n / maxFunil) * 100)}%` }}
                >
                  {f.n}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {(data.porLinha || []).some((l) => l.receita > 0) && (
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Receita por linha</h2>
          <p className="text-[12px] text-[#8A847A] mb-3">Mesmo recorte do dashboard · products.linha</p>
          <BarsReceita itens={data.porLinha || []} />
        </section>
      )}

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <h2 className="text-[15px] font-semibold">Taxas possíveis hoje</h2>
        <div className="flex flex-wrap justify-between gap-4 mt-4">
          {data.gauges.map((g) => (
            <div key={g.label} className="flex flex-col items-center max-w-[140px]">
              <Gauge value={g.value} label={g.label} />
              {g.formula && <p className="text-[10px] text-[#A39C90] text-center mt-1 leading-snug">{g.formula}</p>}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <h2 className="text-[15px] font-semibold mb-3">Diagnóstico rápido</h2>
        <div className="space-y-3">
          {data.diagnosticos.map((d) => (
            <div key={d.problema} className="border border-[#E7E1D6] rounded-2xl p-4">
              <p className="text-[13px] font-semibold">{d.problema}</p>
              <p className="text-[13px] text-[#6B6560] mt-1">{d.leitura}</p>
            </div>
          ))}
        </div>
      </section>

      {data.quemConverte.length > 0 && (
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5 overflow-x-auto">
          <h2 className="text-[15px] font-semibold mb-1">Quem está convertendo</h2>
          <p className="text-[12px] text-[#8A847A] mb-4">Papel de quem comprou no mês (pedido pago)</p>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">
                <th className="font-medium pb-3">Perfil</th>
                <th className="font-medium pb-3 text-right">Pedidos</th>
                <th className="font-medium pb-3 text-right">Faturamento</th>
              </tr>
            </thead>
            <tbody>
              {data.quemConverte.map((q) => (
                <tr key={q.role} className="border-t border-[#F0EBE3]">
                  <td className="py-3">{q.label}</td>
                  <td className="py-3 text-right tabular-nums">{q.pedidos}</td>
                  <td className="py-3 text-right tabular-nums">{moeda(q.faturamento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function MetasView({
  data, periodo, onSaved,
}: {
  data: Overview;
  periodo: string;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    leads: String(data.metas.leads || ""),
    pedidos: String(data.metas.pedidos || ""),
    receita: String(data.metas.receita || ""),
    recompras: String(data.metas.recompras || ""),
  });
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  async function salvar() {
    setSalvando(true);
    setMsg("");
    const res = await fetch("/api/admin/comercial/overview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodo,
        metas: {
          leads: Number(form.leads) || 0,
          pedidos: Number(form.pedidos) || 0,
          receita: Number(form.receita) || 0,
          recompras: Number(form.recompras) || 0,
        },
      }),
    });
    const json = await res.json().catch(() => null);
    setSalvando(false);
    if (!res.ok || !json?.ok) {
      setMsg(json?.error || "Não foi possível salvar.");
      return;
    }
    setMsg("Metas do ciclo salvas. O semáforo passa a usar estes números.");
    onSaved();
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <h2 className="text-[15px] font-semibold">Meta mensal da operação</h2>
        <p className="text-[12px] text-[#8A847A] mt-1 mb-5">
          Grava em configuração do sistema, por mês. Zero = semáforo compara com o mês anterior. Não altera pedido, lead nem estoque.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            ["leads", "Leads no mês"],
            ["pedidos", "Pedidos pagos"],
            ["receita", "Faturamento (R$)"],
            ["recompras", "Recompras"],
          ].map(([key, label]) => (
            <label key={key} className="text-[12px] text-[#6B6560]">
              {label}
              <input
                type="number"
                min={0}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full h-11 px-3 rounded-2xl border border-[#E7E1D6] bg-[#FBF9F6] text-[14px] text-[#2A2723] outline-none focus:border-[#C9A66B]"
              />
            </label>
          ))}
        </div>
        <button
          onClick={salvar}
          disabled={salvando}
          className="mt-5 inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-[#2A2723] text-white text-[13px] disabled:opacity-50"
        >
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Salvar metas deste mês
        </button>
        {msg && <p className="text-[13px] text-[#4F7A5A] mt-3">{msg}</p>}
      </section>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <h2 className="text-[15px] font-semibold mb-3">Como o número é lido</h2>
        <dl className="space-y-3">
          {data.definicoes.map((d) => (
            <div key={d.termo}>
              <dt className="text-[13px] font-semibold">{d.termo}</dt>
              <dd className="text-[13px] text-[#6B6560] mt-0.5">{d.texto}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
