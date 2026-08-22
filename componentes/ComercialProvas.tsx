"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { LINHAS_PRODUTO } from "@/lib/comercialClassificacao";

type Prova = {
  id: string;
  realizado_em: string;
  cliente_nome: string;
  cidade: string;
  estado: string | null;
  linha: string;
  linha_label: string;
  protocolo: string;
  autorizacao: boolean;
  uso_comercial: boolean;
  midia_url: string | null;
  community_post_id: string | null;
  profile_id: string | null;
  event_id: string | null;
  notas: string | null;
  responsavel: string | null;
  evento: string | null;
};

type Candidato = {
  id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
  user_id: string;
  autor: string;
};

type Payload = {
  ok: boolean;
  error?: string;
  periodo: string;
  kpis: { total: number; usoComercial: number; candidatos: number; comResponsavel: number };
  provas: Prova[];
  porLinha: { key: string; label: string; n: number }[];
  candidatos: Candidato[];
  pessoas: { id: string; nome: string; role: string }[];
  eventos: { id: string; titulo: string; data_hora: string; cidade: string | null }[];
  definicoes: { termo: string; texto: string }[];
};

type Form = {
  id?: string;
  realizado_em: string;
  cliente_nome: string;
  cidade: string;
  estado: string;
  linha: string;
  protocolo: string;
  autorizacao: boolean;
  uso_comercial: boolean;
  midia_url: string;
  community_post_id: string;
  profile_id: string;
  event_id: string;
  notas: string;
};

const VAZIO: Form = {
  realizado_em: new Date().toISOString().slice(0, 10),
  cliente_nome: "",
  cidade: "",
  estado: "",
  linha: "",
  protocolo: "",
  autorizacao: false,
  uso_comercial: false,
  midia_url: "",
  community_post_id: "",
  profile_id: "",
  event_id: "",
  notas: "",
};

type Filtro = "todas" | "uso" | "candidatos";

