"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2, Search, MessageCircle, MapPin, Users, Phone, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  PERFIS_COMERCIAIS,
  RELACIONAMENTOS_MARCA,
  RESULTADOS_ATENDIMENTO,
  PROXIMAS_ACOES,
  TIPOS_ATENDIMENTO,
} from "@/lib/crmCarteira";
import CrmSubirListaModal from "@/componentes/CrmSubirListaModal";

type Cidade = {
  cidade: string;
  uf: string;
  total: number;
  nao_trabalhados: number;
  abordados: number;
  sem_resposta: number;
  decisores: number;
  visitas_agendadas: number;
  compradores: number;
  sem_proxima_acao: number;
  atrasados: number;
};

type Contato = {
  id: string;
  empresa: string | null;
  nome: string;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  vendedor_id: string | null;
  vendedor_nome: string;
  perfil_comercial: string;
  perfil_comercial_label: string;
  relacionamento_label: string;
  resultado_label: string;
  pipeline_label: string;
  ultimo_contato: string | null;
  proxima_acao_label: string;
  proxima_acao_em: string | null;
};

type Vendedor = { id: string; full_name: string; role: string };

function wa(tel: string | null) {
  const n = String(tel || "").replace(/\D/g, "");
  if (!n) return null;
  return `https://wa.me/${n.startsWith("55") ? n : `55${n}`}`;
}

