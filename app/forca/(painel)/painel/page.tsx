"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Resumo = {
  visitas: number;
  pedidos: number;
  pedidos_confirmados: number;
  receita: number;
  clientes: number;
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PainelPage() {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [web, setWeb] = useState("/admin/crm/dashboard");
  const [usuario, setUsuario] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/vendedor/forca/painel", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir o painel.");
    else {
      setResumo(d.resumo);
      setPeriodo(d.periodo || "");
      setWeb(d.web || "/admin/crm/dashboard");
      setUsuario(d.usuario || "");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Força de vendas</p>
        <h1 className="text-2xl font-black">Painel</h1>
        <p className="text-sm text-zinc-400">{usuario} · {periodo}</p>
      </header>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : resumo && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Card rotulo="Visitas do mês" valor={String(resumo.visitas)} />
            <Card rotulo="Pedidos do mês" valor={String(resumo.pedidos)} />
            <Card rotulo="Confirmados" valor={String(resumo.pedidos_confirmados)} />
            <Card rotulo="Clientes novos" valor={String(resumo.clientes)} />
          </div>
          <div className="rounded-2xl border border-white/10 bg-zinc-900 px-4 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Receita confirmada</p>
            <p className="mt-1 text-3xl font-black">{moeda(resumo.receita)}</p>
            <p className="mt-2 text-xs text-zinc-500">Pago, em separação, despachado ou entregue. O mesmo pedido aparece no dashboard web.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-widest">
            <Link href="/forca/pedidos" className="rounded-xl border border-white/10 px-3 py-3 text-center">Pedidos</Link>
            <Link href="/forca/visitas" className="rounded-xl border border-white/10 px-3 py-3 text-center">Visitas</Link>
          </div>
          <Link href={web} className="block text-center text-xs font-black uppercase tracking-widest text-[#C9A66B]">
            Abrir o dashboard no computador
          </Link>
        </>
      )}
    </div>
  );
}

function Card({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{rotulo}</p>
      <p className="mt-1 text-2xl font-black">{valor}</p>
    </div>
  );
}
