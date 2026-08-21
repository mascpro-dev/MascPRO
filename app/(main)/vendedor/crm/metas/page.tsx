"use client";
import { useEffect, useState } from "react";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import { Loader2, Target } from "lucide-react";

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Barra({ label, realizado, meta, pct }: { label: string; realizado: string | number; meta: string | number; pct: number }) {
  const p = Math.min(pct, 100);
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
      <div className="flex justify-between mb-2">
        <span className="text-[10px] font-black uppercase text-zinc-500">{label}</span>
        <span className={`text-sm font-black ${p >= 100 ? "text-green-400" : p >= 70 ? "text-yellow-400" : "text-zinc-400"}`}>{p}%</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
        <div className="h-full bg-[#C9A66B] rounded-full transition-all" style={{ width: `${p}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-zinc-600">
        <span>Realizado: <strong className="text-zinc-300">{realizado}</strong></span>
        <span>Meta: <strong className="text-zinc-300">{meta}</strong></span>
      </div>
    </div>
  );
}

export default function VendedorMetasPage() {
  const [periodo, setPeriodo] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch(`/api/vendedor/crm/metas?periodo=${periodo}`, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) setErro(d?.error || "Falha ao carregar metas.");
      else setData(d);
      setLoading(false);
    }
    void load();
  }, [periodo]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
      </div>
    );
  }

  if (erro || !data) {
    return <ErroComVoltar mensagem={erro} onVoltar={() => window.history.back()} rotuloVoltar="Dashboard" />;
  }

  const temMeta =
    data.meta.meta_leads > 0 ||
    data.meta.meta_visitas > 0 ||
    data.meta.meta_conversoes > 0 ||
    data.meta.meta_receita > 0;

  return (
    <div className="space-y-6 pb-12 max-w-2xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target className="text-[#C9A66B]" size={24} />
          <div>
            <h1 className="text-2xl font-black text-white">Minhas metas</h1>
            <p className="text-xs text-zinc-500">Definidas pelo seu distribuidor</p>
          </div>
        </div>
        <input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white"
        />
      </div>

      {!temMeta ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 text-center text-zinc-500 text-sm">
          Seu distribuidor ainda não definiu metas para este período.
        </div>
      ) : (
        <div className="grid gap-4">
          <Barra label="Leads" realizado={data.realizado.leads} meta={data.meta.meta_leads} pct={data.progresso.leads} />
          <Barra label="Visitas em campo" realizado={data.realizado.visitas} meta={data.meta.meta_visitas} pct={data.progresso.visitas} />
          <Barra label="Conversões" realizado={data.realizado.conversoes} meta={data.meta.meta_conversoes} pct={data.progresso.conversoes} />
          <Barra label="Receita" realizado={moeda(data.realizado.receita)} meta={moeda(data.meta.meta_receita)} pct={data.progresso.receita} />
        </div>
      )}

      <p className="text-[10px] text-zinc-600">
        Vendas consignadas não entram na meta de receita. Pedidos aguardando aprovação também não contam até serem aprovados.
      </p>
    </div>
  );
}
