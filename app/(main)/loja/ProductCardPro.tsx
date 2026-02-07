// app/(main)/loja/ProductCardPro.tsx
'use client';
import { useCart } from './CartContext';

interface Props {
  product: any;          // vem do Supabase
  priceField: string;    // passado pelo pai
}

export default function ProductCardPro({ product, priceField }: Props) {
  const { add } = useCart();

  return (
    <div
      className="relative h-[360px] w-full cursor-pointer group select-none"
      onClick={() => add(product)}
    >
      {/* Background image */}
      <img
        src={product.image_url}
        alt={product.name}
        className="h-full w-full object-cover rounded-xl group-hover:brightness-75 transition"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-black/40 rounded-xl" />

      {/* Top-left: categoria  */}
      <span className="absolute top-3 left-3 bg-black/60 text-xs text-white px-2 py-1 rounded">
        {product.category}
      </span>

      {/* Nome do produto */}
      <h3 className="absolute bottom-16 left-4 right-4 text-white font-bold text-lg leading-tight">
        {product.name}
      </h3>

      {/* Preço */}
      <span className="absolute bottom-8 left-4 bg-yellow-400 text-black text-sm font-bold px-3 py-1 rounded">
        R$ {Number(product[priceField]).toFixed(2)}
      </span>

      {/* CTA "Adicionar" (só aparece no hover no desktop) */}
      <button
        className="absolute bottom-3 right-3 bg-white/90 text-black text-xs font-semibold py-2 px-4 rounded opacity-0 group-hover:opacity-100 transition"
      >
        Adicionar →
      </button>
    </div>
  );
}
