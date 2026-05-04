"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Target, Loader2, Save, CheckCircle, AlertCircle } from "lucide-react";

type MetaData = {
  periodo: string; distribuidor_id: string;
  meta: { meta_leads: number; meta_conversoes: number; meta_receita: number };
  realizado: { leads: number; conversoes: number; receita: number };
  progresso: { leads: number; conversoes: number; receita: number };
};

function moeda(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

function BarraMeta({ label, realizado, meta, pct, cor }: {
  label: string; realizado: string | number; meta: string | number; pct: number; cor: string;
}) {
  const p = Math.min(pct, 100);
  return (
    <div className="bg-zinc-900 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">{label}</p>
        <span className={`text-lg font-black ${p >= 100 ? "text-green-400" : p >= 70 ? "text-yellow-400" : "text-red-400"}`}>{p}%</span>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-3 mb-3">
        <div className={`h-3 rounded-full transition-all ${cor}`} style={{ width: `${p}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>Realizado: <span className="text-zinc-300 font-bold">{realizado}</span></span>
        <span>Meta: <span className="text-zinc-300 font-bold">{meta}</span></span>
      </div>
    </div>
  );
}

export default function MetasPage() {
  const hoje = new Date().toISOString().slice(0, 7);
  const [periodo, setPeriodo] = useState(hoje);
  const [data, setData] = useState<MetaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ meta_leads: "", meta_conversoes: "", meta_receita: "" });
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);

  async function carregar() {
    setLoading(true);
    const res = await fetch(`/api/admin/crm/metas?periodo=${periodo}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (d?.ok) {
      setData(d);
      setForm({
        meta_leads:      String(d.meta.meta_leads || ""),
        meta_conversoes: String(d.meta.meta_conversoes || ""),
        meta_receita:    String(d.meta.meta_receita || ""),
      });
    }
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [periodo]);

  async function salvar() {
    setSalvando(true); setFeedback(null);
    const res = await fetch("/api/admin/crm/metas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        periodo,
        meta_leads:      Number(form.meta_leads || 0),
        meta_conversoes: Number(form.meta_conversoes || 0),
        meta_receita:    Number(String(form.meta_receita).replace(",", ".") || 0),
      }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) { setFeedback({ tipo: "ok", msg: "Meta salva com sucesso!" }); await carregar(); }
    else setFeedback({ tipo: "erro", msg: d?.error || "Erro ao salvar." });
    setSalvando(false);
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Target className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black italic uppercase">Metas <span className="text-[#C9A66B]">& Targets</span></h1>
              <p className="text-zinc-500 text-xs">Acompanhe o progresso em relação às metas do período</p>
            </div>
          </div>
          <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]" />
        </div>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progresso */}
            <div className="flex flex-col gap-4">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Progresso</p>
              {data && (
                <>
                  <BarraMeta
                    label="Leads captados"
                    realizado={data.realizado.leads}
                    meta={data.meta.meta_leads || "—"}
                    pct={data.progresso.leads}
                    cor="bg-blue-500"
                  />
                  <BarraMeta
                    label="Conversões (fechados)"
                    realizado={data.realizado.conversoes}
                    meta={data.meta.meta_conversoes || "—"}
                    pct={data.progresso.conversoes}
                    cor="bg-green-500"
                  />
                  <BarraMeta
                    label="Receita da rede"
                    realizado={moeda(data.realizado.receita)}
                    meta={data.meta.meta_receita ? moeda(data.meta.meta_receita) : "—"}
                    pct={data.progresso.receita}
                    cor="bg-[#C9A66B]"
                  />
                </>
              )}
            </div>

            {/* Definir metas */}
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-5">Definir Metas</p>
              {feedback && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold mb-4 ${feedback.tipo === "ok" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
                  {feedback.tipo === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />} {feedback.msg}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Meta de Leads</label>
                  <input value={form.meta_leads} onChange={e => setForm(f => ({ ...f, meta_leads: e.target.value }))} type="number" min="0" className={inputClass} placeholder="ex: 50" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Meta de Conversões</label>
                  <input value={form.meta_conversoes} onChange={e => setForm(f => ({ ...f, meta_conversoes: e.target.value }))} type="number" min="0" className={inputClass} placeholder="ex: 10" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Meta de Receita (R$)</label>
                  <input value={form.meta_receita} onChange={e => setForm(f => ({ ...f, meta_receita: e.target.value }))} type="number" min="0" step="0.01" className={inputClass} placeholder="ex: 50000" />
                </div>
                <button onClick={salvar} disabled={salvando}
                  className="w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-50 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2">
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {salvando ? "Salvando..." : "Salvar Metas"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
