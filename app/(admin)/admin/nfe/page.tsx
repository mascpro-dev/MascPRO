"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { FileText, Loader2, RefreshCw, ExternalLink, XCircle, AlertCircle, CheckCircle, Clock } from "lucide-react";

type NotaFiscal = {
  id: string;
  created_at: string;
  order_id: string | null;
  bling_id: string | null;
  numero_nfe: string | null;
  serie: string | null;
  chave_acesso: string | null;
  status: string;
  xml_url: string | null;
  pdf_url: string | null;
  error_msg: string | null;
  emitidor: { full_name: string } | null;
  orders: {
    id: string; total: number; status: string; created_at: string;
    profiles: { full_name: string; email: string } | null;
  } | null;
};

const STATUS_CONFIG: Record<string, { label: string; cor: string; icon: React.ReactNode }> = {
  pendente:  { label: "Pendente",  cor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", icon: <Clock size={11} /> },
  emitida:   { label: "Emitida",   cor: "text-green-400 bg-green-500/10 border-green-500/30",   icon: <CheckCircle size={11} /> },
  cancelada: { label: "Cancelada", cor: "text-red-400 bg-red-500/10 border-red-500/30",          icon: <XCircle size={11} /> },
  erro:      { label: "Erro",      cor: "text-red-400 bg-red-900/20 border-red-700/30",           icon: <AlertCircle size={11} /> },
};

function moeda(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export default function NfePage() {
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [modalCancel, setModalCancel] = useState<NotaFiscal | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [atualizandoLinks, setAtualizandoLinks] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    const qs = filtroStatus !== "todos" ? `?status=${filtroStatus}` : "";
    const res = await fetch(`/api/admin/nfe${qs}`, { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (d?.ok) setNotas(d.notas || []);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [filtroStatus]);

  async function cancelarNfe() {
    if (!modalCancel || !justificativa.trim()) return;
    setCancelando(true);
    const res = await fetch("/api/admin/nfe/cancelar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nfe_id: modalCancel.id, justificativa }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) { setModalCancel(null); setJustificativa(""); await carregar(); }
    else alert(d?.error || "Erro ao cancelar.");
    setCancelando(false);
  }

  async function atualizarLinks(nfe: NotaFiscal) {
    setAtualizandoLinks(nfe.id);
    const res = await fetch("/api/admin/nfe", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nfe_id: nfe.id }),
    });
    const d = await res.json().catch(() => null);
    if (d?.ok) await carregar();
    else alert(d?.error || "Erro ao buscar links.");
    setAtualizandoLinks(null);
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <FileText className="text-[#C9A66B]" size={26} />
            <div>
              <h1 className="text-2xl font-black italic uppercase">Notas <span className="text-[#C9A66B]">Fiscais</span></h1>
              <p className="text-zinc-500 text-xs">Histórico de NF-e emitidas via Bling</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {["todos","emitida","pendente","cancelada","erro"].map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)}
                className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${filtroStatus === s ? "bg-[#C9A66B] text-black border-[#C9A66B]" : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700"}`}>
                {s === "todos" ? "Todas" : s}
              </button>
            ))}
            <button onClick={() => carregar()} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : notas.length === 0 ? (
          <div className="text-center mt-20">
            <FileText size={40} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhuma nota fiscal encontrada.</p>
            <p className="text-zinc-700 text-xs mt-1">Emita NF-e na tela de Pedidos (status Pago)</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {notas.map(nfe => {
              const st = STATUS_CONFIG[nfe.status] || STATUS_CONFIG.pendente;
              return (
                <div key={nfe.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4 min-w-0">
                      {/* Status badge */}
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl border shrink-0 ${st.cor}`}>
                        {st.icon} {st.label}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          {nfe.numero_nfe && (
                            <span className="text-white font-black">NF-e Nº {nfe.numero_nfe}{nfe.serie ? `-${nfe.serie}` : ""}</span>
                          )}
                          <span className="text-zinc-500 text-xs">{new Date(nfe.created_at).toLocaleString("pt-BR")}</span>
                          {nfe.emitidor && <span className="text-[10px] text-zinc-600">por {nfe.emitidor.full_name}</span>}
                        </div>
                        {nfe.orders && (
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-sm text-zinc-300">{nfe.orders.profiles?.full_name}</span>
                            <span className="text-[#C9A66B] font-black text-sm">{moeda(nfe.orders.total)}</span>
                          </div>
                        )}
                        {nfe.chave_acesso && (
                          <p className="text-[9px] font-mono text-zinc-600 mt-1 break-all">{nfe.chave_acesso}</p>
                        )}
                        {nfe.status === "erro" && nfe.error_msg && (
                          <p className="text-[10px] text-red-400 mt-1">Erro: {nfe.error_msg}</p>
                        )}
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {nfe.pdf_url && (
                        <a href={nfe.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-blue-900/20 border border-blue-700/30 text-blue-300 hover:bg-blue-900/40 transition-all">
                          <ExternalLink size={12} /> DANFE
                        </a>
                      )}
                      {nfe.xml_url && (
                        <a href={nfe.xml_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-all">
                          <ExternalLink size={12} /> XML
                        </a>
                      )}
                      {nfe.status === "emitida" && !nfe.pdf_url && (
                        <button onClick={() => atualizarLinks(nfe)} disabled={atualizandoLinks === nfe.id}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-all disabled:opacity-40">
                          <RefreshCw size={12} className={atualizandoLinks === nfe.id ? "animate-spin" : ""} /> Links
                        </button>
                      )}
                      {nfe.status === "emitida" && (
                        <button onClick={() => { setModalCancel(nfe); setJustificativa(""); }}
                          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 hover:bg-red-900/40 transition-all">
                          <XCircle size={12} /> Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal cancelamento */}
      {modalCancel && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="font-black uppercase text-sm tracking-widest text-white">Cancelar NF-e Nº {modalCancel.numero_nfe}</h2>
            <p className="text-xs text-zinc-500">O cancelamento é irreversível e enviado diretamente à SEFAZ via Bling.</p>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Justificativa (mín. 15 caracteres) *</label>
              <textarea value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-red-500 resize-none"
                placeholder="Motivo do cancelamento..." />
              <p className="text-[10px] text-zinc-600 mt-1">{justificativa.length}/15 caracteres mínimos</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalCancel(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-400 font-black uppercase text-xs tracking-widest hover:bg-zinc-700">
                Voltar
              </button>
              <button onClick={cancelarNfe} disabled={cancelando || justificativa.length < 15}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
                {cancelando ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                {cancelando ? "Cancelando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
