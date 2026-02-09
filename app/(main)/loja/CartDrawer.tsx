'use client';
import { useCart } from './CartContext';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const WHATS_NUMBER = '5514991570389'; // WhatsApp para finalizar pedidos

export default function CartDrawer() {
  const { cart, removeFromCart, clearCart, isCartOpen, setIsCartOpen } = useCart();
  const [userLevel, setUserLevel] = useState('cabeleireiro');
  const supabase = createClientComponentClient();

  // Busca o nível do usuário para determinar qual campo de preço usar
  useEffect(() => {
    async function getUserLevel() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nível')
          .eq('id', session.user.id)
          .single();
        const level = (profile as any)?.nível?.toLowerCase()?.trim() || 'cabeleireiro';
        setUserLevel(level);
      }
    }
    getUserLevel();
  }, []);

  // Determina qual campo de preço usar baseado no nível
  const getPriceField = () => {
    if (userLevel === 'distribuidor') return 'price_distributor';
    if (userLevel === 'embaixador') return 'price_ambassador';
    return 'price_hairdresser';
  };

  const priceField = getPriceField();

  const total = cart.reduce((acc: number, item: any) => {
    const unit = Number(item[priceField] ?? 0);
    return acc + unit * (item.quantity || 1);
  }, 0);

  const goWhats = () => {
    if (cart.length === 0) return;
    
    const linhas = cart.map(
      (i: any) =>
        `• ${i.title || i.name || 'Produto'} – ${i.quantity || 1} × R$ ${Number(i[priceField] ?? 0).toFixed(2)}`
    );
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
    <div
      className="fixed inset-0 bg-black/50 z-50 flex justify-end"
      onClick={() => setIsCartOpen(false)}
    >
      <div
        className="bg-white w-80 h-full p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* cabeçalho */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Meu carrinho</h3>
          <button
            onClick={() => setIsCartOpen(false)}
            className="text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* lista */}
        {cart.length === 0 ? (
          <p className="text-sm text-gray-500 flex-1">Carrinho vazio.</p>
        ) : (
          <>
            <ul className="space-y-3 flex-1 overflow-auto pr-2">
              {cart.map((i: any) => (
                <li
                  key={i.id}
                  className="flex justify-between items-start text-sm"
                >
                  <div className="flex-1">
                    <p className="font-medium text-black">{i.title || i.name || 'Produto'}</p>
                    <p className="text-sm font-bold text-red-600">
                      {i.quantity || 1} × R$ {Number(i[priceField] ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => removeFromCart(i.id)}
                    className="text-red-500 text-xs"
                  >
                    remover
                  </button>
                </li>
              ))}
            </ul>

            {/* total + CTA */}
            <div className="border-t pt-4">
              <p className="font-extrabold mb-4 text-red-600 text-lg">
                Total: R$ {total.toFixed(2)}
              </p>
              <button
                onClick={goWhats}
                className="w-full bg-black text-white py-2 rounded-lg"
              >
                Finalizar pedido (WhatsApp)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
