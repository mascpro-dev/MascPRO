"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type Pedido = {
  id: string;
  total: number;
  status: string;
  created_at: string;
  cliente: string;
};

const STATUS: Record<string, string> = {
  pending: "Aguardando pagamento",
  paid: "Pago",
  separacao: "Em separação",
  despachado: "Despachado",
  entregue: "Entregue",
  cancelled: "Cancelado",
  canceled: "Cancelado",
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    const res = await fetch("/api/vendedor/forca/painel", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (!res.ok || !d?.ok) setErro(d?.error || "Não foi possível abrir os pedidos.");
    else setPedidos(d.pedidos || []);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
        <Link href="/forca/pedido" className="text-xs font-black uppercase tracking-widest text-emerald-400">Novo</Link>
      </div>
      {erro && <p className="text-sm text-red-400">{erro}</p>}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#C9A66B]" /></div>
      ) : (
        <div className="space-y-2">
          {pedidos.length === 0 && <p className="text-sm text-zinc-500">Nenhum pedido neste mês.</p>}
          {pedidos.map((p) => (
            <Link key={p.id} href={`/forca/pedidos/${p.id}`} className="block rounded-xl border border-white/10 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">{p.cliente}</p>
                <p className="font-black">{moeda(Number(p.total || 0))}</p>
              </div>
              <p className="text-xs text-zinc-500">
                {STATUS[p.status] || p.status} · {new Date(p.created_at).toLocaleDateString("pt-BR")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
