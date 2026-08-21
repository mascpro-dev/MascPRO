"use client";
import { useCallback, useEffect, useState } from "react";
import ErroComVoltar from "@/componentes/ErroComVoltar";
import { Loader2, Plus, MapPin, FlaskConical, Package, PhoneCall } from "lucide-react";

type Visita = {
  id: string;
  tipo: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  cliente_cidade: string | null;
  data_visita: string;
  produtos_amostra: string | null;
  resultado: string | null;
  notas: string | null;
};

const TIPOS = [
  { value: "visita", label: "Visita" },
  { value: "demo", label: "Demonstração" },
  { value: "amostra", label: "Amostra" },
  { value: "followup", label: "Follow-up" },
];

const RESULTADOS = [
  { value: "", label: "—" },
  { value: "positivo", label: "Positivo" },
  { value: "neutro", label: "Neutro" },
  { value: "negativo", label: "Negativo" },
  { value: "reagendar", label: "Reagendar" },
];

export default function VendedorVisitasPage() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    tipo: "visita",
    cliente_nome: "",
    cliente_telefone: "",
    cliente_cidade: "",
    data_visita: new Date().toISOString().slice(0, 16),
    produtos_amostra: "",
    resultado: "",
    proximo_passo: "",
    notas: "",
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/vendedor/crm/visitas", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Falha ao carregar visitas.");
    else setVisitas(d.visitas || []);
    setLoading(false);
  }, []);

  useEffect(() => { void carregar(); }, [carregar]);

  async function registrar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setMsg("");
    const res = await fetch("/api/vendedor/crm/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        data_visita: new Date(form.data_visita).toISOString(),
        resultado: form.resultado || null,
      }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setMsg(d?.error || "Erro ao registrar.");
    else {
      setMsg("Visita registrada!");
      setForm((f) => ({
        ...f,
        cliente_nome: "",
        cliente_telefone: "",
        produtos_amostra: "",
        notas: "",
        proximo_passo: "",
      }));
      void carregar();
    }
    setSalvando(false);
  }

  const inputClass =
    "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]";

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
      </div>
    );
  }

  if (erro) {
    return <ErroComVoltar mensagem={erro} onVoltar={() => window.history.back()} rotuloVoltar="Voltar" />;
  }

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Campo</p>
        <h1 className="text-2xl font-black text-white">Relatório de visitas</h1>
        <p className="text-xs text-zinc-500 mt-1">Registre visitas, demos e amostras entregues ao cliente.</p>
      </div>

      <form onSubmit={registrar} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-xs font-black uppercase text-zinc-500 flex items-center gap-2">
          <Plus size={14} className="text-[#C9A66B]" /> Nova visita
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} className={inputClass}>
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Data/hora</label>
            <input type="datetime-local" value={form.data_visita} onChange={(e) => setForm((f) => ({ ...f, data_visita: e.target.value }))} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Cliente *</label>
            <input required value={form.cliente_nome} onChange={(e) => setForm((f) => ({ ...f, cliente_nome: e.target.value }))} className={inputClass} placeholder="Salão / cabeleireira" />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Telefone</label>
            <input value={form.cliente_telefone} onChange={(e) => setForm((f) => ({ ...f, cliente_telefone: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Cidade</label>
            <input value={form.cliente_cidade} onChange={(e) => setForm((f) => ({ ...f, cliente_cidade: e.target.value }))} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Produtos / amostras</label>
            <input value={form.produtos_amostra} onChange={(e) => setForm((f) => ({ ...f, produtos_amostra: e.target.value }))} className={inputClass} placeholder="Ex.: Máscara 50ml, Shampoo demo..." />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Resultado</label>
            <select value={form.resultado} onChange={(e) => setForm((f) => ({ ...f, resultado: e.target.value }))} className={inputClass}>
              {RESULTADOS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Próximo passo</label>
            <input value={form.proximo_passo} onChange={(e) => setForm((f) => ({ ...f, proximo_passo: e.target.value }))} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[10px] text-zinc-500 uppercase font-bold">Observações</label>
            <textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} rows={2} className={`${inputClass} resize-none`} />
          </div>
        </div>
        {msg && <p className="text-xs text-[#C9A66B]">{msg}</p>}
        <button type="submit" disabled={salvando} className="w-full bg-[#C9A66B] text-black font-black uppercase text-xs py-3 rounded-xl disabled:opacity-50">
          {salvando ? "Salvando..." : "Registrar visita"}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="text-xs font-black uppercase text-zinc-500">Histórico do mês ({visitas.length})</h2>
        {visitas.map((v) => (
          <div key={v.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-bold text-white">{v.cliente_nome}</p>
                <p className="text-[10px] text-[#C9A66B] uppercase font-black mt-0.5">{v.tipo}</p>
              </div>
              <span className="text-[10px] text-zinc-600">
                {new Date(v.data_visita).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
              {v.cliente_cidade && <span className="flex items-center gap-1"><MapPin size={12} />{v.cliente_cidade}</span>}
              {v.cliente_telefone && <span className="flex items-center gap-1"><PhoneCall size={12} />{v.cliente_telefone}</span>}
              {v.produtos_amostra && <span className="flex items-center gap-1"><Package size={12} />{v.produtos_amostra}</span>}
              {v.tipo === "demo" && <FlaskConical size={12} className="text-zinc-600" />}
            </div>
            {v.resultado && <p className="text-xs text-zinc-400 mt-2">Resultado: <strong>{v.resultado}</strong></p>}
            {v.notas && <p className="text-xs text-zinc-500 mt-1">{v.notas}</p>}
          </div>
        ))}
        {!visitas.length && <p className="text-zinc-600 text-sm">Nenhuma visita registrada neste mês.</p>}
      </div>
    </div>
  );
}
