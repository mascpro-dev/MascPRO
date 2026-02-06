'use client';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from './CartContext';

export default function Checkout() {
  const { items, clear, priceField } = useCart();

  if (items.length === 0) return null;

  const total = items.reduce(
    (acc: number, i: any) => acc + i[priceField] * i.qty,
    0
  );

  const finalize = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { alert('Faça login.'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) { alert('Erro ao buscar perfil.'); return; }

    const { data: order } = await supabase
      .from('orders')
      .insert({
        profile_id: profile.id,
        total,
        payment_method: 'pendente',
        status: 'novo',
      })
      .select()
      .single();

    if (!order) { alert('Erro ao criar pedido.'); return; }

    const itemsInsert = items.map((i: any) => ({
      order_id: order.id,
      product_id: i.id,
      quantidade: i.qty,
      preco_unitario: i[priceField],
    }));
    await supabase.from('order_items').insert(itemsInsert);
    clear();
    alert('Pedido enviado! 👌');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow p-4">
      <p className="font-bold">
        Total: R$ {total.toFixed(2)}
      </p>
      <button
        onClick={finalize}
        className="mt-2 bg-black text-white w-full py-2 rounded-lg"
      >
        Finalizar pedido
      </button>
    </div>
  );
}
