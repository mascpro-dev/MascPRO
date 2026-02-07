'use client';
import { useState } from 'react';
import { useCart } from './CartContext';

interface Props {
  product: any;
  priceField: string;
}

export default function ProductCard({ product, priceField }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <div className="relative h-52 md:h-[360px] w-full select-none group">
      {/* Imagem viva sem overlay permanentemente */}
      <img
        src={product.image_url}
        alt={product.name}
        className="h-full w-full object-cover rounded-xl"
      />

      {/* Texto no rodapé */}
      <div className="absolute inset-x-0 bottom-0 bg-black/60 rounded-b-xl p-3">
        <h3 className="text-white text-sm font-bold leading-tight">
          {product.name} {product.volume && `• ${product.volume}`}
        </h3>
        <div className="flex items-center justify-between mt-1">
          <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
            R$ {Number(product[priceField]).toFixed(2)}
          </span>

          {/* Botão abre seletor */}
          <button
            onClick={() => {
              const dialog = document.getElementById(product.id) as HTMLDialogElement;
              dialog?.showModal();
            }}
            className="text-xs bg-white text-black px-2 py-0.5 rounded hover:bg-gray-200"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Dialog nativo HTML para escolher quantidade */}
      <dialog id={product.id} className="rounded-xl p-6 backdrop:bg-black/40">
        <h4 className="font-semibold mb-4">{product.name}</h4>

        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-8 h-8 bg-gray-200 rounded-full text-xl"
          >−</button>
          <span className="text-lg font-bold">{qty}</span>
          <button
            onClick={() => setQty(qty + 1)}
            className="w-8 h-8 bg-gray-200 rounded-full text-xl"
          >+</button>
        </div>

        <button
          onClick={() => {
            add(product, qty);
            (document.getElementById(product.id) as HTMLDialogElement).close();
            setQty(1);
          }}
          className="w-full bg-black text-white py-2 rounded-lg"
        >
          Adicionar ao carrinho
        </button>
      </dialog>
    </div>
  );
}