function dataBr(d: string | null) {
  if (!d) return "—";
  return new Date(String(d).slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
}

export default function ComercialCarteiras() {
  const [cidades, setCidades] = useState<Cidade[]>([]);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [q, setQ] = useState("");
  const [semResp, setSemResp] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [destino, setDestino] = useState("");
  const [modalLista, setModalLista] = useState(false);
  const [aberto, setAberto] = useState<Contato | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [viewerRole, setViewerRole] = useState("ADMIN");
  const readOnly = false;

  const carregar = useCallback(async (p = page) => {
    setLoading(true);
    setErro("");
    try {
      const sp = new URLSearchParams({ page: String(p) });
      if (cidade) sp.set("cidade", cidade);
      if (uf) sp.set("uf", uf);
      if (vendedor) sp.set("vendedor", vendedor);
      if (q) sp.set("q", q);
      if (semResp) sp.set("sem_responsavel", "1");
      const res = await fetch(`/api/admin/crm/carteiras?${sp}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErro(data?.error || "Falha ao carregar carteiras.");
        return;
      }
      setCidades(data.cidades || []);
      setContatos(data.contatos || []);
      setVendedores(data.vendedores || []);
      setTotal(data.total || 0);
      setPages(data.pages || 1);
      setPage(data.page || 1);
      setViewerRole(data.viewer_role || "ADMIN");
    } catch {
      setErro("Falha ao carregar carteiras.");
    } finally {
      setLoading(false);
    }
  }, [cidade, uf, vendedor, q, semResp, page]);

  useEffect(() => {
    void carregar(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cidade, uf, vendedor, semResp]);

  async function transferir() {
    if (!sel.size || !destino) return;
    setSalvando(true);
    try {
      const res = await fetch("/api/admin/crm/carteiras/transferir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_ids: [...sel], para_responsavel_id: destino, motivo: "Distribuição manual" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErro(data?.error || "Falha ao transferir.");
        return;
      }
      setSel(new Set());
      await carregar(page);
    } finally {
      setSalvando(false);
    }
  }

  const ufs = [...new Set(cidades.map((c) => c.uf).filter(Boolean))].sort();

  return (
    <div className="flex flex-col gap-5 pb-8">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2 bg-white border border-[#E7E1D6] rounded-2xl px-3 h-10 flex-1 min-w-[180px]">
          <Search size={14} className="text-[#A39C90]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void carregar(1)}
            placeholder="Buscar nome, salão, telefone..."
            className="flex-1 bg-transparent text-[13px] outline-none"
          />
        </div>
        <select value={uf} onChange={(e) => { setUf(e.target.value); setCidade(""); }} className="h-10 px-3 rounded-2xl border border-[#E7E1D6] bg-white text-[12px]">
          <option value="">Todos os estados</option>
          {ufs.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <select value={vendedor} onChange={(e) => setVendedor(e.target.value)} className="h-10 px-3 rounded-2xl border border-[#E7E1D6] bg-white text-[12px] max-w-[200px]">
          <option value="">Todos os vendedores</option>
          {vendedores.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
        </select>
        <label className="text-[12px] text-[#6B6560] flex items-center gap-1.5">
          <input type="checkbox" checked={semResp} onChange={(e) => setSemResp(e.target.checked)} />
          Sem responsável
        </label>
        <button type="button" onClick={() => void carregar(1)} className="h-10 px-3 rounded-2xl bg-[#EDE4D4] text-[12px] font-medium">
          Filtrar
        </button>
        {!readOnly && (
          <button type="button" onClick={() => setModalLista(true)} className="h-10 px-3 rounded-2xl bg-[#C9A66B] text-black text-[12px] font-bold uppercase tracking-wider">
            Subir lista
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {cidades.filter((c) => !uf || c.uf === uf).slice(0, 24).map((c) => {
          const ativa = cidade === c.cidade && uf === (c.uf || uf);
          return (
            <button
              key={`${c.cidade}|${c.uf}`}
              type="button"
              onClick={() => { setCidade(ativa ? "" : c.cidade); setUf(c.uf); }}
              className={`text-left rounded-2xl border p-4 ${ativa ? "border-[#C9A66B] bg-[#EDE4D4]" : "border-[#E7E1D6] bg-white"}`}
            >
              <p className="flex items-center gap-1.5 text-[14px] font-semibold">
                <MapPin size={14} className="text-[#C9A66B]" />
                {c.cidade}{c.uf ? `/${c.uf}` : ""}
              </p>
              <p className="text-[11px] text-[#8A847A] mt-1">{c.total} contatos</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-[#6B6560]">
                <div>Não trabalhados <b className="tabular-nums">{c.nao_trabalhados}</b></div>
                <div>Abordados <b className="tabular-nums">{c.abordados}</b></div>
                <div>Sem resposta <b className="tabular-nums">{c.sem_resposta}</b></div>
                <div>Decisores <b className="tabular-nums">{c.decisores}</b></div>
                <div>Visitas ag. <b className="tabular-nums">{c.visitas_agendadas}</b></div>
                <div>Compradores <b className="tabular-nums">{c.compradores}</b></div>
                <div>Sem próxima ação <b className="tabular-nums">{c.sem_proxima_acao}</b></div>
                <div>Atrasados <b className="tabular-nums">{c.atrasados}</b></div>
              </dl>
            </button>
          );
        })}
      </div>

      {!readOnly && sel.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-white border border-[#E7E1D6] rounded-2xl p-3">
          <Users size={14} className="text-[#C9A66B]" />
          <span className="text-[12px]">{sel.size} selecionado(s)</span>
          <select value={destino} onChange={(e) => setDestino(e.target.value)} className="h-9 px-3 rounded-xl border border-[#E7E1D6] text-[12px]">
            <option value="">Atribuir a...</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.full_name}</option>)}
          </select>
          <button type="button" disabled={salvando || !destino} onClick={() => void transferir()} className="h-9 px-3 rounded-xl bg-[#2A2723] text-white text-[12px] disabled:opacity-50">
            {salvando ? "Transferindo..." : "Distribuir"}
          </button>
        </div>
      )}

      {erro && <p className="text-sm text-[#9A4338]">{erro}</p>}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : (
        <div className="bg-white border border-[#E7E1D6] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="bg-[#F6F3EE] text-[#8A847A] sticky top-0">
                <tr>
                  {!readOnly && <th className="w-8 p-2" />}
                  <th className="text-left p-2 font-medium">Salão</th>
                  <th className="text-left p-2 font-medium">Contato</th>
                  <th className="text-left p-2 font-medium">WhatsApp</th>
                  <th className="text-left p-2 font-medium">Cidade</th>
                  <th className="text-left p-2 font-medium">Bairro</th>
                  <th className="text-left p-2 font-medium">Vendedor</th>
                  <th className="text-left p-2 font-medium">Perfil</th>
                  <th className="text-left p-2 font-medium">Relacionamento</th>
                  <th className="text-left p-2 font-medium">Último resultado</th>
                  <th className="text-left p-2 font-medium">Pipeline</th>
                  <th className="text-left p-2 font-medium">Último contato</th>
                  <th className="text-left p-2 font-medium">Próxima ação</th>
                </tr>
              </thead>
              <tbody>
                {contatos.map((c) => {
                  const w = wa(c.telefone);
                  return (
                    <tr key={c.id} className="border-t border-[#EEEAE2] hover:bg-[#FBF9F6]">
                      {!readOnly && (
                        <td className="p-2">
                          <input
                            type="checkbox"
                            checked={sel.has(c.id)}
                            onChange={(e) => {
                              const n = new Set(sel);
                              if (e.target.checked) n.add(c.id);
                              else n.delete(c.id);
                              setSel(n);
                            }}
                          />
                        </td>
                      )}
                      <td className="p-2 max-w-[140px] truncate">{c.empresa || "—"}</td>
                      <td className="p-2">
                        <button type="button" onClick={() => setAberto(c)} className="text-left font-medium hover:underline">
                          {c.nome}
                        </button>
                      </td>
                      <td className="p-2">
                        {w ? (
                          <a href={w} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#4F7A5A]">
                            <MessageCircle size={12} /> {c.telefone}
                          </a>
                        ) : (c.telefone || "—")}
                      </td>
                      <td className="p-2 whitespace-nowrap">{[c.cidade, c.estado].filter(Boolean).join("/") || "—"}</td>
                      <td className="p-2">{c.bairro || "—"}</td>
                      <td className="p-2">{c.vendedor_nome}</td>
                      <td className="p-2">{c.perfil_comercial_label}</td>
                      <td className="p-2">{c.relacionamento_label}</td>
                      <td className="p-2">{c.resultado_label}</td>
                      <td className="p-2">{c.pipeline_label}</td>
                      <td className="p-2 whitespace-nowrap">{dataBr(c.ultimo_contato)}</td>
                      <td className="p-2">{c.proxima_acao_label}{c.proxima_acao_em ? ` · ${dataBr(c.proxima_acao_em)}` : ""}</td>
                    </tr>
                  );
                })}
                {!contatos.length && (
                  <tr><td colSpan={13} className="p-8 text-center text-[#8A847A]">Nenhum contato neste filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-[12px] text-[#8A847A] border-t border-[#EEEAE2]">
            <span>{total} contato(s)</span>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => void carregar(page - 1)} className="p-1 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <span>{page}/{pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => void carregar(page + 1)} className="p-1 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      )}

      {aberto && (
        <AtendimentoModal
          contato={aberto}
          readOnly={readOnly}
          onClose={() => setAberto(null)}
          onSaved={() => { setAberto(null); void carregar(page); }}
        />
      )}
      {modalLista && (
        <CrmSubirListaModal
          api="/api/admin/crm/leads/importar"
          tema="claro"
          escolherResponsavel={viewerRole === "ADMIN"}
          onClose={() => setModalLista(false)}
          onImportado={() => { setModalLista(false); void carregar(1); }}
        />
      )}
    </div>
  );
}

function AtendimentoModal({
  contato,
  readOnly,
  onClose,
  onSaved,
}: {
  contato: Contato;
  readOnly: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState("ligacao");
  const [resultado, setResultado] = useState("");
  const [proxima, setProxima] = useState("tentar_contato");
  const [previsto, setPrevisto] = useState("");
  const [obs, setObs] = useState("");
  const [just, setJust] = useState("");
  const [perfil, setPerfil] = useState(contato.perfil_comercial || "nao_verificado");
  const [rel, setRel] = useState("nao_identificado");
  const [hist, setHist] = useState<{ created_at: string; tipo: string; resultado: string | null; observacoes: string | null }[]>([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const w = wa(contato.telefone);

  useEffect(() => {
    fetch(`/api/admin/crm/carteiras/atendimento?lead_id=${contato.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d?.ok) setHist(d.itens || []); })
      .catch(() => {});
  }, [contato.id]);

  async function salvar() {
    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/admin/crm/carteiras/atendimento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: contato.id,
          tipo,
          resultado: resultado || null,
          proxima_acao: proxima,
          previsto_em: previsto || null,
          observacoes: obs,
          justificativa: just,
          perfil_comercial: perfil,
          relacionamento: rel,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErro(data?.error || "Não foi possível gravar.");
        return;
      }
      onSaved();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 p-0 md:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl md:rounded-2xl p-5">
        <div className="flex justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-[#A39C90]">Atendimento</p>
            <h3 className="text-lg font-semibold">{contato.nome}</h3>
            <p className="text-[12px] text-[#8A847A]">{contato.empresa || contato.cidade}</p>
          </div>
          <button type="button" onClick={onClose} className="text-[#8A847A]">Fechar</button>
        </div>
        <div className="flex gap-2 mt-3">
          {w && (
            <a href={w} target="_blank" rel="noopener noreferrer" className="flex-1 h-10 rounded-xl bg-[#E7F0EA] text-[#4F7A5A] text-[12px] font-medium flex items-center justify-center gap-1">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {contato.telefone && (
            <a href={`tel:${contato.telefone.replace(/\D/g, "")}`} className="flex-1 h-10 rounded-xl bg-[#F5EDDF] text-[#8A6A32] text-[12px] font-medium flex items-center justify-center gap-1">
              <Phone size={14} /> Ligar
            </a>
          )}
        </div>
        <p className="text-[11px] text-[#A39C90] mt-2">Abrir WhatsApp não registra conversa. Grave a tentativa abaixo.</p>

        {!readOnly && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-10 px-3 rounded-xl border border-[#E7E1D6] text-[13px]">
              {TIPOS_ATENDIMENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={resultado} onChange={(e) => setResultado(e.target.value)} className="h-10 px-3 rounded-xl border border-[#E7E1D6] text-[13px]">
              <option value="">Resultado</option>
              {RESULTADOS_ATENDIMENTO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={perfil} onChange={(e) => setPerfil(e.target.value)} className="h-10 px-3 rounded-xl border border-[#E7E1D6] text-[13px]">
              {PERFIS_COMERCIAIS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={rel} onChange={(e) => setRel(e.target.value)} className="h-10 px-3 rounded-xl border border-[#E7E1D6] text-[13px]">
              {RELACIONAMENTOS_MARCA.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <select value={proxima} onChange={(e) => setProxima(e.target.value)} className="h-10 px-3 rounded-xl border border-[#E7E1D6] text-[13px]">
              {PROXIMAS_ACOES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {proxima === "nenhuma" && (
              <textarea value={just} onChange={(e) => setJust(e.target.value)} placeholder="Justificativa obrigatória" className="min-h-[70px] px-3 py-2 rounded-xl border border-[#E7E1D6] text-[13px]" />
            )}
            <input type="date" value={previsto} onChange={(e) => setPrevisto(e.target.value)} className="h-10 px-3 rounded-xl border border-[#E7E1D6] text-[13px]" />
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observações" className="min-h-[70px] px-3 py-2 rounded-xl border border-[#E7E1D6] text-[13px]" />
            {erro && <p className="text-xs text-[#9A4338]">{erro}</p>}
            <button type="button" disabled={enviando} onClick={() => void salvar()} className="h-11 rounded-xl bg-[#C9A66B] text-black font-bold uppercase text-xs tracking-widest">
              {enviando ? "Salvando..." : "Registrar atendimento"}
            </button>
          </div>
        )}

        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-widest text-[#A39C90] mb-2">Histórico</p>
          {hist.length === 0 && <p className="text-[12px] text-[#8A847A]">Nenhum atendimento estruturado ainda. Rode o SQL das carteiras se esta mensagem persistir após gravar.</p>}
          <ul className="space-y-2">
            {hist.map((h, i) => (
              <li key={i} className="text-[12px] border border-[#EEEAE2] rounded-xl p-2">
                <span className="text-[#8A847A]">{new Date(h.created_at).toLocaleString("pt-BR")}</span>
                <span className="mx-1">·</span>
                {h.tipo}
                {h.resultado ? ` · ${h.resultado}` : ""}
                {h.observacoes ? <p className="mt-1 text-[#6B6560]">{h.observacoes}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
