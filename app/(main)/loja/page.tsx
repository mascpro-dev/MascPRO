'use client';
import { useEffect, useState } from 'react';
import { useUserWithProfile } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { CartProvider, useCart } from './CartContext';
import Checkout from './Checkout';

function Product({ p, priceField }: any) {
  const { add } = useCart();
  return (
    <div
      className="border rounded-xl p-4 flex flex-col cursor-pointer"
      onClick={() => add(p)}
    >
      <img src={p.image_url} alt={p.name} className="h-32 object-cover rounded" />
      <h4 className="mt-2 font-medium">{p.name}</h4>
      <span className="mt-auto font-bold">
        R$ {Number(p[priceField]).toFixed(2)}
      </span>
    </div>
  );
}

export default function Loja() {
  const { profile, loading } = useUserWithProfile();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .then(({ data }) => setProducts(data || []));
  }, [profile]);

  if (loading) return <p>Carregando...</p>;
  if (!profile) return <p>Faça login primeiro.</p>;
  if (profile.tier_status !== 'approved')
    return <p>Sua conta está em análise. Aguarde aprovação 🙏</p>;

  const priceField =
    profile.tier === 'hairdresser'
      ? 'price_hairdresser'
      : profile.tier === 'ambassador'
      ? 'price_ambassador'
      : profile.tier === 'distributor'
      ? 'price_distributor'
      : 'price_consumer';

  return (
    <CartProvider priceField={priceField}>
      <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
        {products.map((p) => (
          <Product key={p.id} p={p} priceField={priceField} />
        ))}
      </div>
      <Checkout />
    </CartProvider>
  );
}
