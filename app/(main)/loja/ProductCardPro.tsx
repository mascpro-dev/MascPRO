'use client';
import { useState } from 'react';
import { useCart } from './CartContext';

interface Props {
  product: any;
  priceField: string; // recebido da página
}

export default function ProductCardPro({ product, priceField }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const open = () =>
    (document.getElementById(`dlg-${product.id}`) as HTMLDialogElement).showModal();

  return (
    <div
      className="relative h-52 md:h-[340px] w-full select-none cursor-pointer"
      onClick={open}
    >
      {/* IMG */}
      <img src={product.image_url} alt={product.name}
           className="h-full w-full object-cover rounded-xl" />

      {/* ESTOQUE */}
      {product.stock > 0 && (
        <span className="absolute top-3 right-3 bg-white text-xs px-2 py-0.5 rounded shadow">
          {product.stock} un.
        </span>
      )}

      {/* RODAPÉ */}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 rounded-b-xl p-3">
        <h3 className="text-white text-sm font-semibold leading-tight truncate">
          {product.name}{product.volume && ` • ${product.volume}`}
        </h3>
        <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block">
          R$ {Number(product[priceField]).toFixed(2)}
        </span>
      </div>

      {/* DIALOG */}
      <dialog id={`dlg-${product.id}`} className="rounded-xl p-6 backdrop:bg-black/40">
        <h4 className="font-semibold mb-2 text-lg">{product.name}</h4>

        {product.description && <p className="text-sm mb-3">{product.description}</p>}
        {product.how_to_use && (
          <>
            <h5 className="font-semibold mb-1">Passo a passo</h5>
            <p className="text-sm text-gray-700 mb-4">{product.how_to_use}</p>
          </>
        )}

        {/* QUANTIDADE */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-8 h-8 bg-gray-200 rounded-full text-xl">−</button>
          <span className="text-lg font-bold">{qty}</span>
          <button onClick={() => setQty(qty + 1)}
                  className="w-8 h-8 bg-gray-200 rounded-full text-xl">+</button>
        </div>

        <button onClick={() => { add(product, qty); setQty(1); (document.getElementById(`dlg-${product.id}`) as HTMLDialogElement).close(); }}
                className="w-full bg-black text-white py-2 rounded-lg">
          Adicionar {qty} ao carrinho
        </button>
      </dialog>
    </div>
  );
}
