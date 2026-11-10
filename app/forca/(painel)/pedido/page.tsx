"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import CrmFechamentoPedidoModal from "@/componentes/CrmFechamentoPedidoModal";

type Lead = {
  id: string;
  nome: string | null;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  profile_id: string | null;
};

export default function PedidoPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [papel, setPapel] = useState("VENDEDOR");
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<Lead | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

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
      setPapel(d.papel || "VENDEDOR");
    }
    setLoading(false);
  }

  const termo = busca.trim().toLowerCase();
  const lista = useMemo(
    () =>
      leads.filter((l) => {
        if (!termo) return true;
        return [l.empresa, l.nome, l.cidade, l.telefone].join(" ").toLowerCase().includes(termo);
      }),
    [leads, termo]
  );

  return (
    <div className="space-y-4">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Força de vendas</p>
        <h1 className="text-2xl font-black">Novo pedido</h1>
        <p className="text-sm text-zinc-400">Escolha o salão. O pedido entra no mesmo faturamento do app.</p>
      </header>
      <Link href="/forca/clientes" className="inline-block text-xs font-black uppercase tracking-widest text-[#C9A66B]">
        Cadastrar cliente novo
      </Link>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar salão, cidade ou telefone"
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
      />
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : (
        <div className="space-y-2">
          {lista.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setEscolhido(l)}
              className="block w-full rounded-xl border border-white/10 px-3 py-3 text-left"
            >
              <p className="font-bold">{l.empresa || l.nome}</p>
              <p className="text-xs text-zinc-500">{[l.cidade, l.estado, l.telefone].filter(Boolean).join(" · ")}</p>
            </button>
          ))}
        </div>
      )}
      {escolhido && (
        <CrmFechamentoPedidoModal
          lead={{
            id: escolhido.id,
            nome: escolhido.empresa || escolhido.nome || "Salão",
            email: escolhido.email,
            telefone: escolhido.telefone,
            cidade: escolhido.cidade,
            estado: escolhido.estado,
            profile_id: escolhido.profile_id,
          }}
          variant={papel === "VENDEDOR" ? "vendedor" : "admin"}
          onClose={() => setEscolhido(null)}
          onConcluido={() => {
            setEscolhido(null);
            window.location.href = "/forca/pedidos";
          }}
        />
      )}
    </div>
  );
}
