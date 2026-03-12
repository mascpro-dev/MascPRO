"use client";
import { useState } from "react";
import { useCart } from "./CartContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { X, Plus, Minus, Trash2, CreditCard, Loader2 } from "lucide-react";

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, clearCart } = useCart();
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(false);

  const total = cart.reduce(
    (acc: number, i: any) => acc + (Number(i.displayPrice || i.price || 0) * (i.quantity || 1)),
    0
  );

  const handlePagar = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert("Faça login para continuar."); setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          userId: session.user.id,
          userEmail: session.user.email,
          userName: profile?.full_name || "",
          accessToken: session.access_token, // passa o token para o RLS funcionar
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.init_point) {
        alert(data.error || "Erro ao iniciar pagamento.");
        setLoading(false);
        return;
      }

      // Redireciona para o checkout do MercadoPago
      clearCart();
      setIsCartOpen(false);
      window.location.href = data.init_point;
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o gateway de pagamento.");
    } finally {
      setLoading(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Painel */}
      <div className="relative w-full max-w-md bg-[#0a0a0a] h-full shadow-2xl border-l border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-lg font-bold uppercase italic tracking-tighter">Seu Carrinho</h2>
          <button onClick={() => setIsCartOpen(false)}><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <p className="text-zinc-500 text-center py-10">Carrinho vazio.</p>
          ) : (
            cart.map((item: any) => (
              <div key={item.id} className="flex gap-4 bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                <img
                  src={item.image_url}
                  className="w-16 h-16 object-contain bg-white rounded-lg"
                  alt=""
                />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase mb-1">{item.title}</h4>
                  <p className="text-[#C9A66B] text-sm font-black mb-3">
                    R$ {Number(item.displayPrice || item.price || 0).toFixed(2)}
                  </p>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black rounded-lg p-1 border border-white/10">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:text-[#C9A66B]"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:text-[#C9A66B]"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-white/5 bg-zinc-900/20">
            <div className="flex justify-between mb-2">
              <span className="text-zinc-500 font-bold uppercase text-[10px]">Total do Pedido</span>
              <span className="text-xl font-black text-white">R$ {total.toFixed(2)}</span>
            </div>
            <p className="text-zinc-600 text-[10px] mb-5">
              Parcelamento em 2x ou mais: juros repassados ao comprador conforme tabela MP.
            </p>
            <button
              onClick={handlePagar}
              disabled={loading}
              className="w-full bg-[#009EE3] text-white h-14 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#007EC3] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <CreditCard size={18} />
                  PAGAR COM MERCADO PAGO
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
