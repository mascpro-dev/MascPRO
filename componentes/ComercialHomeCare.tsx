"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MessageCircle } from "lucide-react";
import {
  ETAPAS_REGUA,
  MOTIVOS_NAO_RECOMPRA,
  MOTIVO_LABEL,
} from "@/lib/comercialRegua";

type Etapa = {
  id: string;
  etapa: string;
  previsto_em: string;
  status: string;
  notas: string | null;
  feito_em: string | null;
};

type Kit = {
  order_id: string;
  created_at: string;
  total: number;
  status: string;
  cliente: string;
  whatsapp: string | null;
  motivo_nao_recompra: string | null;
  etapas: Etapa[];
  proximo: Etapa | null;
  recompras: { d30: boolean; d45: boolean; d60: boolean };
  proximo_pedido_em: string | null;
};

type Payload = {
  ok: boolean;
  error?: string;
  hoje: string;
  kpis: {
    kitsMes: number;
    kitsPrev: number;
    atrasados: number;
    pendentesHoje: number;
    feitosMes: number;
    taxaEmDia: number;
    recompra30: { num: number; den: number; pct: number };
    recompra45: { num: number; den: number; pct: number };
    recompra60: { num: number; den: number; pct: number };
  };
  kits: Kit[];
  candidatos: { order_id: string; created_at: string; total: number; status: string; cliente: string }[];
  definicoes: { termo: string; texto: string }[];
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBr(iso: string) {
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function waLink(raw: string | null) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  const n = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${n}`;
}

function tomEtapa(status: string) {
  if (status === "feito") return "bg-[#E7F0EA] text-[#4F7A5A]";
  if (status === "atrasado") return "bg-[#F6E6E2] text-[#9A4338]";
  if (status === "pulado") return "bg-[#F3EEE6] text-[#8A847A]";
  return "bg-[#F5EDDF] text-[#8A6A32]";
}

export default function ComercialHomeCare({ periodo }: { periodo: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"atrasados" | "hoje" | "kits" | "marcar">("atrasados");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`/api/admin/comercial/regua?periodo=${periodo}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Payload | null;
      if (!res.ok || !json?.ok) {
        setErro(json?.error || "Falha ao carregar a régua.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setErro("Falha ao carregar a régua.");
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { void carregar(); }, [carregar]);

  async function marcarKit(orderId: string, valor: boolean) {
    setBusy(orderId);
    const res = await fetch("/api/admin/comercial/regua", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, eh_kit_home_care: valor }),
    });
    const json = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok || !json?.ok) {
      setErro(json?.error || "Não foi possível marcar o kit.");
      return;
    }
    await carregar();
  }

  async function concluir(etapaId: string, status: "feito" | "pulado") {
    setBusy(etapaId);
    const res = await fetch("/api/admin/comercial/regua", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ etapaId, status }),
    });
    const json = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok || !json?.ok) {
      setErro(json?.error || "Não foi possível atualizar a etapa.");
      return;
    }
    await carregar();
  }

  async function salvarMotivo(orderId: string, motivo: string) {
    setBusy(orderId);
    const res = await fetch("/api/admin/comercial/regua", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, motivo_nao_recompra: motivo || null }),
    });
    const json = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok || !json?.ok) {
      setErro(json?.error || "Não foi possível gravar o motivo.");
      return;
    }
    await carregar();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
      </div>
    );
  }

  if (erro || !data) {
    return <p className="text-[#9A4338] text-sm">{erro || "Sem dados da régua."}</p>;
  }

  const { kpis } = data;
  const atrasados = data.kits.filter((k) => k.etapas.some((e) => e.status === "atrasado"));
  const hoje = data.kits.filter((k) => k.etapas.some((e) => e.status === "pendente" && e.previsto_em === data.hoje));
  const listaKits =
    filtro === "atrasados" ? atrasados : filtro === "hoje" ? hoje : data.kits;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi label="Kits no mês" value={String(kpis.kitsMes)} sub={`mês anterior: ${kpis.kitsPrev}`} />
        <Kpi label="Régua em dia" value={`${kpis.taxaEmDia}%`} sub={`${kpis.feitosMes} toques feitos no mês`} />
        <Kpi label="Atrasados" value={String(kpis.atrasados)} sub={`${kpis.pendentesHoje} para hoje`} alerta={kpis.atrasados > 0} />
        <Kpi
          label="Recompra 30 / 45 / 60"
          value={`${kpis.recompra30.pct}% · ${kpis.recompra45.pct}% · ${kpis.recompra60.pct}%`}
          sub={`${kpis.recompra30.num}/${kpis.recompra30.den} · ${kpis.recompra45.num}/${kpis.recompra45.den} · ${kpis.recompra60.num}/${kpis.recompra60.den}`}
        />
      </div>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <p className="text-[13px] text-[#6B6560]">
          Pedido comum não entra nesta lista. Marque kit só quando for home care — senão a recompra 30/45/60 mente.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["atrasados", `Atrasados (${atrasados.length})`],
            ["hoje", `Hoje (${hoje.length})`],
            ["kits", `Todos os kits (${data.kits.length})`],
            ["marcar", `Marcar kit (${data.candidatos.length})`],
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

      {filtro === "marcar" ? (
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
          <h2 className="text-[15px] font-semibold">Pedidos pagos sem kit (90 dias)</h2>
          <p className="text-[12px] text-[#8A847A] mb-4">Não marque reposição avulsa. A régua só nasce daqui.</p>
          {data.candidatos.length === 0 ? (
            <p className="text-[13px] text-[#8A847A] py-6">Nenhum candidato neste recorte.</p>
          ) : (
            <div className="space-y-3">
              {data.candidatos.map((c) => (
                <div key={c.order_id} className="flex flex-wrap items-center justify-between gap-3 border border-[#F0EBE3] rounded-2xl px-4 py-3">
                  <div>
                    <p className="text-[14px] font-medium">{c.cliente}</p>
                    <p className="text-[12px] text-[#8A847A]">{dataBr(c.created_at)} · {moeda(c.total)} · {c.status}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === c.order_id}
                    onClick={() => void marcarKit(c.order_id, true)}
                    className="h-9 px-3 rounded-xl bg-[#2A2723] text-white text-[12px] disabled:opacity-50"
                  >
                    {busy === c.order_id ? "…" : "É kit home care"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : listaKits.length === 0 ? (
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-8 text-[13px] text-[#8A847A]">
          Nada nesta fila. Se a operação está em dia, olhe “Marcar kit”.
        </section>
      ) : (
        <div className="space-y-3">
          {listaKits.map((k) => {
            const wa = waLink(k.whatsapp);
            return (
              <section key={k.order_id} className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[15px] font-semibold">{k.cliente}</p>
                    <p className="text-[12px] text-[#8A847A]">
                      Kit em {dataBr(k.created_at)} · {moeda(k.total)}
                    </p>
                    <p className="text-[12px] text-[#8A847A] mt-1">
                      Recompra: {k.recompras.d30 ? "30 sim" : "30 não"} · {k.recompras.d45 ? "45 sim" : "45 não"} · {k.recompras.d60 ? "60 sim" : "60 não"}
                      {k.proximo_pedido_em ? ` · próximo pedido ${dataBr(k.proximo_pedido_em)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-[#E7E1D6] text-[12px] text-[#4F7A5A]"
                      >
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                    <Link
                      href="/admin/pedidos"
                      className="inline-flex items-center h-9 px-3 rounded-xl border border-[#E7E1D6] text-[12px] text-[#6B6560]"
                    >
                      Pedido
                    </Link>
                    <button
                      type="button"
                      disabled={busy === k.order_id}
                      onClick={() => void marcarKit(k.order_id, false)}
                      className="h-9 px-3 rounded-xl text-[12px] text-[#9A4338]"
                    >
                      Tirar kit
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ETAPAS_REGUA.map((meta) => {
                    const e = k.etapas.find((x) => x.etapa === meta.value);
                    if (!e) {
                      return (
                        <div key={meta.value} className="rounded-2xl border border-dashed border-[#E7E1D6] p-3 text-[12px] text-[#A39C90]">
                          {meta.label} ainda não gerado
                        </div>
                      );
                    }
                    return (
                      <div key={e.id} className="rounded-2xl border border-[#F0EBE3] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[13px] font-medium">{meta.label}</p>
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${tomEtapa(e.status)}`}>
                            {e.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#8A847A] mt-1">{dataBr(e.previsto_em)} · {meta.dica}</p>
                        {(e.status === "pendente" || e.status === "atrasado") && (
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              disabled={busy === e.id}
                              onClick={() => void concluir(e.id, "feito")}
                              className="h-8 px-3 rounded-lg bg-[#2A2723] text-white text-[11px] disabled:opacity-50"
                            >
                              Feito
                            </button>
                            <button
                              type="button"
                              disabled={busy === e.id}
                              onClick={() => void concluir(e.id, "pulado")}
                              className="h-8 px-3 rounded-lg border border-[#E7E1D6] text-[11px] text-[#6B6560] disabled:opacity-50"
                            >
                              Pular
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!k.proximo_pedido_em && (
                  <label className="block mt-4 text-[12px] text-[#6B6560]">
                    Motivo de não recompra
                    <select
                      value={k.motivo_nao_recompra || ""}
                      disabled={busy === k.order_id}
                      onChange={(e) => void salvarMotivo(k.order_id, e.target.value)}
                      className="mt-1 w-full max-w-sm h-10 px-3 rounded-xl border border-[#E7E1D6] bg-[#FBF9F6] text-[13px] outline-none"
                    >
                      <option value="">Sem motivo ainda</option>
                      {MOTIVOS_NAO_RECOMPRA.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    {k.motivo_nao_recompra && (
                      <span className="block mt-1 text-[#8A847A]">{MOTIVO_LABEL[k.motivo_nao_recompra]}</span>
                    )}
                  </label>
                )}
              </section>
            );
          })}
        </div>
      )}

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

function Kpi({ label, value, sub, alerta }: { label: string; value: string; sub: string; alerta?: boolean }) {
  return (
    <div className="bg-white rounded-[22px] border border-[#E7E1D6] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">{label}</p>
      <p className={`text-[22px] font-semibold mt-1 leading-tight ${alerta ? "text-[#9A4338]" : ""}`}>{value}</p>
      <p className="text-[12px] text-[#8A847A] mt-1">{sub}</p>
    </div>
  );
}
