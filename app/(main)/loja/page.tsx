"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ShoppingBag, Loader2, ChevronRight, Package } from "lucide-react";
import Link from "next/link";

export default function LojaPage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState('cabeleireiro'); // Valor padrão

  useEffect(() => {
    async function loadStore() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // MUDANÇA AQUI: Buscando a coluna "nivel" em vez de professional_category
          const { data: profile } = await supabase
            .from('profiles')
            .select('nivel') 
            .eq('id', session.user.id)
            .single();
          
          // Tratamento para evitar erros de maiúsculo/minúsculo
          const level = profile?.nivel?.toLowerCase()?.trim() || 'cabeleireiro';
          setUserLevel(level);
        }

        const { data: productsData } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        setProducts(productsData || []);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadStore();
  }, []);

  // LÓGICA DE PRECIFICAÇÃO BASEADA NO "NÍVEL"
  const getDisplayPrice = (product: any) => {
    let price = 0;

    // Compara o nivel do usuário com as colunas de preço do produto
    if (userLevel === 'distribuidor') {
      price = Number(product.price_distributor || 0);
    } else if (userLevel === 'embaixador') {
      price = Number(product.price_ambassador || 0);
    } else {
      // Padrão para cabeleireiro ou nível não identificado
      price = Number(product.price_hairdresser || 0);
    }

    return `R$ ${price.toFixed(2)}`;
  };

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter italic uppercase text-white">
              MascPRO <span className="text-[#C9A66B]">LOJA</span>
            </h1>
            <div className="flex items-center gap-3">
                <div className="h-[1px] w-12 bg-[#C9A66B]"></div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                  Tabela: <span className="text-white">{userLevel}</span>
                </p>
            </div>
          </div>
        </div>

        {/* GRID COMPACTO ELITE */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {products.map((product) => (
            <div key={product.id} className="group flex flex-col bg-zinc-900/40 border border-white/5 rounded-lg overflow-hidden hover:border-[#C9A66B]/50 transition-all duration-300">
              
              <div className="aspect-square relative overflow-hidden bg-[#0a0a0a]">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-800"><Package size={24} /></div>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1">
                <div className="mb-3 flex-1">
                  <p className="text-[8px] font-black text-[#C9A66B] uppercase tracking-widest mb-1 opacity-70">MascPRO</p>
                  <h3 className="text-[11px] font-bold text-white uppercase tracking-tight leading-tight line-clamp-2">
                    {product.title}
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {/* PREÇO EM DOURADO COM A LÓGICA DO NIVEL */}
                  <p className="text-sm font-black text-[#C9A66B] tracking-tighter">
                    {getDisplayPrice(product)}
                  </p>

                  <Link 
                    href={`/loja/${product.id}`} 
                    className="w-full bg-white text-black h-8 rounded-md flex items-center justify-center gap-2 hover:bg-[#C9A66B] transition-all text-[9px] font-bold uppercase tracking-widest"
                  >
                    Detalhes <ChevronRight size={12} />
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