function dataBr(iso: string) {
  const s = iso.slice(0, 10);
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

export default function ComercialProvas({ periodo }: { periodo: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [linha, setLinha] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch(`/api/admin/comercial/provas?periodo=${periodo}`, { cache: "no-store" });
      const json = (await res.json().catch(() => null)) as Payload | null;
      if (!res.ok || !json?.ok) {
        setErro(json?.error || "Falha ao carregar as provas.");
        setData(null);
      } else {
        setData(json);
      }
    } catch {
      setErro("Falha ao carregar as provas.");
    } finally {
      setLoading(false);
    }
  }, [periodo]);

  useEffect(() => { void carregar(); }, [carregar]);

  const lista = useMemo(() => {
    if (!data) return [];
    return data.provas.filter((p) => {
      if (filtro === "uso" && !p.uso_comercial) return false;
      if (linha && p.linha !== linha) return false;
      return true;
    });
  }, [data, filtro, linha]);

  function abrirNova() {
    setForm({ ...VAZIO });
    setErro("");
  }

  function abrirEditar(p: Prova) {
    setForm({
      id: p.id,
      realizado_em: p.realizado_em.slice(0, 10),
      cliente_nome: p.cliente_nome,
      cidade: p.cidade,
      estado: p.estado || "",
      linha: p.linha,
      protocolo: p.protocolo,
      autorizacao: p.autorizacao,
      uso_comercial: p.uso_comercial,
      midia_url: p.midia_url || "",
      community_post_id: p.community_post_id || "",
      profile_id: p.profile_id || "",
      event_id: p.event_id || "",
      notas: p.notas || "",
    });
    setErro("");
  }

  function catalogar(c: Candidato) {
    setForm({
      ...VAZIO,
      midia_url: c.media_url || "",
      community_post_id: c.id,
      profile_id: c.user_id,
      notas: c.content || "",
      cliente_nome: "",
    });
    setErro("");
  }

  async function salvar() {
    if (!form) return;
    setSaving(true);
    const res = await fetch("/api/admin/comercial/provas", {
      method: form.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok || !json?.ok) {
      setErro(json?.error || "Não foi possível catalogar.");
      return;
    }
    setForm(null);
    await carregar();
  }

  async function apagar(id: string) {
    if (!confirm("Tirar esta prova do banco comercial?")) return;
    const res = await fetch("/api/admin/comercial/provas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setErro(json?.error || "Não foi possível apagar.");
      return;
    }
    if (form?.id === id) setForm(null);
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
      {erro && data && <p className="text-[13px] text-[#9A4338]">{erro}</p>}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Kpi label="Provas no mês" value={String(data.kpis.total)} sub="só o que foi catalogado" />
        <Kpi label="Uso comercial" value={String(data.kpis.usoComercial)} sub="autorizadas para veicular" />
        <Kpi label="Com responsável" value={String(data.kpis.comResponsavel)} sub="entra no score da rede" />
        <Kpi label="Pistas da comunidade" value={String(data.kpis.candidatos)} sub="post com mídia · 90 dias" />
      </div>

      <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
        <p className="text-[13px] text-[#6B6560]">
          Post da comunidade não é prova. Catalogar exige linha, cidade, protocolo e autorização. Sem isso o save é recusado.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["todas", `Catalogadas (${data.provas.length})`],
            ["uso", `Uso comercial (${data.kpis.usoComercial})`],
            ["candidatos", `Pistas (${data.candidatos.length})`],
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
        <select
          value={linha}
          onChange={(e) => setLinha(e.target.value)}
          className="h-9 bg-white border border-[#E7E1D6] rounded-full px-3 text-[12px] text-[#6B6560]"
        >
          <option value="">Todas as linhas</option>
          {LINHAS_PRODUTO.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={abrirNova}
          className="h-9 px-3 rounded-full bg-[#2A2723] text-white text-[12px] ml-auto flex items-center gap-1.5"
        >
          <Plus size={14} /> Nova prova
        </button>
      </div>

      {data.porLinha.length > 0 && filtro !== "candidatos" && (
        <div className="flex flex-wrap gap-2">
          {data.porLinha.map((l) => (
            <span key={l.key} className="text-[11px] px-2.5 py-1 rounded-full bg-white border border-[#E7E1D6] text-[#6B6560]">
              {l.label} · {l.n}
            </span>
          ))}
        </div>
      )}

      {filtro === "candidatos" ? (
        <div className="space-y-3">
          {data.candidatos.length === 0 ? (
            <p className="text-[13px] text-[#8A847A] py-8">Nenhum post com mídia nos últimos 90 dias, ou todos já foram catalogados.</p>
          ) : (
            data.candidatos.map((c) => (
              <div key={c.id} className="bg-white rounded-[22px] border border-[#E7E1D6] p-4 flex flex-wrap gap-4 items-center">
                {c.media_url && (
                  <img src={c.media_url} alt="" className="w-16 h-16 rounded-2xl object-cover" />
                )}
                <div className="flex-1 min-w-[180px]">
                  <p className="text-[14px] font-medium">{c.autor}</p>
                  <p className="text-[12px] text-[#8A847A] line-clamp-2">{c.content || "Sem texto"}</p>
                  <p className="text-[11px] text-[#A39C90] mt-1">{dataBr(c.created_at)} · ainda não é prova</p>
                </div>
                <button
                  type="button"
                  onClick={() => catalogar(c)}
                  className="h-9 px-3 rounded-full border border-[#E7E1D6] text-[12px] bg-[#FBF9F6]"
                >
                  Catalogar
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {lista.length === 0 ? (
            <p className="text-[13px] text-[#8A847A] py-8">Nenhuma prova neste recorte.</p>
          ) : (
            lista.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => abrirEditar(p)}
                className="w-full text-left bg-white rounded-[22px] border border-[#E7E1D6] p-4 flex flex-wrap items-center gap-4 hover:border-[#D8CFC0]"
              >
                {p.midia_url ? (
                  <img src={p.midia_url} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                ) : (
                  <span className="w-14 h-14 rounded-2xl bg-[#EDE4D4] text-[#8A6A32] text-[11px] flex items-center justify-center">Sem foto</span>
                )}
                <div className="flex-1 min-w-[180px]">
                  <p className="text-[14px] font-medium">{p.cliente_nome}</p>
                  <p className="text-[12px] text-[#8A847A]">
                    {p.linha_label} · {p.cidade}{p.estado ? `/${p.estado}` : ""} · {dataBr(p.realizado_em)}
                  </p>
                  <p className="text-[11px] text-[#A39C90] mt-0.5">
                    {p.responsavel || "Sem responsável"}{p.evento ? ` · ${p.evento}` : ""}
                  </p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${p.uso_comercial ? "bg-[#E7F0EA] text-[#4F7A5A]" : "bg-[#F3EEE6] text-[#8A847A]"}`}>
                  {p.uso_comercial ? "Uso comercial" : "Só arquivo"}
                </span>
              </button>
            ))
          )}
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

      {form && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#2A2723]/20" onClick={() => setForm(null)}>
          <aside className="w-full max-w-[440px] h-full bg-[#FBF9F6] border-l border-[#E7E1D6] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#C9A66B]">Banco de provas</p>
                <h2 className="text-[18px] font-semibold mt-1">{form.id ? "Editar prova" : "Catalogar prova"}</h2>
              </div>
              <button type="button" onClick={() => setForm(null)} className="p-2 rounded-xl hover:bg-white" aria-label="Fechar">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <Campo label="Cliente">
                <input value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} className={inp} />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Cidade">
                  <input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} className={inp} />
                </Campo>
                <Campo label="UF">
                  <input value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className={inp} />
                </Campo>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Linha">
                  <select value={form.linha} onChange={(e) => setForm({ ...form, linha: e.target.value })} className={inp}>
                    <option value="">Selecione</option>
                    {LINHAS_PRODUTO.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Data">
                  <input type="date" value={form.realizado_em} onChange={(e) => setForm({ ...form, realizado_em: e.target.value })} className={inp} />
                </Campo>
              </div>
              <Campo label="Protocolo">
                <textarea value={form.protocolo} onChange={(e) => setForm({ ...form, protocolo: e.target.value })} rows={3} className={inp} />
              </Campo>
              <Campo label="Responsável (embaixadora / distribuidor)">
                <select value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })} className={inp}>
                  <option value="">Sem responsável</option>
                  {data.pessoas.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="Evento (opcional)">
                <select value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })} className={inp}>
                  <option value="">Fora de evento</option>
                  {data.eventos.map((e) => (
                    <option key={e.id} value={e.id}>{e.titulo}</option>
                  ))}
                </select>
              </Campo>
              <Campo label="URL da mídia">
                <input value={form.midia_url} onChange={(e) => setForm({ ...form, midia_url: e.target.value })} className={inp} />
              </Campo>
              <label className="flex items-center gap-2 text-[13px] text-[#6B6560]">
                <input type="checkbox" checked={form.autorizacao} onChange={(e) => setForm({ ...form, autorizacao: e.target.checked })} />
                Autorização do cliente (obrigatória)
              </label>
              <label className="flex items-center gap-2 text-[13px] text-[#6B6560]">
                <input type="checkbox" checked={form.uso_comercial} onChange={(e) => setForm({ ...form, uso_comercial: e.target.checked })} />
                Liberar uso comercial
              </label>
              <Campo label="Notas">
                <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} className={inp} />
              </Campo>
            </div>

            <button
              type="button"
              onClick={() => void salvar()}
              disabled={saving}
              className="mt-5 w-full h-11 rounded-2xl bg-[#2A2723] text-white text-[13px] font-medium disabled:opacity-60"
            >
              {saving ? "Salvando…" : "Catalogar"}
            </button>
            {form.id && (
              <button
                type="button"
                onClick={() => void apagar(form.id!)}
                className="mt-2 w-full h-10 text-[12px] text-[#9A4338]"
              >
                Remover do banco
              </button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

const inp = "mt-1 w-full bg-white border border-[#E7E1D6] rounded-2xl px-3 py-2 text-[13px] text-[#2A2723] outline-none";

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-[12px] text-[#8A847A]">
      {label}
      {children}
    </label>
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
