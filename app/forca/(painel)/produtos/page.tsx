"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Produto = {
  id: string;
  title: string;
  linha: string | null;
  preco: number;
  preco_tabela: number;
  estoque_central: number;
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [busca, setBusca] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    const res = await fetch("/api/vendedor/forca/painel", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir os produtos.");
    else setProdutos(d.produtos || []);
    setLoading(false);
  }

  const termo = busca.trim().toLowerCase();
  const lista = produtos.filter((p) => !termo || `${p.title} ${p.linha || ""}`.toLowerCase().includes(termo));

  return (
    <div className="space-y-4">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Força de vendas</p>
        <h1 className="text-2xl font-black">Produtos</h1>
        <p className="text-sm text-zinc-400">Preço da tabela do distribuidor. Estoque mostrado é o central.</p>
      </header>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar produto"
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
      />
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : (
        <div className="space-y-2">
          {lista.map((p) => (
            <article key={p.id} className="rounded-xl border border-white/10 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{p.title}</p>
                  {p.linha && <p className="text-xs text-zinc-500">{p.linha}</p>}
                </div>
                <p className="font-black text-[#C9A66B]">{moeda(p.preco)}</p>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Estoque central {p.estoque_central}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
