"use client";
import { useCart } from "./CartContext";
import { X, Plus, Minus, Trash2 } from "lucide-react";

const WHATS_NUMBER = '5514991570389'; // WhatsApp para finalizar pedidos

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, clearCart } = useCart();

  const goWhats = () => {
    if (cart.length === 0) return;
    
    const linhas = cart.map(
      (i: any) =>
        `• ${i.title || i.name || 'Produto'} – ${i.quantity || 1} × R$ ${Number(i.price || 0).toFixed(2)}`
    );
    const total = cart.reduce((acc: number, i: any) => acc + (Number(i.price || 0) * i.quantity), 0);
    const msg =
      `*Pedido MASC PRO*\n\n` +
      linhas.join('\n') +
      `\n\nTotal: R$ ${total.toFixed(2)}`;
    
    const url = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    clearCart();
    setIsCartOpen(false);
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      
      {/* Conteúdo do Carrinho */}
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
                <img src={item.image_url} className="w-16 h-16 object-contain bg-white rounded-lg" alt="" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase mb-1">{item.title}</h4>
                  <p className="text-[#C9A66B] text-sm font-black mb-3">R$ {Number(item.price || 0).toFixed(2)}</p>
                  
                  {/* CONTROLE DE QUANTIDADE DENTRO DO CARRINHO */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black rounded-lg p-1 border border-white/10">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-[#C9A66B]"><Minus size={14} /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-[#C9A66B]"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer com Total e Botão */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-white/5 bg-zinc-900/20">
            <div className="flex justify-between mb-6">
              <span className="text-zinc-500 font-bold uppercase text-[10px]">Total do Pedido</span>
              <span className="text-xl font-black text-white">
                R$ {cart.reduce((acc: number, i: any) => acc + (Number(i.price || 0) * i.quantity), 0).toFixed(2)}
              </span>
            </div>
            <button 
              onClick={goWhats}
              className="w-full bg-[#C9A66B] text-black h-14 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-white transition-all"
            >
              Finalizar no WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
