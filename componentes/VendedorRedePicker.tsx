"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, Users, X } from "lucide-react";

export type ContatoRedeVendedor = {
  id: string;
  tipo: "membro" | "lead";
  nome: string;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  profile_id: string | null;
  crm_lead_id: string | null;
};

type Props = {
  onSelect: (c: ContatoRedeVendedor) => void;
  selecionadoId?: string | null;
  placeholder?: string;
};

export default function VendedorRedePicker({
  onSelect,
  selecionadoId,
  placeholder = "Buscar na minha rede...",
}: Props) {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<ContatoRedeVendedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [aberto, setAberto] = useState(false);

  const carregar = useCallback(async (busca: string) => {
    setLoading(true);
    try {
      const url = `/api/vendedor/crm/rede${busca ? `?q=${encodeURIComponent(busca)}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.ok) setLista(d.contatos || []);
      else setLista([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (aberto || q.length >= 1) void carregar(q);
    }, 250);
    return () => clearTimeout(t);
  }, [q, aberto, carregar]);

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAberto(true);
          }}
          onFocus={() => {
            setAberto(true);
            if (!lista.length) void carregar(q);
          }}
          placeholder={placeholder}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-9 py-2 text-sm text-white outline-none focus:border-[#C9A66B] placeholder:text-zinc-600"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setAberto(false);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            aria-label="Limpar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {aberto && (
        <div className="absolute z-30 left-0 right-0 max-h-48 overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 shadow-xl">
          {loading && lista.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" /> Carregando rede...
            </p>
          ) : lista.length === 0 ? (
            <p className="px-3 py-2 text-xs text-zinc-500">
              Ninguém encontrado. Digite o nome manualmente abaixo ou cadastre no pipeline.
            </p>
          ) : (
            lista.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelect(c);
                  setQ(c.nome);
                  setAberto(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-zinc-900 border-b border-zinc-800/60 last:border-0 ${
                  selecionadoId === c.id ? "bg-[#C9A66B]/10" : ""
                }`}
              >
                <span className="text-sm text-white font-medium block truncate">{c.nome}</span>
                <span className="text-[10px] text-zinc-500">
                  {c.tipo === "membro" ? "Rede (cadastro)" : "Lead do pipeline"}
                  {c.cidade ? ` · ${c.cidade}` : ""}
                  {c.telefone ? ` · ${c.telefone}` : ""}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <p className="text-[10px] text-zinc-600 flex items-center gap-1">
        <Users size={11} /> Puxe da sua rede ou digite um cliente novo no campo Nome.
      </p>
    </div>
  );
}
