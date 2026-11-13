"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  MapPin,
  MapPinned,
  BookOpen,
  Package,
  RefreshCw,
  ShoppingBag,
  Target,
  Users,
  X,
} from "lucide-react";
import ForcaEnviarCatalogo from "@/componentes/ForcaEnviarCatalogo";
import ForcaBaixarApp from "@/componentes/ForcaBaixarApp";
import { listarFilaPedido } from "@/lib/forcaFilaPedido";

type Dia = {
  usuario: string;
  papel?: string;
  aviso?: string | null;
  resumo: {
    planejadas: number;
    realizadas: number;
    pedidos: number;
    valor_confirmado: number;
  };
};

const OPCOES = [
  { href: "/forca/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/forca/visitas", label: "Visitas", icon: MapPin },
  { href: "/forca/clientes", label: "Clientes", icon: Users },
  { href: "/forca/rota", label: "Rota", icon: MapPinned },
  { href: "/forca/produtos", label: "Produtos", icon: Package },
  { href: "/forca/metas", label: "Metas", icon: Target },
  { href: "/forca/painel", label: "Painel", icon: BarChart3 },
];

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MeuDiaPage() {
  const [dia, setDia] = useState<Dia | null>(null);
  const [fila, setFila] = useState(0);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
    const lerFila = () => setFila(listarFilaPedido().length);
    lerFila();
    window.addEventListener("forca-fila", lerFila);
    return () => window.removeEventListener("forca-fila", lerFila);
  }, []);

  async function carregar() {
    setLoading(true);
    setErro("");
    const res = await fetch("/api/vendedor/forca/dia", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível sincronizar.");
    else setDia(d);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {dia?.aviso && <p className="text-sm text-amber-300">{dia.aviso}</p>}

      <div className="grid grid-cols-2 gap-2">
        <Resumo rotulo="Visitas hoje" valor={String(dia?.resumo.realizadas ?? 0)} />
        <Resumo rotulo="Na rota" valor={String(dia?.resumo.planejadas ?? 0)} />
        <Resumo rotulo="Pedidos hoje" valor={String(dia?.resumo.pedidos ?? 0)} />
        <Resumo rotulo="Confirmado" valor={moeda(dia?.resumo.valor_confirmado || 0)} />
      </div>

      {fila > 0 && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-200">
          {fila} pedido{fila === 1 ? "" : "s"} salvo{fila === 1 ? "" : "s"} neste celular. O envio acontece sozinho a cada 5 minutos, assim que a internet voltar.
        </p>
      )}

      <Link
        href="/forca/pedido"
        className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-sm font-black tracking-widest text-white"
      >
        <ShoppingBag size={18} />
        NOVO PEDIDO
      </Link>

      <div className="grid grid-cols-2 gap-2">
        <ForcaEnviarCatalogo classe="flex h-full w-full items-center justify-between gap-2 rounded-xl border border-[#C9A66B] bg-zinc-900 px-3 py-5 text-left text-sm font-black uppercase leading-tight tracking-wide text-[#C9A66B]" />
        <Link
          href="/forca/catalogo-tecnico"
          className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900 px-3 py-5"
        >
          <span className="text-sm font-black uppercase leading-tight tracking-wide">Catálogo técnico</span>
          <BookOpen size={18} className="shrink-0 text-zinc-400" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {OPCOES.map(({ href, label, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 px-4 py-5"
          >
            <span className="text-sm font-black tracking-wide">{label.toUpperCase()}</span>
            <Icon size={18} className="text-zinc-400" />
          </Link>
        ))}
        <Link
          href="/forca/painel"
          className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 px-4 py-5"
        >
          <span className="text-sm font-black tracking-wide">RELATÓRIOS</span>
          <ClipboardList size={18} className="text-zinc-400" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void carregar()}
          className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-4 text-sm font-black"
        >
          SINCRONIZAR
          <RefreshCw size={16} className="text-zinc-400" />
        </button>
        <Link
          href="/home"
          className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-4 text-sm font-black"
        >
          FECHAR
          <X size={16} className="text-zinc-400" />
        </Link>
      </div>
      <ForcaBaixarApp />
    </div>
  );
}

function Resumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/70 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{rotulo}</p>
      <p className="mt-1 text-lg font-black">{valor}</p>
    </div>
  );
}
