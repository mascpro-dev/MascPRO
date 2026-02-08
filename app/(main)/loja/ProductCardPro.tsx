'use client';
import { useState } from 'react';
import { useCart } from './CartContext';

interface Props {
  product: any;          // registro vindo do Supabase
  priceField: string;    // price_hairdresser | _ambassador | _distributor | _consumer
}

export default function ProductCardPro({ product, priceField }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  return (
    <div className="relative h-52 md:h-[360px] w-full select-none group">
      {/* Imagem viva */}
      <img
        src={product.image_url}
        alt={product.name}
        className="h-full w-full object-cover rounded-xl"
      />

      {/* -------- BADGES -------- */}

      {/* Estoque */}
      {product.stock > 0 && (
        <span className="absolute top-3 right-3 bg-white text-xs px-2 py-0.5 rounded shadow">
          {product.stock} un.
        </span>
      )}

      {/* Chips de tecnologia (até 2) */}
      {product.tech_tags?.length > 0 && (
        <div className="absolute bottom-14 left-3 flex gap-1">
          {product.tech_tags.slice(0, 2).map((tag: string) => (
            <span
              key={tag}
              className="bg-white/90 text-[10px] px-1.5 py-0.5 rounded shadow"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* -------- RODAPÉ -------- */}
      <div className="absolute inset-x-0 bottom-0 bg-black/60 rounded-b-xl p-3">
        <h3 className="text-white text-sm font-bold leading-tight">
          {product.name}
          {product.volume && ` • ${product.volume}`}
        </h3>

        <div className="flex items-center justify-between mt-1">
          <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
            R$ {Number(product[priceField]).toFixed(2)}
          </span>

          <button
            onClick={() =>
              (document.getElementById(product.id) as HTMLDialogElement).showModal()
            }
            className="text-xs bg-white text-black px-2 py-0.5 rounded hover:bg-gray-200"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* -------- DIALOG DE QUANTIDADE -------- */}
      <dialog id={product.id} className="rounded-xl p-6 backdrop:bg-black/40">
        <h4 className="font-semibold mb-4">{product.name}</h4>

        {/* Modo de uso opcional */}
        {product.how_to_use && (
          <p className="text-sm text-gray-700 mb-4">{product.how_to_use}</p>
        )}

        {/* Seletor + / - */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-8 h-8 bg-gray-200 rounded-full text-xl"
          >
            −
          </button>
          <span className="text-lg font-bold">{qty}</span>
          <button
            onClick={() => setQty(qty + 1)}
            className="w-8 h-8 bg-gray-200 rounded-full text-xl"
          >
            +
          </button>
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
