"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import {
  analisarItensHomeCare,
  formatarResumoHomeCare,
  linhaEhHomeCare,
} from "@/lib/comercialHomeCare";

type Pedido = {
  id: string;
  profile_id: string;
  total: number;
  status: string;
  payment_method: string | null;
  shipping_cost?: number | null;
  shipping_cep?: string | null;
  shipping_address?: string | null;
  codigo_rastreio?: string | null;
  transportadora?: string | null;
  created_at: string;
  eh_kit_home_care?: boolean | null;
  profiles: { full_name: string | null; email?: string | null } | null;
  order_items: {
    quantidade: number;
    preco_unitario: number;
    products: { title: string; linha?: string | null } | null;
  }[];
};

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "paid", label: "Pagos" },
  { key: "separacao", label: "Separação" },
  { key: "despachado", label: "Despachados" },
  { key: "entregue", label: "Entregues" },
  { key: "cancelled", label: "Cancelados" },
] as const;

const STATUS_TOM: Record<string, string> = {
  novo: "bg-[#F3EEE6] text-[#8A847A]",
  pending: "bg-[#F3EEE6] text-[#8A847A]",
  paid: "bg-[#E8EEF6] text-[#3D5A80]",
  separacao: "bg-[#F5EDDF] text-[#8A6A32]",
  despachado: "bg-[#E7F0EA] text-[#4F7A5A]",
  entregue: "bg-[#E7F0EA] text-[#4F7A5A]",
  cancelled: "bg-[#F6E6E2] text-[#9A4338]",
};

const STATUS_LABEL: Record<string, string> = {
  novo: "Rascunho",
  pending: "Pendente",
  paid: "Pago",
  separacao: "Separação",
  despachado: "Despachado",
  entregue: "Entregue",
  cancelled: "Cancelado",
};

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataBr(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function noPeriodo(iso: string, ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(iso);
  return d.getFullYear() === y && d.getMonth() + 1 === m;
}

export default function ComercialPedidos({ periodo }: { periodo: string }) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [soMes, setSoMes] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");
    const res = await fetch(`/api/admin/orders/list?filtro=${filtro}&limit=300`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setErro(data?.error || "Falha ao carregar pedidos.");
      setPedidos([]);
    } else {
      setPedidos(data.pedidos || []);
    }
    setLoading(false);
  }, [filtro]);

  useEffect(() => { void carregar(); }, [carregar]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return pedidos.filter((p) => {
      if (soMes && !noPeriodo(p.created_at, periodo)) return false;
      if (!q) return true;
      const nome = p.profiles?.full_name || "";
      const itens = (p.order_items || []).map((i) => i.products?.title || "").join(" ");
      return `${nome} ${itens} ${p.id}`.toLowerCase().includes(q);
    });
  }, [pedidos, busca, soMes, periodo]);

  const total = visiveis.reduce((s, p) => s + Number(p.total || 0), 0);
  const totalHomeCare = visiveis.reduce(
    (s, p) => s + analisarItensHomeCare(p.order_items).valor,
    0
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFiltro(f.key)}
            className={`h-9 px-3 rounded-full text-[12px] border ${
              filtro === f.key ? "bg-[#EDE4D4] border-[#E7E1D6] text-[#2A2723]" : "bg-white border-[#E7E1D6] text-[#6B6560]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A39C90]" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente ou produto..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E7E1D6] bg-white text-[13px] outline-none focus:border-[#C9A66B]"
          />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-[#6B6560]">
          <input type="checkbox" checked={soMes} onChange={(e) => setSoMes(e.target.checked)} />
          Só o mês do seletor
        </label>
        <p className="text-[12px] text-[#8A847A] ml-auto">
          {visiveis.length} pedido(s) · {moeda(total)}
          {totalHomeCare > 0 ? ` · home care ${moeda(totalHomeCare)}` : ""}
        </p>
      </div>

      <p className="text-[12px] text-[#8A847A]">
        Home care é lido pelos itens (linhas Daily, Nutri, Repair, Scalp, Curls, Blond). Classifique em{" "}
        <strong className="text-[#6B6560]">Admin → Produtos</strong>. Align³ não entra.
      </p>

      {erro && <p className="text-[13px] text-[#9A4338]">{erro}</p>}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-[#C9A66B]" size={28} />
        </div>
      ) : visiveis.length === 0 ? (
        <section className="bg-white rounded-[22px] border border-[#E7E1D6] p-8 text-[13px] text-[#8A847A]">
          Nenhum pedido neste recorte.
        </section>
      ) : (
        <div className="space-y-3">
          {visiveis.map((p) => {
            const hc = analisarItensHomeCare(p.order_items);
            return (
              <article key={p.id} className="bg-white rounded-[22px] border border-[#E7E1D6] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold">{p.profiles?.full_name || "Sem cadastro"}</p>
                    <p className="text-[12px] text-[#8A847A] mt-0.5">
                      {dataBr(p.created_at)}
                      {p.payment_method ? ` · ${p.payment_method}` : ""}
                      {p.shipping_cep ? ` · CEP ${p.shipping_cep}` : ""}
                    </p>
                    {p.shipping_address && (
                      <p className="text-[12px] text-[#8A847A] mt-1 max-w-2xl">{p.shipping_address}</p>
                    )}
                    {(p.codigo_rastreio || p.transportadora) && (
                      <p className="text-[12px] text-[#6B6560] mt-1">
                        {p.transportadora || "Frete"} {p.codigo_rastreio ? `· ${p.codigo_rastreio}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[20px] font-semibold tabular-nums">{moeda(Number(p.total || 0))}</p>
                    <span className={`inline-flex mt-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${STATUS_TOM[p.status] || STATUS_TOM.pending}`}>
                      {STATUS_LABEL[p.status] || p.status}
                    </span>
                    {hc.temHomeCare && (
                      <p className="text-[10px] uppercase tracking-wider text-[#4F7A5A] mt-1">
                        Home care · {formatarResumoHomeCare(hc)}
                      </p>
                    )}
                  </div>
                </div>

                {(p.order_items || []).length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-[#F0EBE3] pt-3">
                    {p.order_items.map((item, i) => {
                      const ehHc = linhaEhHomeCare(item.products?.linha);
                      return (
                        <li
                          key={i}
                          className={`flex justify-between text-[13px] ${ehHc ? "text-[#4F7A5A]" : "text-[#6B6560]"}`}
                        >
                          <span>
                            {item.products?.title || "Produto"} × {item.quantidade}
                            {ehHc ? " · home care" : ""}
                          </span>
                          <span className="tabular-nums">{moeda(Number(item.preco_unitario) * Number(item.quantidade))}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
