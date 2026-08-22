"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, X } from "lucide-react";
import type { SemaforoComercial } from "@/lib/comercialMetricas";
import type { ManualScore, PapelScore, PilarScore } from "@/lib/comercialScore";
import { MANUAL_VAZIO } from "@/lib/comercialScore";

type Pessoa = {
  profile_id: string;
  nome: string;
  whatsapp: string | null;
  cidade: string | null;
  avatar_url: string | null;
  nivel_embaixador: string | null;
  indicados: number;
  pedidos: number;
  receita: number;
  kits: number;
  leads: number;
  compra_propria?: number;
  posts_comunidade?: number;
  provas_catalogo?: number;
  vendedores?: number;
  vendedores_ativos?: number;
  visitas?: number;
  manual: ManualScore;
  score: {
    total: number;
    max: number;
    pilares: PilarScore[];
    ativa: boolean;
    status: SemaforoComercial;
    manuaisVazios: number;
  };
};

type Payload = {
  ok: boolean;
  error?: string;
  aviso?: string | null;
  periodo: string;
  papel: PapelScore;
  kpis: { total: number; ativas: number; comVenda: number; scoreMedio: number; semNota: number };
  pessoas: Pessoa[];
  definicoes: { termo: string; texto: string }[];
};

type Filtro = "todas" | "ativas" | "venda" | "sem_nota";

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function waLink(raw: string | null) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  const n = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${n}`;
}

function tone(s: SemaforoComercial) {
  if (s === "ok") return { text: "text-[#4F7A5A]", bg: "bg-[#E7F0EA]", bar: "#6F8F78", label: "No alvo" };
  if (s === "atencao") return { text: "text-[#8A6A32]", bg: "bg-[#F5EDDF]", bar: "#C9A66B", label: "Atenção" };
  return { text: "text-[#9A4338]", bg: "bg-[#F6E6E2]", bar: "#B85C4C", label: "Abaixo" };
}

function Ring({ value, status }: { value: number; status: SemaforoComercial }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * c;
  const color = tone(status).bar;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" aria-label={`Score ${value}`}>
      <circle cx="28" cy="28" r={r} fill="none" stroke="#EEEAE2" strokeWidth="6" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 28 28)"
        strokeLinecap="round"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="13" fontWeight="600" fill="#2A2723">{value}</text>
    </svg>
  );
}

function inicial(nome: string) {
  const p = nome.trim().split(/\s+/)[0] || "?";
  return p.slice(0, 1).toUpperCase();
}

export default function ComercialRede({ periodo, papel }: { periodo: string; papel: PapelScore }) {
  const [data, setData] = useState<Payload | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [aberta, setAberta] = useState<Pessoa | null>(null);
  const [form, setForm] = useState<ManualScore>(MANUAL_VAZIO);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`/api/admin/comercial/score?periodo=${periodo}&papel=${papel}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Payload | null;
      if (!res.ok || !json?.ok) {
        setErro(json?.error || "Falha ao carregar o score.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setErro("Falha ao carregar o score.");
    } finally {
      setLoading(false);
    }
  }, [periodo, papel]);

  useEffect(() => { void carregar(); }, [carregar]);
  useEffect(() => { setAberta(null); setFiltro("todas"); setBusca(""); }, [papel, periodo]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (data?.pessoas || []).filter((p) => {
      if (filtro === "ativas" && !p.score.ativa) return false;
      if (filtro === "venda" && p.pedidos <= 0) return false;
      if (filtro === "sem_nota" && p.score.manuaisVazios <= 0) return false;
      if (!q) return true;
      return (
        p.nome.toLowerCase().includes(q) ||
        String(p.cidade || "").toLowerCase().includes(q) ||
        String(p.whatsapp || "").includes(q)
      );
    });
  }, [data, busca, filtro]);

  function abrir(p: Pessoa) {
    setAberta(p);
    setForm({ ...p.manual });
  }

  async function salvar() {
    if (!aberta) return;
    setSaving(true);
    const res = await fetch("/api/admin/comercial/score", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: aberta.profile_id,
        periodo,
        papel,
        ...form,
      }),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok || !json?.ok) {
      setErro(json?.error || "Não foi possível gravar a nota.");
      return;
    }
    setAberta(null);
    await carregar();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
      </div>
    );
  }

  if (erro && !data) {
    return <p className="text-[#9A4338] text-sm">{erro}</p>;
  }

  if (!data) return <p className="text-[#8A847A] text-sm">Sem dados.</p>;

  const emb = papel === "embaixadora";

  return (
    <div className="flex flex-col gap-6">
      {data.aviso && (
        <p className="text-[13px] text-[#8A6A32] bg-[#F5EDDF] border border-[#E7E1D6] rounded-2xl px-4 py-3">{data.aviso}</p>
      )}
      {erro && data && (
        <p className="text-[13px] text-[#9A4338]">{erro}</p>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi label={emb ? "Embaixadoras" : "Distribuidores"} value={String(data.kpis.total)} sub="cadastro atual · profiles.role" />
        <Kpi
          label={emb ? "Ativas no mês" : "Em movimento"}
          value={String(data.kpis.ativas)}
          sub={emb ? "venda, prova ou conteúdo" : "venda, visita ou salão ativado"}
        />
        <Kpi label="Com venda da rede" value={String(data.kpis.comVenda)} sub="pedido pago atribuído" />
        <Kpi label="Score médio" value={String(data.kpis.scoreMedio)} sub="0–100 deste ciclo" />
      </div>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <p className="text-[13px] text-[#6B6560]">
          {emb
            ? "Nível Certified / Expert / Master / Educador continua na jornada. Aqui é o score comercial do mês — prova, conteúdo, venda, home care, treino e postura."
            : "Salão prospectado e ativado ainda é nota manual. Venda, equipe e visita vêm do que já existe. Exclusividade e relatório não nascem sozinhos."}
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["todas", `Todas (${data.pessoas.length})`],
            ["ativas", `${emb ? "Ativas" : "Em movimento"} (${data.kpis.ativas})`],
            ["venda", `Com venda (${data.kpis.comVenda})`],
            ["sem_nota", `Sem nota (${data.kpis.semNota})`],
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
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nome, cidade ou WhatsApp"
          className="h-9 min-w-[220px] flex-1 bg-white border border-[#E7E1D6] rounded-full px-4 text-[13px] outline-none"
        />
      </div>

      <div className="space-y-3">
        {lista.length === 0 ? (
          <p className="text-[13px] text-[#8A847A] py-8">Ninguém neste recorte.</p>
        ) : (
          lista.map((p) => {
            const t = tone(p.score.status);
            const wa = waLink(p.whatsapp);
            return (
              <button
                key={p.profile_id}
                type="button"
                onClick={() => abrir(p)}
                className="w-full text-left bg-white rounded-[22px] border border-[#E7E1D6] p-4 flex flex-wrap items-center gap-4 hover:border-[#D8CFC0] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-[200px] flex-1">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                  ) : (
                    <span className="w-11 h-11 rounded-full bg-[#EDE4D4] text-[#8A6A32] flex items-center justify-center text-[14px] font-semibold">
                      {inicial(p.nome)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium truncate">{p.nome}</p>
                    <p className="text-[12px] text-[#8A847A] truncate">
                      {p.cidade || "Sem cidade"}
                      {emb && p.nivel_embaixador ? ` · ${p.nivel_embaixador.replace("EMBAIXADOR ", "")}` : ""}
                      {` · ${p.indicados} indicado(s)`}
                    </p>
                  </div>
                </div>
                <Ring value={p.score.total} status={p.score.status} />
                <div className="flex-1 min-w-[180px] grid grid-cols-3 gap-2">
                  {p.score.pilares.slice(0, 3).map((pil) => (
                    <div key={pil.key}>
                      <p className="text-[10px] uppercase tracking-[0.08em] text-[#A39C90]">{pil.label}</p>
                      <div className="h-1.5 rounded-full bg-[#EEEAE2] overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-[#C9A66B]" style={{ width: `${(pil.pontos / pil.max) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-right text-[12px] text-[#6B6560] min-w-[120px]">
                  <p className="tabular-nums font-medium text-[#2A2723]">{p.pedidos} venda(s)</p>
                  <p>{p.receita ? moeda(p.receita) : "—"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.bg} ${t.text}`}>
                  {p.score.ativa ? (emb ? "Ativa" : "Em movimento") : t.label}
                </span>
                {wa && (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-full hover:bg-[#F3EEE6] text-[#6F8F78]"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle size={16} />
                  </a>
                )}
              </button>
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

      {aberta && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#2A2723]/20" onClick={() => setAberta(null)}>
          <aside
            className="w-full max-w-[440px] h-full bg-[#FBF9F6] border-l border-[#E7E1D6] overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#C9A66B]">Ficha do ciclo</p>
                <h2 className="text-[18px] font-semibold mt-1">{aberta.nome}</h2>
                <p className="text-[12px] text-[#8A847A] mt-0.5">
                  {aberta.nivel_embaixador || (emb ? "Sem nível de jornada" : "Distribuidor")}
                  {" · "}nível não é este score
                </p>
              </div>
              <button type="button" onClick={() => setAberta(null)} className="p-2 rounded-xl hover:bg-white" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-4 bg-white rounded-[22px] border border-[#E7E1D6] p-4 mb-4">
              <Ring value={aberta.score.total} status={aberta.score.status} />
              <div>
                <p className="text-[13px] font-medium">{aberta.score.total} / 100</p>
                <p className="text-[12px] text-[#8A847A]">{aberta.pedidos} venda(s) · {aberta.leads} lead(s)</p>
                {emb && (aberta.compra_propria || 0) > 0 && (
                  <p className="text-[11px] text-[#8A847A]">{aberta.compra_propria} compra(s) própria(s) — fora do score</p>
                )}
                {emb && (aberta.provas_catalogo || 0) > 0 && (
                  <p className="text-[11px] text-[#6F8F78]">{aberta.provas_catalogo} prova(s) no banco neste mês</p>
                )}
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {aberta.score.pilares.map((pil) => (
                <div key={pil.key}>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#6B6560]">{pil.label}</span>
                    <span className="tabular-nums">{pil.pontos}/{pil.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#EEEAE2] overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(pil.pontos / pil.max) * 100}%`, background: pil.fonte === "derivado" ? "#6F8F78" : "#C9A66B" }}
                    />
                  </div>
                  <p className="text-[11px] text-[#A39C90] mt-0.5">{pil.detalhe}</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] uppercase tracking-[0.14em] text-[#A39C90] mb-3">Notas manuais deste mês</p>
            {emb ? (
              <div className="space-y-3">
                <CampoNota label="Prova" max={20} value={form.prova} onChange={(v) => setForm({ ...form, prova: v })} />
                <CampoNota label="Conteúdo" max={20} value={form.conteudo} onChange={(v) => setForm({ ...form, conteudo: v })} dica={aberta.posts_comunidade ? `${aberta.posts_comunidade} post(s) na comunidade — só pista` : undefined} />
                <CampoNota label="Treino" max={10} value={form.treino} onChange={(v) => setForm({ ...form, treino: v })} />
                <CampoNota label="Postura" max={10} value={form.postura} onChange={(v) => setForm({ ...form, postura: v })} />
              </div>
            ) : (
              <div className="space-y-3">
                <CampoInt label="Salões prospectados" value={form.saloes_prospectados} onChange={(v) => setForm({ ...form, saloes_prospectados: v })} />
                <CampoInt label="Salões ativados" value={form.saloes_ativados} onChange={(v) => setForm({ ...form, saloes_ativados: v })} />
                <CampoNota label="Exclusividade" max={15} value={form.exclusividade} onChange={(v) => setForm({ ...form, exclusividade: v })} />
                <label className="flex items-center gap-2 text-[13px] text-[#6B6560]">
                  <input type="checkbox" checked={form.relatorio_ok} onChange={(e) => setForm({ ...form, relatorio_ok: e.target.checked })} />
                  Relatório mensal entregue
                </label>
                <label className="flex items-center gap-2 text-[13px] text-[#6B6560]">
                  <input type="checkbox" checked={form.politica_ok} onChange={(e) => setForm({ ...form, politica_ok: e.target.checked })} />
                  Política / combinado em dia
                </label>
              </div>
            )}

            <label className="block mt-4 text-[12px] text-[#8A847A]">
              Notas
              <textarea
                value={form.notas || ""}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                rows={3}
                className="mt-1 w-full bg-white border border-[#E7E1D6] rounded-2xl px-3 py-2 text-[13px] text-[#2A2723] outline-none"
              />
            </label>

            <button
              type="button"
              onClick={() => void salvar()}
              disabled={saving}
              className="mt-5 w-full h-11 rounded-2xl bg-[#2A2723] text-white text-[13px] font-medium disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Salvar notas do ciclo"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-[22px] border border-[#E7E1D6] p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-[#A39C90]">{label}</p>
      <p className="text-[22px] font-semibold mt-1 leading-tight">{value}</p>
      <p className="text-[12px] text-[#8A847A] mt-1">{sub}</p>
    </div>
  );
}

function CampoNota({
  label, max, value, onChange, dica,
}: {
  label: string;
  max: number;
  value: number | null;
  onChange: (v: number | null) => void;
  dica?: string;
}) {
  return (
    <label className="block text-[12px] text-[#8A847A]">
      {label} <span className="text-[#A39C90]">0–{max}</span>
      <input
        type="number"
        min={0}
        max={max}
        value={value ?? ""}
        placeholder="—"
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="mt-1 w-full h-10 bg-white border border-[#E7E1D6] rounded-2xl px-3 text-[13px] text-[#2A2723] outline-none"
      />
      {dica && <span className="block mt-1 text-[11px] text-[#A39C90]">{dica}</span>}
    </label>
  );
}

function CampoInt({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
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
