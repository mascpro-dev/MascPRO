'use client';
import { useState } from 'react';
import { useCart } from './CartContext';

const WHATS_NUMBER = '5514991570389'; // WhatsApp para finalizar pedidos

export default function CartDrawer() {
  const { items, remove, clear, priceField } = useCart();
  const [open, setOpen] = useState(false);

  const total = items.reduce((acc: number, i: any) => {
    const unit = Number(i[priceField] ?? 0);
    return acc + unit * i.qty;
  }, 0 as number);

  const goWhats = () => {
    if (items.length === 0) return;
    
    const linhas = items.map(
      (i) =>
        `• ${i.title || i.name || 'Produto'} – ${i.qty} × R$ ${Number(i[priceField] ?? 0).toFixed(2)}`
    );
    const msg =
      `*Pedido MASC PRO*\n\n` +
      linhas.join('\n') +
      `\n\nTotal: R$ ${total.toFixed(2)}`;
    
    const url = `https://wa.me/${WHATS_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    /* --- créditos em PRO (exemplo) ---------------------------------
    // const moedasCliente = Math.floor(total / 2);
    // const moedasIndicador = Math.floor(total / 4); // 0,5 por R$2
    // chame uma função RPC no Supabase para registrar:
    // supabase.rpc('creditar_moedas', { cliente: moedasCliente, indicador: moedasIndicador });
    ------------------------------------------------------------------*/

    clear();
    setOpen(false);
  };

  return (
    <>
      {/* FAB carrinho */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 bg-black text-white px-4 py-3 rounded-full shadow-lg z-40"
      >
        🛒 {items.length}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-80 h-full p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* cabeçalho */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Meu carrinho</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* lista */}
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 flex-1">Carrinho vazio.</p>
            ) : (
              <>
                <ul className="space-y-3 flex-1 overflow-auto pr-2">
                  {items.map((i) => (
                    <li
                      key={i.id}
                      className="flex justify-between items-start text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-black">{i.title || i.name || 'Produto'}</p>
                        <p className="text-sm font-bold text-red-600">
                          {i.qty} × R$ {Number(i[priceField] ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(i.id)}
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
      )}
    </>
  );
}
