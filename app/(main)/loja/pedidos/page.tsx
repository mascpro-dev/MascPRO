"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import {
  Loader2,
  ShoppingBag,
  Truck,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type Pedido = {
  id: string;
  total: number;
  status: string;
  created_at: string;
};

type LabelInfo = { texto: string; cor: string; icon: React.ReactNode };

const LABELS: Record<string, LabelInfo> = {
  pending: {
    texto: "Aguardando pagamento",
    cor: "bg-zinc-800 text-zinc-300 border-zinc-700",
    icon: <Clock size={12} className="mr-1" />,
  },
  paid: {
    texto: "Pago · aguardando separação",
    cor: "bg-blue-900/40 text-blue-300 border-blue-700/60",
    icon: <CheckCircle2 size={12} className="mr-1" />,
  },
  separacao: {
    texto: "Em separação",
    cor: "bg-yellow-900/40 text-yellow-300 border-yellow-700/60",
    icon: <PackageCheck size={12} className="mr-1" />,
  },
  despachado: {
    texto: "Despachado",
    cor: "bg-emerald-900/40 text-emerald-300 border-emerald-700/60",
    icon: <Truck size={12} className="mr-1" />,
  },
  cancelled: {
    texto: "Cancelado",
    cor: "bg-red-900/40 text-red-300 border-red-700/60",
    icon: <XCircle size={12} className="mr-1" />,
  },
};

export default function MeusPedidosPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);

  useEffect(() => {
    async function carregar() {
      const { data: authData } = await supabase.auth.getSession();
      const session = authData.session;
      if (!session) {
        router.push("/login");
        return;
      }
      const { data: pedidosData } = await supabase
        .from("orders")
        .select("id, total, status, created_at")
        .eq("profile_id", session.user.id)
        .order("created_at", { ascending: false });
      setPedidos((pedidosData as Pedido[]) || []);
      setLoading(false);
    }
    carregar();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/20 flex items-center justify-center">
            <ShoppingBag className="text-[#C9A66B]" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Meus Pedidos</h1>
            <p className="text-xs text-zinc-500">
              Acompanhe o status de cada compra na Loja MascPRO.
            </p>
          </div>
        </div>

        {pedidos.length === 0 ? (
          <div className="mt-10 text-center text-zinc-500">
            <p className="font-bold">Você ainda não fez nenhum pedido.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pedidos.map((p) => {
              const info: LabelInfo = LABELS[p.status] || LABELS.pending;
              return (
                <div
                  key={p.id}
                  className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                      Pedido em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-lg font-black">
                      R${" "}
                      {Number(p.total).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-2">
                    <span
                      className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${info.cor}`}
                    >
                      {info.icon}
                      {info.texto}
                    </span>
                    {p.status === "despachado" && (
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                        Seu pedido já está a caminho!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
