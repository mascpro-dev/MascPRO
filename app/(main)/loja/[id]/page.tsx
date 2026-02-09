"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ArrowLeft, Loader2, ShoppingCart, Info, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { CartProvider, useCart } from "../CartContext";
import CartDrawer from "../CartDrawer";

function ProductDetailContent() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();
  const { addToCart, setIsCartOpen } = useCart(); 
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [userLevel, setUserLevel] = useState('cabeleireiro');

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('nível').eq('id', session.user.id).single();
        setUserLevel((profile as any)?.nível?.toLowerCase()?.trim() || 'cabeleireiro');
      }
      const { data: productData } = await supabase.from('products').select('*').eq('id', id).single();
      setProduct(productData);
      setLoading(false);
    }
    loadData();
  }, [id, supabase]);

  const getPrice = () => {
    if (!product) return 0;
    if (userLevel === 'distribuidor') return Number(product.price_distributor || 0);
    if (userLevel === 'embaixador') return Number(product.price_ambassador || 0);
    return Number(product.price_hairdresser || 0);
  };

  const finalPrice = getPrice();

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;
  if (!product) return <div className="text-white text-center p-20">Produto não encontrado.</div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/loja" className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 text-[10px] font-bold uppercase tracking-widest group">
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="aspect-square rounded-xl bg-[#F5F5F7] p-6 border border-white/5 overflow-hidden flex items-center justify-center">
            <img src={product.image_url} className="w-full h-full object-contain" alt={product.title} />
          </div>

          <div className="flex flex-col">
            <p className="text-[#C9A66B] text-[10px] font-black uppercase tracking-[0.4em] mb-2">MascPRO Professional</p>
            {/* Título Semi Bold aqui também para combinar */}
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tighter uppercase italic mb-6 leading-tight">
                {product.title}
            </h1>

            <div className="flex items-center justify-between mb-8 p-5 bg-zinc-900/50 rounded-xl border border-white/5">
                <div>
                    <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest mb-1">Preço ({userLevel})</p>
                    <p className="text-3xl font-black text-[#C9A66B] tracking-tighter">R$ {finalPrice.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3 bg-black p-1 rounded-lg border border-white/10">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded"><Minus size={14} /></button>
                    <span className="w-6 text-center font-bold text-sm">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded"><Plus size={14} /></button>
                </div>
            </div>

            <div className="mb-10 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-white text-[10px] font-black uppercase tracking-widest mb-4">
                    <Info size={14} className="text-[#C9A66B]" /> Descrição Técnica
                </div>
                <div className="text-zinc-400 text-sm leading-relaxed whitespace-pre-line">
                    {product.description || "Descrição em breve."}
                </div>
            </div>

            <button 
                onClick={() => { addToCart({ ...product, quantity }); setIsCartOpen(true); router.push('/loja'); }}
                className="w-full bg-white text-black h-14 md:h-16 rounded-xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-[#C9A66B] transition-all active:scale-[0.98] shadow-2xl"
            >
                <ShoppingCart size={18} /> ADICIONAR AO CARRINHO
            </button>
          </div>
        </div>
      </div>
      
      {/* CARRINHO LATERAL */}
      <CartDrawer />
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <CartProvider>
      <ProductDetailContent />
    </CartProvider>
  );
}
