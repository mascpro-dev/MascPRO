import { createClient } from '@supabase/supabase-js';
import CatalogContent from './CatalogContent';

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

  return <CatalogContent products={products || []} />;
}
