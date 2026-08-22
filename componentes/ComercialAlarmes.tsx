"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { TIPOS_ALARME, type TipoAlarme } from "@/lib/comercialAlarmes";

type Destino = "pipeline" | "homecare" | "eventos";

type Alarme = {
  id: string;
  tipo: TipoAlarme;
  label: string;
  gravidade: "ok" | "atencao" | "risco";
  titulo: string;
  detalhe: string;
  dias: number;
  destino: Destino;
  telefone: string | null;
  ref_id: string;
};

type Payload = {
  ok: boolean;
  error?: string;
  aviso?: string | null;
  hoje: string;
  kpis: {
    total: number;
    riscos: number;
    lead_parado: number;
    proposta_parada: number;
    recompra_vencida: number;
    regua_atrasada: number;
    evento_sem_followup: number;
  };
  alarmes: Alarme[];
  definicoes: { termo: string; texto: string }[];
};

type Filtro = "todos" | "risco" | TipoAlarme;

function waLink(raw: string | null) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  const n = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${n}`;
}

function tone(s: Alarme["gravidade"]) {
  if (s === "risco") return { text: "text-[#9A4338]", bg: "bg-[#F6E6E2]", label: "Urgente" };
  if (s === "atencao") return { text: "text-[#8A6A32]", bg: "bg-[#F5EDDF]", label: "Atenção" };
  return { text: "text-[#4F7A5A]", bg: "bg-[#E7F0EA]", label: "Ok" };
}

export default function ComercialAlarmes({ onNavegar }: { onNavegar: (destino: Destino) => void }) {
  const [data, setData] = useState<Payload | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todos");

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/comercial/alarmes", { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Payload | null;
      if (!res.ok || !json?.ok) {
        setErro(json?.error || "Falha ao carregar os alarmes.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setErro("Falha ao carregar os alarmes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  const lista = useMemo(() => {
    const all = data?.alarmes || [];
    if (filtro === "todos") return all;
    if (filtro === "risco") return all.filter((a) => a.gravidade === "risco");
    return all.filter((a) => a.tipo === filtro);
  }, [data, filtro]);

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
        <Kpi label="Abertos agora" value={String(data.kpis.total)} sub="se não registrou, não aconteceu" />
        <Kpi label="Urgentes" value={String(data.kpis.riscos)} sub="follow-up ou janela vencida" alerta={data.kpis.riscos > 0} />
        <Kpi label="Lead / proposta" value={`${data.kpis.lead_parado} · ${data.kpis.proposta_parada}`} sub="pipeline parado" />
        <Kpi
          label="Recompra / régua"
          value={`${data.kpis.recompra_vencida} · ${data.kpis.regua_atrasada}`}
          sub={`${data.kpis.evento_sem_followup} evento(s) sem follow-up`}
        />
      </div>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <p className="text-[13px] text-[#6B6560]">
          Não é lista para “arquivar”. O alarme some quando o lead anda, a régua é feita, o motivo da não recompra entra ou o follow-up do evento é marcado.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        <Chip ativo={filtro === "todos"} onClick={() => setFiltro("todos")}>Todos ({data.kpis.total})</Chip>
        <Chip ativo={filtro === "risco"} onClick={() => setFiltro("risco")}>Urgentes ({data.kpis.riscos})</Chip>
        {TIPOS_ALARME.map((t) => (
          <Chip key={t.value} ativo={filtro === t.value} onClick={() => setFiltro(t.value)}>
            {t.label} ({data.kpis[t.value]})
          </Chip>
        ))}
      </div>

      <div className="space-y-3">
        {lista.length === 0 ? (
          <p className="text-[13px] text-[#8A847A] py-8">Nada neste recorte. O ciclo está em dia — ou ainda falta marcar kit / resultado de evento.</p>
        ) : (
          lista.map((a) => {
            const t = tone(a.gravidade);
            const wa = waLink(a.telefone);
            return (
              <div key={a.id} className="bg-white rounded-[22px] border border-[#E7E1D6] p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <p className="text-[14px] font-medium">{a.titulo}</p>
                  <p className="text-[12px] text-[#8A847A] mt-0.5">{a.label} · {a.detalhe}</p>
                </div>
                <span className="text-[12px] tabular-nums text-[#6B6560]">{a.dias}d</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.bg} ${t.text}`}>{t.label}</span>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="p-2 rounded-full hover:bg-[#F3EEE6] text-[#6F8F78]" aria-label="WhatsApp">
                    <MessageCircle size={16} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onNavegar(a.destino)}
                  className="h-9 px-3 rounded-full border border-[#E7E1D6] text-[12px] bg-[#FBF9F6]"
                >
                  Abrir {a.destino === "pipeline" ? "pipeline" : a.destino === "homecare" ? "home care" : "eventos"}
                </button>
              </div>
            );
          })
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
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 px-3 rounded-full text-[12px] border ${
        ativo ? "bg-[#EDE4D4] border-[#E7E1D6] text-[#2A2723]" : "bg-white border-[#E7E1D6] text-[#6B6560]"
      }`}
    >
      {children}
    </button>
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
