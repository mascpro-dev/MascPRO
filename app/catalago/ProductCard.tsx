'use client';
import { useState } from 'react';
import { useCart } from './CartContext';

interface Props { product: any; }

export default function ProductCard({ product }: Props) {
  const { add } = useCart();
  const [qty, setQty] = useState(1);

  const open = () => {
    const dlg = document.getElementById(`dlg-${product.id}`) as HTMLDialogElement;
    dlg.showModal();
    // centraliza o diálogo no viewport atual
    dlg.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleAddToCart = () => {
    add(product, qty);
    setQty(1);
    // fecha o diálogo…
    const dlg = document.getElementById(`dlg-${product.id}`) as HTMLDialogElement;
    dlg.close();
    // …e faz o scroll voltar onde estava
    dlg.open = false;
  };

  return (
    <div
      className="relative h-52 md:h-[340px] w-full select-none cursor-pointer"
      onClick={open}
    >
      {/* imagem */}
      <img src={product.image_url} alt={product.title}
           className="h-full w-full object-cover rounded-xl" />

      {/* rodapé */}
      <div className="absolute inset-x-0 bottom-0 bg-black/70 rounded-b-xl p-3">
        <h3 className="text-white text-sm font-semibold leading-tight truncate">
          {product.title}{product.volume && ` • ${product.volume}`}
        </h3>
        <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded mt-1 inline-block">
          R$ {(product.price ?? 0).toFixed(2)}
        </span>
      </div>

      {/* dialog com info e adicionar ao carrinho */}
      <dialog id={`dlg-${product.id}`} className="rounded-xl p-6 backdrop:bg-black/40 w-[90%] md:w-[420px] relative">
        <button
          onClick={(e) => {
            const dlg = e.currentTarget.closest('dialog') as HTMLDialogElement;
            dlg?.close();
          }}
          className="absolute top-2 right-2 text-xl leading-none bg-gray-200/80 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-300 transition">
          ×
        </button>

        <h4 className="font-semibold mb-2 text-lg pr-8">{product.title}</h4>

        {product.description && <p className="text-sm mb-3">{product.description}</p>}
        {product.how_to_use && (
          <>
            <h5 className="font-semibold mb-1">Passo a passo</h5>
            <p className="text-sm text-gray-700 mb-4">{product.how_to_use}</p>
          </>
        )}

        {/* Seletor de quantidade */}
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQty(Math.max(1, qty - 1));
            }}
            className="w-8 h-8 bg-gray-200 rounded-full text-xl flex items-center justify-center hover:bg-gray-300 transition"
          >−</button>
          <span className="text-lg font-bold">{qty}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setQty(qty + 1);
            }}
            className="w-8 h-8 bg-gray-200 rounded-full text-xl flex items-center justify-center hover:bg-gray-300 transition"
          >+</button>
        </div>

        {/* Botão adicionar ao carrinho */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddToCart();
          }}
          className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition"
        >
          Adicionar ao carrinho
        </button>
      </dialog>
    </div>
  );
}
