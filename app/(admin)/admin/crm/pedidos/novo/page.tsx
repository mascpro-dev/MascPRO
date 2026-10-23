"use client";

import { useState } from "react";
import Link from "next/link";
import AdminSidebar from "@/componentes/AdminSidebar";
import CrmNovoPedidoFlow from "@/componentes/CrmNovoPedidoFlow";
import { ArrowLeft, CheckCircle2, ShoppingBag } from "lucide-react";

export default function CrmNovoPedidoPage() {
  const [sucessoExtra, setSucessoExtra] = useState(false);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />

      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto">
        <div className="px-4 md:px-8 pt-16 md:pt-8 pb-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <Link
              href="/admin/crm"
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              aria-label="Voltar ao pipeline"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="flex items-center gap-3">
              <ShoppingBag className="text-blue-400" size={24} />
              <div>
                <h1 className="text-xl md:text-2xl font-black uppercase italic">
                  Novos <span className="text-[#C9A66B]">Pedidos</span>
                </h1>
                <p className="text-zinc-500 text-xs">
                  Distribuidor e admin · busca cliente · cadastro rápido · lança pedido
                </p>
              </div>
            </div>
          </div>

          {sucessoExtra && (
            <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              <CheckCircle2 size={16} className="shrink-0" />
              Pedido registrado. Você pode lançar outro abaixo.
            </div>
          )}

          <div className="mb-6 grid gap-3 sm:grid-cols-3 text-[11px]">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
              <p className="text-[#C9A66B] font-black uppercase tracking-widest text-[9px] mb-1">Passo 1</p>
              <p className="text-zinc-300">Busque o cliente pelo nome</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
              <p className="text-[#C9A66B] font-black uppercase tracking-widest text-[9px] mb-1">Passo 2</p>
              <p className="text-zinc-300">Se não existir, cadastre na hora</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3">
              <p className="text-[#C9A66B] font-black uppercase tracking-widest text-[9px] mb-1">Passo 3</p>
              <p className="text-zinc-300">Escolha produtos, pagamento e confirme</p>
            </div>
          </div>

          <CrmNovoPedidoFlow
            onFechou={() => {
              setSucessoExtra(true);
              window.setTimeout(() => setSucessoExtra(false), 5000);
            }}
          />

          <p className="mt-6 text-[10px] text-zinc-600">
            Clientes que já compraram abrem automaticamente uma{" "}
            <span className="text-zinc-400">nova compra</span> no pipeline — sem misturar com o pedido anterior.
          </p>
        </div>
      </main>
    </div>
  );
}
