'use client';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ProductCard from './ProductCard';

export default function CatalogContent() {
  const supabase = createClientComponentClient();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('active', true);
        setProducts(data || []);
      } catch (e) {
        console.error('Erro ao carregar produtos:', e);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500 text-sm">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      <a
        href="https://wa.me/5514991570389?text=Quero%20acesso%20profissional%20ao%20app%20MASC%20PRO"
        className="mt-8 inline-block bg-black text-white px-6 py-3 rounded-xl"
      >
        Quero comprar com desconto →
      </a>
    </>
  );
}
