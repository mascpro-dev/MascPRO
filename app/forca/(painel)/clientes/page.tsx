"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type Lead = {
  id: string;
  nome: string | null;
  empresa: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  bairro: string | null;
};

type Cadastro = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  city: string | null;
  municipio: string | null;
  uf: string | null;
  state: string | null;
};

const VAZIO = { nome: "", telefone: "", cidade: "", estado: "", endereco: "", bairro: "" };

export default function ClientesPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cadastros, setCadastros] = useState<Cadastro[]>([]);
  const [papel, setPapel] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState(VAZIO);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/vendedor/forca/carteira", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir os clientes.");
    else {
      setLeads(d.leads || []);
      setCadastros(d.cadastros || []);
      setPapel(d.papel || "");
      setAviso(d.aviso || null);
      if (d.papel === "DISTRIBUIDOR" && d.uf) setForm((atual) => ({ ...atual, estado: atual.estado || d.uf }));
    }
    setLoading(false);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    const res = await fetch("/api/vendedor/forca/carteira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const d = await res.json().catch(() => null);
    setSalvando(false);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Não foi possível cadastrar.");
      return;
    }
    window.location.href = `/forca/visita/${d.lead_id}`;
  }

  async function venderCadastro(profileId: string) {
    setErro("");
    const res = await fetch("/api/vendedor/forca/carteira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Não foi possível abrir este cadastro.");
      return;
    }
    window.location.href = `/forca/visita/${d.lead_id}`;
  }

  const termo = busca.trim().toLowerCase();
  const saloes = useMemo(
    () => leads.filter((l) => !termo || [l.empresa, l.nome, l.cidade, l.telefone, l.bairro].join(" ").toLowerCase().includes(termo)),
    [leads, termo]
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
        <button type="button" onClick={() => setAberto((v) => !v)} className="text-xs font-black uppercase tracking-widest text-emerald-400">
          {aberto ? "Fechar" : "Novo"}
        </button>
      </div>
      {aviso && <p className="text-sm text-amber-300">{aviso}</p>}
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {aberto && (
        <form onSubmit={(e) => void salvar(e)} className="space-y-2 rounded-2xl border border-white/10 p-3">
          <Campo rotulo="Salão" value={form.nome} onChange={(nome) => setForm({ ...form, nome })} />
          <Campo rotulo="Telefone" value={form.telefone} onChange={(telefone) => setForm({ ...form, telefone })} />
          <Campo rotulo="Cidade" value={form.cidade} onChange={(cidade) => setForm({ ...form, cidade })} />
          <Campo rotulo="UF" value={form.estado} onChange={(estado) => setForm({ ...form, estado })} />
          <Campo rotulo="Rua" value={form.endereco} onChange={(endereco) => setForm({ ...form, endereco })} />
          <Campo rotulo="Bairro" value={form.bairro} onChange={(bairro) => setForm({ ...form, bairro })} />
          <button type="submit" disabled={salvando} className="w-full rounded-xl bg-[#C9A66B] py-3 text-sm font-black text-black disabled:opacity-40">
            {salvando ? "Salvando..." : "Cadastrar"}
          </button>
        </form>
      )}

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar nome, cidade ou telefone"
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
      />

      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Salões · {saloes.length}</p>
        {saloes.map((l) => (
          <Link key={l.id} href={`/forca/visita/${l.id}`} className="block rounded-xl border border-white/10 px-3 py-3">
            <p className="font-bold">{l.empresa || l.nome}</p>
            <p className="text-xs text-zinc-500">
              {[l.endereco, l.bairro, l.cidade, l.estado].filter(Boolean).join(" · ")}
              {l.telefone ? ` · ${l.telefone}` : ""}
            </p>
          </Link>
        ))}
      </section>

      {papel !== "VENDEDOR" && (
        <section className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cadastros da região · {cadastros.length}</p>
          {cadastros
            .filter((c) => !termo || [c.full_name, c.city, c.municipio, c.whatsapp].join(" ").toLowerCase().includes(termo))
            .map((c) => (
              <button key={c.id} type="button" onClick={() => void venderCadastro(c.id)} className="block w-full rounded-xl border border-white/10 px-3 py-3 text-left">
                <p className="font-bold">{c.full_name || "Cadastro"}</p>
                <p className="text-xs text-zinc-500">
                  {[c.city || c.municipio, c.uf || c.state].filter(Boolean).join("/")}
                  {c.whatsapp ? ` · ${c.whatsapp}` : ""}
                </p>
                <p className="text-xs text-[#C9A66B]">Vender</p>
              </button>
            ))}
        </section>
      )}
    </div>
  );
}

function Campo({ rotulo, value, onChange }: { rotulo: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{rotulo}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm" />
    </label>
  );
}
