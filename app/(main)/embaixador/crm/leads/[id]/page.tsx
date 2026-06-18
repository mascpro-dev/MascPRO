"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import CrmCadastrarMembroPanel from "@/componentes/CrmCadastrarMembroPanel";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";
import {
  ArrowLeft, Loader2, Pencil, Save, X,
  MessageCircle, Instagram, Mail, Calendar,
  FileText, PhoneCall, Clock, Tag, ShoppingBag,
} from "lucide-react";

type Atividade = {
  id: string;
  created_at: string;
  tipo: string;
  conteudo: string;
  autor: { full_name: string } | null;
};

type Lead = {
  id: string;
  nome: string;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  cidade: string | null;
  estado: string | null;
  status: string;
  origem: string;
  valor_estimado: number | null;
  data_followup: string | null;
  notas: string | null;
  profile_id: string | null;
  order_id: string | null;
  updated_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  novo: "Novo", contato_feito: "Contato feito", proposta: "Proposta",
  negociacao: "Negociação", fechado: "Fechado", perdido: "Perdido",
};

const TIPO_ATIVIDADE: Record<string, { icon: React.ReactNode; cor: string }> = {
  criacao: { icon: <Tag size={13} />, cor: "text-zinc-400" },
  nota: { icon: <FileText size={13} />, cor: "text-blue-400" },
  contato: { icon: <PhoneCall size={13} />, cor: "text-green-400" },
  followup: { icon: <Clock size={13} />, cor: "text-yellow-400" },
  status_change: { icon: <Tag size={13} />, cor: "text-purple-400" },
};

