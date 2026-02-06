import { createClient } from '@supabase/supabase-js';
import ProductCard from './ProductCard';

export const revalidate = 60; // re-gera a página a cada minuto

export default async function Catalogo() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('active', true);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-3xl font-bold mb-6">Catálogo MASC Professional</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {products?.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>

      <a
        href="https://wa.me/55SEUNUMERO?text=Quero%20acesso%20profissional%20ao%20app%20MASC%20PRO"
        className="mt-8 inline-block bg-black text-white px-6 py-3 rounded-xl"
      >
        Quero comprar com desconto →
      </a>
    </main>
  );
}
