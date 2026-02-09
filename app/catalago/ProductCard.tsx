"use client";

import { ChevronRight, ShoppingCart, Package } from "lucide-react";
import Link from "next/link";
import { useCart } from "./CartContext";

interface ProductCardProps {
  product: any;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  // PREÇO ÚNICO (COLUNA PRICE) COM PONTO
  const displayPrice = `R$ ${Number(product.price || 0).toFixed(2)}`;

  return (
    <div className="group flex flex-col bg-zinc-900/40 border border-white/5 rounded-lg overflow-hidden hover:border-[#C9A66B]/50 transition-all duration-300">
      
      {/* IMAGEM */}
      <div className="aspect-square relative overflow-hidden bg-[#0a0a0a]">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-800">
            <Package size={24} />
          </div>
        )}
      </div>

      {/* CONTEÚDO */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-3 flex-1">
          <p className="text-[8px] font-black text-[#C9A66B] uppercase tracking-widest mb-1 opacity-70">
            {product.category || 'MascPRO'}
          </p>
          {/* NOME DO PRODUTO (Agora usando 'title') */}
          <h3 className="text-[11px] font-bold text-white uppercase tracking-tight leading-tight line-clamp-2">
            {product.title}
          </h3>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm font-black text-white tracking-tighter">
            {displayPrice}
          </p>

          <div className="flex gap-2">
            <button 
              onClick={() => addToCart(product)}
              className="flex-1 bg-white text-black h-8 rounded-md flex items-center justify-center gap-2 hover:bg-[#C9A66B] transition-colors active:scale-95"
            >
              <ShoppingCart size={12} />
              <span className="text-[9px] font-bold uppercase tracking-widest">COMPRAR</span>
            </button>

            <Link 
              href={`/catalago/${product.id}`} 
              className="w-8 h-8 border border-white/10 rounded-md flex items-center justify-center text-zinc-400 hover:text-white hover:border-white transition-all"
            >
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
