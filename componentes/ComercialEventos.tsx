"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";

type Evento = {
  id: string;
  titulo: string;
  flyer_url: string | null;
  local: string | null;
  cidade: string | null;
  estado: string | null;
  organizador: string | null;
  valor: number | null;
  data_hora: string;
  ativo: boolean;
  passou: boolean;
  vazamento: boolean;
  no_mes: boolean;
  provas: number;
  leads_vinculados: number;
  resultado: {
    leads_gerados: number;
    pedidos: number;
    receita: number;
    custo: number;
    followup_ok: boolean;
    followup_em: string | null;
    notas: string | null;
    roi: number | null;
  };
};

type Payload = {
  ok: boolean;
  error?: string;
  aviso?: string | null;
  periodo: string;
  kpis: {
    eventosMes: number;
    vazamentos: number;
    leads: number;
    receita: number;
    custo: number;
    provas: number;
    roiMedio: number | null;
  };
  eventos: Evento[];
  definicoes: { termo: string; texto: string }[];
};

type Filtro = "mes" | "vazamento" | "todos";

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function dataHoraBr(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ComercialEventos({ periodo }: { periodo: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("mes");
  const [aberto, setAberto] = useState<Evento | null>(null);
  const [form, setForm] = useState<Evento["resultado"] | null>(null);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`/api/admin/comercial/eventos?periodo=${periodo}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Payload | null;
      if (!res.ok || !json?.ok) {
        setErro(json?.error || "Falha ao carregar os eventos.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setErro("Falha ao carregar os eventos.");
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { void carregar(); }, [carregar]);

  const lista = useMemo(() => {
    const ev = data?.eventos || [];
    if (filtro === "mes") return ev.filter((e) => e.no_mes);
    if (filtro === "vazamento") return ev.filter((e) => e.vazamento);
    return ev;
  }, [data, filtro]);

  function abrir(e: Evento) {
    setAberto(e);
    setForm({ ...e.resultado });
    setErro("");
  }

  async function salvar() {
    if (!aberto || !form) return;
    setSaving(true);
    const res = await fetch("/api/admin/comercial/eventos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: aberto.id, ...form }),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok || !json?.ok) {
      setErro(json?.error || "Não foi possível gravar o resultado.");
      return;
    }
    setAberto(null);
    await carregar();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
      </div>
    );
  }

  if (erro && !data) return <p className="text-[#9A4338] text-sm">{erro}</p>;
  if (!data) return <p className="text-[#8A847A] text-sm">Sem dados.</p>;

  return (
    <div className="flex flex-col gap-6">
      {data.aviso && (
        <p className="text-[13px] text-[#8A6A32] bg-[#F5EDDF] border border-[#E7E1D6] rounded-2xl px-4 py-3">{data.aviso}</p>
      )}
      {erro && data && <p className="text-[13px] text-[#9A4338]">{erro}</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi label="Eventos no mês" value={String(data.kpis.eventosMes)} sub="mesmo calendário do operacional" />
        <Kpi label="Sem follow-up" value={String(data.kpis.vazamentos)} sub="já ocorreram · vazamento" alerta={data.kpis.vazamentos > 0} />
        <Kpi label="Leads lançados" value={String(data.kpis.leads)} sub={`${data.kpis.provas} prova(s) ligadas`} />
        <Kpi
          label="ROI do mês"
          value={data.kpis.roiMedio == null ? "—" : `${data.kpis.roiMedio}x`}
          sub={`${moeda(data.kpis.receita)} ÷ ${moeda(data.kpis.custo)}`}
        />
      </div>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[#6B6560]">
          Flyer, data e cidade continuam em <Link href="/admin/eventos" className="underline underline-offset-2">/admin/eventos</Link>. Aqui só o resultado comercial.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["mes", `Neste mês (${data.kpis.eventosMes})`],
            ["vazamento", `Sem follow-up (${data.kpis.vazamentos})`],
            ["todos", `Todos (${data.eventos.length})`],
          ] as const
        ).map(([id, nome]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFiltro(id)}
            className={`h-9 px-3 rounded-full text-[12px] border ${
              filtro === id ? "bg-[#EDE4D4] border-[#E7E1D6] text-[#2A2723]" : "bg-white border-[#E7E1D6] text-[#6B6560]"
            }`}
          >
            {nome}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {lista.length === 0 ? (
          <p className="text-[13px] text-[#8A847A] py-8">Nenhum evento neste recorte.</p>
        ) : (
          lista.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => abrir(e)}
              className="w-full text-left bg-white rounded-[22px] border border-[#E7E1D6] p-4 flex flex-wrap items-center gap-4 hover:border-[#D8CFC0]"
            >
              {e.flyer_url ? (
                <img src={e.flyer_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
              ) : (
                <span className="w-14 h-14 rounded-2xl bg-[#EDE4D4]" />
              )}
              <div className="flex-1 min-w-[180px]">
                <p className="text-[14px] font-medium">{e.titulo}</p>
                <p className="text-[12px] text-[#8A847A]">
                  {dataHoraBr(e.data_hora)}
                  {e.cidade ? ` · ${e.cidade}` : ""}
                  {e.organizador ? ` · ${e.organizador}` : ""}
                </p>
              </div>
              <div className="text-right text-[12px] text-[#6B6560] min-w-[110px]">
                <p className="tabular-nums text-[#2A2723] font-medium">{e.resultado.leads_gerados} lead(s)</p>
                <p>{e.resultado.receita ? moeda(e.resultado.receita) : "sem receita"}</p>
                <p className="text-[11px] text-[#A39C90]">{e.provas} prova(s)</p>
              </div>
              {e.vazamento ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F6E6E2] text-[#9A4338]">Sem follow-up</span>
              ) : e.resultado.followup_ok ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E7F0EA] text-[#4F7A5A]">Follow-up ok</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F3EEE6] text-[#8A847A]">{e.passou ? "Passou" : "Agenda"}</span>
              )}
            </button>
          ))
        )}
      </div>

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

      {aberto && form && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#2A2723]/20" onClick={() => setAberto(null)}>
          <aside className="w-full max-w-[440px] h-full bg-[#FBF9F6] border-l border-[#E7E1D6] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#C9A66B]">Resultado comercial</p>
                <h2 className="text-[18px] font-semibold mt-1">{aberto.titulo}</h2>
                <p className="text-[12px] text-[#8A847A] mt-0.5">{dataHoraBr(aberto.data_hora)} · calendário intacto</p>
              </div>
              <button type="button" onClick={() => setAberto(null)} className="p-2 rounded-xl hover:bg-white" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="bg-white rounded-[22px] border border-[#E7E1D6] p-4 mb-4 text-[12px] text-[#6B6560]">
              <p>{aberto.cidade || "Sem cidade"}{aberto.local ? ` · ${aberto.local}` : ""}</p>
              <p className="mt-1">{aberto.provas} prova(s) ligadas · {aberto.leads_vinculados} lead(s) com evento_id</p>
              {form.roi != null && <p className="mt-1">ROI atual: {form.custo > 0 ? `${roiPreview(form.receita, form.custo)}x` : "—"}</p>}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Num label="Leads gerados" value={form.leads_gerados} onChange={(v) => setForm({ ...form, leads_gerados: v })} />
                <Num label="Pedidos" value={form.pedidos} onChange={(v) => setForm({ ...form, pedidos: v })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Num label="Receita (R$)" value={form.receita} onChange={(v) => setForm({ ...form, receita: v })} />
                <Num label="Custo (R$)" value={form.custo} onChange={(v) => setForm({ ...form, custo: v })} />
              </div>
              <p className="text-[12px] text-[#8A847A]">
                Retorno: {form.custo > 0 ? `${roiPreview(form.receita, form.custo)}x` : "informe o custo para calcular"}
              </p>
              <label className="flex items-center gap-2 text-[13px] text-[#6B6560]">
                <input
                  type="checkbox"
                  checked={form.followup_ok}
                  onChange={(e) => setForm({ ...form, followup_ok: e.target.checked })}
                />
                Follow-up feito
              </label>
              <label className="block text-[12px] text-[#8A847A]">
                Data do follow-up
                <input
                  type="date"
                  value={form.followup_em || ""}
                  onChange={(e) => setForm({ ...form, followup_em: e.target.value || null })}
                  className="mt-1 w-full h-10 bg-white border border-[#E7E1D6] rounded-2xl px-3 text-[13px] outline-none"
                />
              </label>
              <label className="block text-[12px] text-[#8A847A]">
                Notas
                <textarea
                  value={form.notas || ""}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                  rows={3}
                  className="mt-1 w-full bg-white border border-[#E7E1D6] rounded-2xl px-3 py-2 text-[13px] outline-none"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={() => void salvar()}
              disabled={saving}
              className="mt-5 w-full h-11 rounded-2xl bg-[#2A2723] text-white text-[13px] font-medium disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar resultado"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

function roiPreview(receita: number, custo: number) {
  if (custo <= 0) return "—";
  return Math.round((receita / custo) * 100) / 100;
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block text-[12px] text-[#8A847A]">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full h-10 bg-white border border-[#E7E1D6] rounded-2xl px-3 text-[13px] text-[#2A2723] outline-none"
      />
    </label>
  );
}

function Kpi({ label, value, sub, alerta }: { label: string; value: string; sub: string; alerta?: boolean }) {
  return (
    <div className="bg-white rounded-[22px] border border-[#E7E1D6] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">{label}</p>
      <p className={`text-[22px] font-semibold mt-1 leading-tight ${alerta ? "text-[#9A4338]" : ""}`}>{value}</p>
      <p className="text-[12px] text-[#8A847A] mt-1">{sub}</p>
    </div>
  );
}
