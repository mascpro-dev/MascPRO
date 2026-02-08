'use client';
import { useCart } from './CartContext';
import { useState } from 'react';

export default function CartDrawer() {
  const { items, remove, clear, priceField } = useCart();
  const [open, setOpen] = useState(false);

  const total = items.reduce((acc, i) => acc + i[priceField] * i.qty, 0);

  return (
    <>
      {/* BOTÃO FLOTANTE */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 bg-black text-white px-4 py-3 rounded-full shadow-lg"
      >
        🛒 {items.length}
      </button>

      {/* DRAWER */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end"
             onClick={() => setOpen(false)}>
          <div className="bg-white w-80 h-full p-6 relative"
               onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-4">Meu carrinho</h3>

            {items.length === 0 ? (
              <p className="text-sm">Carrinho vazio.</p>
            ) : (
              <>
                <ul className="space-y-3 overflow-y-auto max-h-[55vh] pr-2">
                  {items.map((i) => (
                    <li key={i.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{i.name}</p>
                        <span className="text-xs text-gray-500">
                          {i.qty} × R$ {Number(i[priceField]).toFixed(2)}
                        </span>
                      </div>
                      <button onClick={() => remove(i.id)}
                              className="text-red-500 text-sm">remover</button>
                    </li>
                  ))}
                </ul>

                <div className="border-t pt-4 mt-4">
                  <p className="font-semibold mb-4">
                    Total: R$ {total.toFixed(2)}
                  </p>

                  <button
                    onClick={() => {
                      if (confirm('Enviar pedido?')) clear();
                      setOpen(false);
                    }}
                    className="w-full bg-black text-white py-2 rounded-lg">
                    Finalizar pedido
                  </button>
                </div>
              </>
            )}
            {/* fechar */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-2 right-2 text-xl leading-none">
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
