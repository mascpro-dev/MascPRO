"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ArrowLeft, Loader2, ShoppingCart, Info, Plus, Minus, Package } from "lucide-react";
import Link from "next/link";
import { useCart } from "../CartContext"; 

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  const { addToCart } = useCart(); 
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function loadProduct() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          console.error(error);
        }
        
        setProduct(data);
      } finally {
        setLoading(false);
      }
    }
    if (id) loadProduct();
  }, [id, supabase]);

  // FUNÇÃO COMPRAR E VOLTAR
  const handleBuyAndReturn = () => {
    if (!product) return;
    
    // 1. Adiciona ao carrinho com a quantidade escolhida
    addToCart({ ...product, quantity });
    
    // 2. Volta para a tela de produtos automaticamente
    router.push('/catalago');
  };

  if (loading) return (
    <div className="h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-[#C9A66B]" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-20">
      <div className="text-center space-y-4">
        <p className="text-lg font-semibold">Produto não encontrado.</p>
        <button
          onClick={() => router.push("/catalago")}
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Voltar para o catálogo
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 selection:bg-[#C9A66B]/30">
      <div className="max-w-5xl mx-auto">
        
        {/* VOLTAR - TEXTO MENOR E MAIS DISCRETO */}
        <Link href="/catalago" className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 text-[9px] font-bold uppercase tracking-[0.2em] group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
            Catálogo
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          
          {/* IMAGEM COM BORDAS 'ELITE' (rounded-lg) */}
          <div className="aspect-square rounded-lg bg-zinc-900/50 border border-white/5 overflow-hidden shadow-2xl">
            {product?.image_url ? (
                <img src={product.image_url} className="w-full h-full object-cover" alt={product.title} />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-800"><Package size={40} /></div>
            )}
          </div>

          <div className="flex flex-col">
            <p className="text-[#C9A66B] text-[9px] font-black uppercase tracking-[0.4em] mb-3">MascPRO Elite</p>
            
            {/* TÍTULO AJUSTADO PARA MOBILE (text-xl) */}
            <h1 className="text-xl md:text-3xl font-bold tracking-tighter uppercase italic mb-6 leading-tight">
                {product?.title}
            </h1>

            <div className="flex flex-row lg:flex-col justify-between items-center lg:items-start gap-4 mb-8">
                <div className="space-y-1">
                    <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest">Preço Oficial</p>
                    <p className="text-2xl font-black text-white tracking-tighter">
                        R$ {Number(product?.price || 0).toFixed(2)}
                    </p>
                </div>

                {/* SELETOR DE QUANTIDADE COMPACTO */}
                <div className="space-y-2">
                    <p className="hidden lg:block text-zinc-500 text-[8px] font-bold uppercase tracking-widest text-right lg:text-left">Qtd</p>
                    <div className="flex items-center gap-3 bg-zinc-900 p-1 rounded-md border border-white/5">
                        <button 
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors"
                        >
                            <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-bold text-xs">{quantity}</span>
                        <button 
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* DESCRIÇÃO - COLUNA 'description' */}
            <div className="mb-10 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-[#C9A66B] text-[9px] font-black uppercase tracking-widest mb-4">
                    <Info size={12} /> Detalhes
                </div>
                <div className="text-zinc-400 text-xs md:text-sm leading-relaxed whitespace-pre-line">
                    {product?.description || "Informações técnicas indisponíveis."}
                </div>
            </div>

            {/* BOTÃO COMPRAR - FIXO NO FLUXO */}
            <button 
                onClick={handleBuyAndReturn}
                className="w-full bg-white text-black h-14 md:h-16 rounded-lg font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-[#C9A66B] transition-all active:scale-[0.98] shadow-2xl"
            >
                <ShoppingCart size={16} /> COMPRAR AGORA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
