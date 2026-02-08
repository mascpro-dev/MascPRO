'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUserWithProfile } from '@/lib/auth';

import { CartProvider } from './CartContext';
import ProductCardPro from './ProductCardPro';
import Checkout from './Checkout';
import CartDrawer from './CartDrawer';

export default function Loja() {
  // pega perfil + tier
  const { profile, loading } = useUserWithProfile();

  // estado dos produtos
  const [products, setProducts] = useState<any[]>([]);

  // carrega produtos quando perfil já está disponível
  useEffect(() => {
    if (!profile) return;

    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .then(({ data }) => setProducts(data || []));
  }, [profile]);

  /* -------------------- GATES -------------------- */

  if (loading) return <p className="p-6">Carregando...</p>;

  if (!profile) return <p className="p-6">Faça login para acessar a Loja PRO.</p>;

  if (profile.tier_status !== 'approved')
    return (
      <p className="p-6">
        Sua conta está em análise. Aguarde aprovação 🙏
      </p>
    );

  /* -------------------- PREÇO POR TIER -------------------- */

  const priceField =
    profile.tier === 'hairdresser'
      ? 'price_hairdresser'
      : profile.tier === 'ambassador'
      ? 'price_ambassador'
      : profile.tier === 'distributor'
      ? 'price_distributor'
      : 'price_consumer';

  /* -------------------- RENDER -------------------- */

  return (
    <CartProvider priceField={priceField}>
      {/* Grade responsiva */}
      <div className="p-6 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((p) => (
          <ProductCardPro key={p.id} product={p} priceField={priceField} />
        ))}
      </div>

      {/* Carrinho fixo no rodapé */}
      <Checkout />
      
      {/* Drawer do carrinho */}
      <CartDrawer />
    </CartProvider>
  );
}
