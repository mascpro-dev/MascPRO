"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ShoppingBag, Loader2, ChevronRight, Package } from "lucide-react";
import Link from "next/link";

export default function LojaPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [userCategory, setUserCategory] = useState('cabeleireiro'); // Padrão inicial

  useEffect(() => {
    async function loadStore() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('professional_category')
            .eq('id', session.user.id)
            .single();
          
          // Ajusta para bater com as colunas do banco
          const cat = profile?.professional_category?.toLowerCase() || 'cabeleireiro';
          setUserCategory(cat);
        }

        const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        setProducts(productsData || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadStore();
  }, []);

  // ENGENHARIA DE PRECIFICAÇÃO (MANTIDA)
  const getDisplayPrice = (product: any) => {
    let price = 0;

    if (userCategory === 'distribuidor') {
      price = Number(product.price_distributor || 0);
    } else if (userCategory === 'embaixador') {
      price = Number(product.price_ambassador || 0);
    } else if (userCategory === 'cabeleireiro') {
      price = Number(product.price_hairdresser || 0);
    } else {
      price = Number(product.price_hairdresser || 0); 
    }

    // Formato R$ 0.00
    return `R$ ${price.toFixed(2)}`;
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER COM TÍTULO ALTERADO */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            {/* MUDANÇA AQUI: De Catálogo para Compras */}
            <h1 className="text-3xl font-semibold tracking-tight italic uppercase mb-2">MascPRO Compras</h1>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em]">
              Tabela: <span className="text-[#C9A66B]">{userCategory}</span>
            </p>
          </div>
          <Link href="/carrinho" className="flex items-center gap-4 bg-zinc-900/50 px-6 py-3 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-all">
            <ShoppingBag size={18} className="text-[#C9A66B]" />
            <span className="text-xs font-bold uppercase tracking-widest">Meu Carrinho</span>
          </Link>
        </div>

        {/* GRID DE PRODUTOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            /* MUDANÇA AQUI: rounded-xl em vez de rounded-3xl para cantos menos redondos */
            <div key={product.id} className="group bg-zinc-900/20 border border-white/5 rounded-xl overflow-hidden hover:border-[#C9A66B]/30 transition-all duration-500 shadow-2xl">
              
              <div className="aspect-square relative overflow-hidden bg-zinc-900">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-800"><Package size={40} /></div>
                )}
              </div>

              <div className="p-6">
                <p className="text-[9px] font-bold text-[#C9A66B] uppercase tracking-[0.2em] mb-2">{product.category || 'Elite'}</p>
                <h3 className="text-sm font-medium text-white mb-4 line-clamp-1">{product.name}</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-widest mb-1">Valor Unitário</p>
                    <p className="text-lg font-semibold text-white tracking-tighter">
                      {getDisplayPrice(product)}
                    </p>
                  </div>
                  
                  {/* LINK PARA PÁGINA DE DETALHES */}
                  <Link href={`/loja/${product.id}`} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:bg-[#C9A66B] transition-all">
                    <ChevronRight size={20} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
