'use client';
import { useState } from 'react';
import { useCart } from './CartContext';

const WHATS_NUMBER = '5514991570389'; // WhatsApp para finalizar pedidos

export default function CartDrawer() {
  const { items, remove, clear, priceField } = useCart();
  const [open, setOpen] = useState(false);

  const total = items.reduce<number>(
    (acc, i) => acc + Number(i[priceField] ?? 0) * i.qty,
    0
  );

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

    clear();
    setOpen(false);
  };

  return (
    <>
      {/* FAB carrinho */}
      {items.length > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 bg-black text-white px-4 py-3 rounded-full shadow-lg z-40 hover:bg-gray-800 transition"
        >
          🛒 {items.length}
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-80 h-full p-6 flex flex-col relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* cabeçalho */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Meu carrinho</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-2xl leading-none hover:text-gray-600 transition"
              >
                ×
              </button>
            </div>

            {/* lista */}
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 flex-1">Carrinho vazio.</p>
            ) : (
              <>
                <ul className="space-y-3 flex-1 overflow-auto pr-2 max-h-[55vh]">
                  {items.map((i) => (
                    <li
                      key={i.id}
                      className="flex justify-between items-start text-sm"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{i.title || i.name || 'Produto'}</p>
                        <p className="text-xs text-gray-500">
                          {i.qty} × R$ {Number(i[priceField] ?? 0).toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => remove(i.id)}
                        className="text-red-500 text-xs hover:text-red-700 transition"
                      >
                        remover
                      </button>
                    </li>
                  ))}
                </ul>

                {/* total + CTA */}
                <div className="border-t pt-4 mt-4">
                  <p className="font-semibold mb-4">
                    Total: R$ {total.toFixed(2)}
                  </p>
                  <button
                    onClick={goWhats}
                    className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    Enviar pedido
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
