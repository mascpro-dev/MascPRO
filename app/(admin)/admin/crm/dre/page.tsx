"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminSidebar from "@/componentes/AdminSidebar";
import { FileBarChart, Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Minus } from "lucide-react";

type DRE = {
  receita_bruta: number; receita_frete: number; receita_sem_frete: number;
  devolucoes: number; receita_liquida: number;
  cmv: number; lucro_bruto: number; margem_bruta: number;
  comissoes: number; saques: number; despesas_operacionais: number;
  ebitda: number; margem_ebitda: number;
  total_pedidos: number; ticket_medio: number;
};

function moeda(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function pct(v: number) { return `${v}%`; }

function Linha({
  label, valor, destaque = false, negativo = false, sub = false, separador = false, pctVal,
}: {
  label: string; valor: number; destaque?: boolean; negativo?: boolean;
  sub?: boolean; separador?: boolean; pctVal?: number;
}) {
  if (separador) return <div className="border-t border-zinc-800 my-2" />;
  const cor = negativo ? "text-red-400" : destaque ? "text-white" : "text-zinc-300";
  return (
    <div className={`flex items-center justify-between py-2 ${sub ? "pl-4" : ""} ${destaque ? "border-t border-zinc-700 mt-1 pt-3" : ""}`}>
      <span className={`text-sm ${sub ? "text-zinc-500" : "text-zinc-400"} ${destaque ? "font-black text-white uppercase tracking-wide" : ""}`}>{label}</span>
      <div className="flex items-center gap-4">
        {pctVal !== undefined && (
          <span className={`text-xs font-bold ${pctVal >= 30 ? "text-green-400" : pctVal >= 15 ? "text-yellow-400" : "text-red-400"}`}>
            {pct(pctVal)}
          </span>
        )}
        <span className={`text-sm font-black tabular-nums ${cor}`}>
          {negativo && valor > 0 ? `- ${moeda(valor)}` : moeda(valor)}
        </span>
      </div>
    </div>
  );
}

export default function DrePage() {
  const hoje = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(hoje);
  const [dre, setDre] = useState<DRE | null>(null);
  const [historico, setHistorico] = useState<{ mes: string; receita: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  async function carregar() {
    setLoading(true); setErro("");
    const res = await fetch(`/api/admin/crm/dre?mes=${mes}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) { setErro(d?.error || "Falha."); setLoading(false); return; }
    setDre(d.dre);
    setHistorico(d.historico || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [mes]);

  const maxHist = Math.max(...historico.map(h => h.receita), 1);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileBarChart className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black italic uppercase">DRE <span className="text-[#C9A66B]">Resultado</span></h1>
              <p className="text-zinc-500 text-xs">Demonstração de Resultado do Exercício</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]" />
            <button onClick={carregar} disabled={loading}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 disabled:opacity-40">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Atualizar
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : erro ? (
          <div className="text-center mt-20"><AlertCircle className="text-red-400 mx-auto mb-3" size={32} /><p className="text-red-400">{erro}</p></div>
        ) : dre && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DRE Principal */}
            <div className="lg:col-span-2 bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-4">
                DRE — {new Date(`${mes}-01`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
              </p>

              <Linha label="(+) Receita Bruta" valor={dre.receita_bruta} destaque />
              <Linha label="  Receita s/ Frete" valor={dre.receita_sem_frete} sub />
              <Linha label="  Frete cobrado" valor={dre.receita_frete} sub />
              <Linha label="(-) Devoluções" valor={dre.devolucoes} negativo sub />
              <Linha label="(=) Receita Líquida" valor={dre.receita_liquida} destaque separador />

              <Linha label="(-) CMV — Custo da Mercadoria" valor={dre.cmv} negativo />
              <Linha label="(=) Lucro Bruto" valor={dre.lucro_bruto} destaque pctVal={dre.margem_bruta} separador />

              <Linha label="(-) Comissões pagas" valor={dre.comissoes} negativo sub />
              <Linha label="(-) Saques pagos" valor={dre.saques} negativo sub />
              <Linha label="(-) Total Despesas Oper." valor={dre.despesas_operacionais} negativo />
              <Linha label="(=) EBITDA" valor={dre.ebitda} destaque pctVal={dre.margem_ebitda} separador />

              <div className="mt-6 pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Pedidos</p>
                  <p className="text-xl font-black text-white">{dre.total_pedidos}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-xl p-3">
                  <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Ticket Médio</p>
                  <p className="text-xl font-black text-[#C9A66B]">{moeda(dre.ticket_medio)}</p>
                </div>
              </div>
            </div>

            {/* Tendência 6 meses */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-5">Receita — 6 Meses</p>
              <div className="flex items-end gap-2 h-32">
                {historico.map((h, i) => {
                  const pct = maxHist > 0 ? Math.max(4, Math.round((h.receita / maxHist) * 100)) : 4;
                  const isAtual = h.mes === mes;
                  return (
                    <div key={h.mes} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                        <div className={`w-full rounded-t-lg ${isAtual ? "bg-[#C9A66B]" : "bg-zinc-700"}`}
                          style={{ height: `${pct}%` }} />
                      </div>
                      <p className={`text-[8px] font-bold ${isAtual ? "text-[#C9A66B]" : "text-zinc-600"}`}>
                        {h.mes.slice(5)}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 space-y-2">
                {historico.slice().reverse().slice(0, 3).map(h => (
                  <div key={h.mes} className="flex justify-between text-xs">
                    <span className="text-zinc-500">{new Date(`${h.mes}-01`).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })}</span>
                    <span className="font-black text-zinc-300">{moeda(h.receita)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
