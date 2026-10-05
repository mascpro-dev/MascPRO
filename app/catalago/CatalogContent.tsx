'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import ProductCard from './ProductCard';
import { useCatalogVendedor } from './CatalogVendedorContext';
import { FAIXA_LINHA, SEM_LINHA, agruparProdutosPorLinha } from '@/lib/gruposLinhaProduto';

export default function CatalogContent() {
  const supabase = createClientComponentClient();
  const { montarWhatsApp, vendedor } = useCatalogVendedor();
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

  const produtosAgrupados = useMemo(
    () => agruparProdutosPorLinha(products),
    [products]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-zinc-500 text-sm">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-10">
        {produtosAgrupados.map((grupo) => {
          const faixa = FAIXA_LINHA[grupo.id] || FAIXA_LINHA[SEM_LINHA];
          return (
            <section key={grupo.id}>
              <div
                className="mb-4 flex items-center justify-between rounded-xl px-4 py-3 md:px-5"
                style={{ backgroundColor: faixa.bg, color: faixa.fg }}
              >
                <h2 className="text-sm md:text-base font-black uppercase tracking-[0.16em]">
                  {grupo.label}
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {grupo.items.length} produto{grupo.items.length === 1 ? '' : 's'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {grupo.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <a
        href={montarWhatsApp(
          vendedor
            ? `Olá ${vendedor.full_name.split(" ")[0]}! Quero comprar com desconto pelo catálogo MascPRO.`
            : "Quero acesso profissional ao app MASC PRO"
        )}
        className="mt-8 inline-block bg-black text-white px-6 py-3 rounded-xl"
      >
        {vendedor ? "Quero comprar com desconto →" : "Quero comprar com desconto →"}
      </a>
    </>
  );
}
