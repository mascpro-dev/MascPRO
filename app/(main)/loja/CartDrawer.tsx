'use client';
import { useState } from 'react';
import { useCart } from './CartContext';

export default function CartDrawer() {
  const { items, remove, clear, priceField } = useCart();
  const [open, setOpen] = useState(false);

  // ------- TOTAL COM TIPAGEM EXPLÍCITA -------
  const total = items.reduce<number>((acc: number, i: any) => {
    const unit = Number(i[priceField] ?? 0);
    return acc + unit * i.qty;
  }, 0);

  return (
    <>
      {/* BOTÃO FLOANTE */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 bg-black text-white px-4 py-3 rounded-full shadow-lg z-40"
      >
        🛒 {items.length}
      </button>

      {/* DRAWER */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex justify-end"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-80 h-full p-6 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* FECHAR */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-2xl"
            >
              ×
            </button>

            <h3 className="font-bold text-lg mb-4">Meu carrinho</h3>

            {items.length === 0 ? (
              <p className="text-sm">Carrinho vazio.</p>
            ) : (
              <>
                <ul className="space-y-3">
                  {items.map((i) => (
                    <li key={i.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">{i.title}</p>
                        <span className="text-xs text-gray-500">
                          {i.qty} × R$ {Number(i[priceField]).toFixed(2)}
                        </span>
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

                <div className="border-t pt-4 mt-4">
                  <p className="font-semibold mb-4">
                    Total: R$ {total.toFixed(2)}
                  </p>

                  <button
                    onClick={() => {
                      if (confirm('Enviar pedido?')) clear();
                      setOpen(false);
                    }}
                    className="w-full bg-black text-white py-2 rounded-lg"
                  >
                    Finalizar pedido
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
