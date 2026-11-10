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
  perfil_comercial: string | null;
  relacionamento: string | null;
  proxima_acao: string | null;
};

type Cadastro = {
  id: string;
  full_name: string | null;
  whatsapp: string | null;
  city: string | null;
  municipio: string | null;
  uf: string | null;
  state: string | null;
  role: string | null;
};

export default function CarteiraPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cadastros, setCadastros] = useState<Cadastro[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [papel, setPapel] = useState("");
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [abrindo, setAbrindo] = useState("");

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/vendedor/forca/carteira", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir a carteira.");
    else {
      setLeads(d.leads || []);
      setCadastros(d.cadastros || []);
      setAviso(d.aviso || null);
      setPapel(d.papel || "");
    }
    setLoading(false);
  }

  async function venderCadastro(profileId: string) {
    setAbrindo(profileId);
    setErro("");
    const res = await fetch("/api/vendedor/forca/carteira", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: profileId }),
    });
    const d = await res.json().catch(() => null);
    setAbrindo("");
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Não foi possível abrir este cadastro.");
      return;
    }
    window.location.href = `/forca/visita/${d.lead_id}`;
  }

  const termo = busca.trim().toLowerCase();
  const saloes = useMemo(
    () =>
      leads.filter((l) => {
        if (!termo) return true;
        return [l.empresa, l.nome, l.cidade, l.telefone].join(" ").toLowerCase().includes(termo);
      }),
    [leads, termo]
  );
  const membros = useMemo(
    () =>
      cadastros.filter((c) => {
        if (!termo) return true;
        return [c.full_name, c.city, c.municipio, c.whatsapp].join(" ").toLowerCase().includes(termo);
      }),
    [cadastros, termo]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Força de vendas</p>
        <h1 className="text-2xl font-black">Carteira</h1>
        <p className="text-sm text-zinc-400">
          {papel === "DISTRIBUIDOR"
            ? "Salões e cadastros da sua região."
            : papel === "ADMIN"
              ? "Todos os salões."
              : "Salões atribuídos a você."}
        </p>
      </header>
      {aviso && <p className="text-sm text-amber-300">{aviso}</p>}
      {erro && <p className="text-sm text-red-400">{erro}</p>}
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
              {[l.cidade, l.estado].filter(Boolean).join("/")}
              {l.telefone ? ` · ${l.telefone}` : ""}
            </p>
            {l.proxima_acao && <p className="text-xs text-[#C9A66B]">{l.proxima_acao}</p>}
          </Link>
        ))}
      </section>
      {papel !== "VENDEDOR" && (
        <section className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Cadastros da região · {membros.length}
          </p>
          {membros.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void venderCadastro(c.id)}
              className="block w-full rounded-xl border border-white/10 px-3 py-3 text-left"
            >
              <p className="font-bold">{c.full_name || "Cadastro"}</p>
              <p className="text-xs text-zinc-500">
                {[c.city || c.municipio, c.uf || c.state].filter(Boolean).join("/")}
                {c.whatsapp ? ` · ${c.whatsapp}` : ""}
              </p>
              <p className="text-xs text-[#C9A66B]">{abrindo === c.id ? "Abrindo..." : "Vender"}</p>
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
