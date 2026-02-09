"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ShoppingBag, Loader2, ChevronRight, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { CartProvider, useCart } from "./CartContext";
import CartDrawer from "./CartDrawer";

function LojaContent() {
  const supabase = createClientComponentClient();
  const { addToCart, setIsCartOpen } = useCart();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState('cabeleireiro');

  useEffect(() => {
    async function loadStore() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase.from('profiles').select('nível').eq('id', session.user.id).single();
          setUserLevel((profile as any)?.nível?.toLowerCase()?.trim() || 'cabeleireiro');
        }
        const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        setProducts(productsData || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadStore();
  }, []);

  const getDisplayPrice = (product: any) => {
    let price = 0;
    if (userLevel === 'distribuidor') price = Number(product.price_distributor || 0);
    else if (userLevel === 'embaixador') price = Number(product.price_ambassador || 0);
    else price = Number(product.price_hairdresser || 0);
    return `R$ ${price.toFixed(2)}`;
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter italic uppercase text-white">
              MascPRO <span className="text-[#C9A66B]">LOJA</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Tabela: {userLevel}</p>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="flex items-center gap-3 bg-zinc-900/50 px-5 py-3 rounded-xl border border-white/5 hover:bg-zinc-800 transition-all">
            <ShoppingBag size={18} className="text-[#C9A66B]" /><span className="text-xs font-bold uppercase">Carrinho</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {products.map((product) => (
            <div key={product.id} className="group flex flex-col bg-zinc-900/80 border border-white/10 rounded-xl overflow-hidden hover:border-[#C9A66B]/50 transition-all duration-300">
              <div className="aspect-square relative overflow-hidden bg-[#F5F5F7] p-2">
                <img src={product.image_url} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-3 md:p-4 flex flex-col flex-1">
                <div className="mb-2 flex-1 space-y-1">
                  <p className="text-[9px] font-black text-[#C9A66B] uppercase tracking-widest opacity-90">{product.category || 'MascPRO'}</p>
                  {/* AJUSTE: font-semibold em vez de font-bold */}
                  <h3 className="text-xs md:text-sm font-semibold text-white uppercase tracking-tight leading-tight line-clamp-2">{product.title}</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-lg md:text-xl font-black text-[#C9A66B] tracking-tighter">{getDisplayPrice(product)}</p>
                  <div className="flex gap-2 h-9 md:h-10">
                      <button 
                        onClick={() => { addToCart(product); setIsCartOpen(true); }}
                        className="flex-1 bg-white text-black rounded-lg flex items-center justify-center gap-2 hover:bg-[#C9A66B] transition-all text-[11px] md:text-xs font-bold uppercase tracking-widest active:scale-95 px-2"
                      >
                        <ShoppingCart size={14} /> COMPRAR
                      </button>
                      {/* REDIRECIONAMENTO CORRETO PARA EVITAR 404 */}
                      <Link href={`/loja/${product.id}`} className="w-9 md:w-10 bg-zinc-800 border border-white/10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#C9A66B] transition-all">
                        <ChevronRight size={18} />
                      </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* CARRINHO LATERAL */}
      <CartDrawer />
    </div>
  );
}

export default function LojaPage() {
  return (
    <CartProvider>
      <LojaContent />
    </CartProvider>
  );
}