function dataHora(d: string) {
  return new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function EmbaixadoraLeadDetalhePage() {
  const params = useParams();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  const [novaAtv, setNovaAtv] = useState("");
  const [modalPedido, setModalPedido] = useState(false);

  const carregar = useCallback(async () => {
    const res = await fetch(`/api/embaixador/crm/leads/${id}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErro(data?.error || "Lead não encontrado.");
      setLoading(false);
      return;
    }
    setLead(data.lead);
    setAtividades(data.atividades || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { void carregar(); }, [carregar]);

  function abrirEditar() {
    if (!lead) return;
    setForm({
      nome: lead.nome || "",
      telefone: lead.telefone || "",
      email: lead.email || "",
      instagram: lead.instagram || "",
      cidade: lead.cidade || "",
      estado: lead.estado || "",
      notas: lead.notas || "",
      data_followup: lead.data_followup ? lead.data_followup.slice(0, 10) : "",
      valor_estimado: lead.valor_estimado != null ? String(lead.valor_estimado) : "",
    });
    setEditando(true);
  }

  async function salvar() {
    setSalvando(true);
    const res = await fetch(`/api/embaixador/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        valor_estimado: form.valor_estimado ? parseFloat(form.valor_estimado.replace(",", ".")) : null,
        data_followup: form.data_followup || null,
      }),
    });
    const d = await res.json().catch(() => null);
    if (res.ok && d?.ok) {
      setLead(d.lead);
      setEditando(false);
      void carregar();
    }
    setSalvando(false);
  }

  async function adicionarNota() {
    if (!novaAtv.trim()) return;
    const res = await fetch(`/api/embaixador/crm/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas: `${lead?.notas || ""}\n[${new Date().toLocaleDateString("pt-BR")}] ${novaAtv}`.trim() }),
    });
    if (res.ok) {
      setNovaAtv("");
      void carregar();
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    );
  }

  if (erro || !lead) {
    return (
      <ErroComVoltar
        mensagem={erro || "Lead não encontrado."}
        onVoltar={() => window.history.back()}
        rotuloVoltar="Voltar ao pipeline"
      />
    );
  }

  const inputClass = "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-purple-500";

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <Link
        href="/embaixador/crm"
        className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-purple-300 text-xs font-bold uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Pipeline
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-purple-400/80 mb-1">
            {STATUS_LABEL[lead.status] || lead.status}
          </p>
          <h1 className="text-2xl font-black text-white">{lead.nome}</h1>
          {lead.order_id && (
            <p className="text-xs text-zinc-500 mt-1 font-mono">
              Pedido vinculado #{lead.order_id.slice(0, 8)}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {!editando ? (
            <button
              type="button"
              onClick={abrirEditar}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-white"
            >
              <Pencil size={14} /> Editar
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setEditando(false)} className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-500">
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-black uppercase tracking-widest disabled:opacity-50"
              >
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setModalPedido(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300 text-xs font-black uppercase tracking-widest hover:bg-purple-600/30"
          >
            <ShoppingBag size={14} />
            {lead.status === "fechado" ? "Novo pedido" : "Pedido da rede"}
          </button>
        </div>
      </div>

      {!lead.profile_id && (
        <CrmCadastrarMembroPanel
          leadId={lead.id}
          nome={lead.nome}
          emailInicial={lead.email}
          apiBase="/api/embaixador/crm"
          permitirTipoMembro
          accent="purple"
          onCadastrado={() => void carregar()}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {editando ? (
          <div className="md:col-span-2 space-y-3 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            {(["nome", "telefone", "email", "instagram", "cidade", "estado"] as const).map((k) => (
              <div key={k}>
                <label className="text-[10px] uppercase text-zinc-500 font-bold">{k}</label>
                <input value={form[k] || ""} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className={inputClass} />
              </div>
            ))}
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold">Follow-up</label>
              <input type="date" value={form.data_followup || ""} onChange={(e) => setForm((f) => ({ ...f, data_followup: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className="text-[10px] uppercase text-zinc-500 font-bold">Notas</label>
              <textarea value={form.notas || ""} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} rows={3} className={`${inputClass} resize-none`} />
            </div>
          </div>
        ) : (
          <>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500">Contato</h2>
              {lead.telefone && (
                <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`} className="flex items-center gap-2 text-sm text-green-400">
                  <MessageCircle size={14} /> {lead.telefone}
                </a>
              )}
              {lead.email && (
                <p className="flex items-center gap-2 text-sm text-zinc-300"><Mail size={14} className="text-zinc-500" /> {lead.email}</p>
              )}
              {lead.instagram && (
                <p className="flex items-center gap-2 text-sm text-pink-400"><Instagram size={14} /> {lead.instagram}</p>
              )}
              {(lead.cidade || lead.estado) && (
                <p className="text-sm text-zinc-400">{[lead.cidade, lead.estado].filter(Boolean).join(" / ")}</p>
              )}
              {lead.data_followup && (
                <p className="flex items-center gap-2 text-sm text-zinc-400">
                  <Calendar size={14} /> Follow-up: {new Date(lead.data_followup + "T12:00:00").toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
            {lead.notas && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Notas</h2>
                <p className="text-sm text-zinc-400 whitespace-pre-wrap">{lead.notas}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
        <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4">Histórico</h2>
        <div className="flex gap-2 mb-4">
          <input
            value={novaAtv}
            onChange={(e) => setNovaAtv(e.target.value)}
            placeholder="Adicionar nota rápida..."
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={adicionarNota}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-xs font-bold uppercase text-zinc-300 hover:bg-zinc-700"
          >
            +
          </button>
        </div>
        <ul className="space-y-3 max-h-80 overflow-y-auto">
          {atividades.map((a) => {
            const cfg = TIPO_ATIVIDADE[a.tipo] || TIPO_ATIVIDADE.nota;
            return (
              <li key={a.id} className="flex gap-3 text-sm border-b border-zinc-800/50 pb-3 last:border-0">
                <span className={cfg.cor}>{cfg.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-300">{a.conteudo}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">
                    {dataHora(a.created_at)}
                    {a.autor?.full_name ? ` · ${a.autor.full_name}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {modalPedido && (
        <CrmFechamentoPedidoModal
          variant="embaixadora"
          apiBase="/api/embaixador/crm"
          lead={{
            id: lead.id,
            nome: lead.nome,
            email: lead.email,
            telefone: lead.telefone,
            cidade: lead.cidade,
            estado: lead.estado,
            profile_id: lead.profile_id,
          }}
          onClose={() => setModalPedido(false)}
          onConcluido={() => { setModalPedido(false); void carregar(); }}
          onNovaCompra={() => void carregar()}
        />
      )}
    </div>
  );
}
