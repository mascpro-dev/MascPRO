"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ShoppingBag, Loader2, Plus, Minus, Trash2, MessageCircle, Package, Coins } from "lucide-react";

export default function LojaPage() {
  const supabase = createClientComponentClient();
  
  // --- CONFIGURAÇÃO ATUALIZADA ---
  const ADMIN_PHONE = "5514991570389"; // <--- NÚMERO CORRIGIDO
  const CASHBACK_RATE = 2.0; // R$ 2,00 = 1 Moeda
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeCoins, setStoreCoins] = useState(0);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
          const { data: profile } = await supabase.from("profiles").select("store_coins").eq("id", user.id).single();
          if (profile) setStoreCoins(profile.store_coins || 0);
      }

      const { data } = await supabase.from("products").select("*").eq("active", true).order("price", { ascending: true });
      if (data) setProducts(data);

    } catch (error) { console.error("Erro:", error); } finally { setLoading(false); }
  }

  const addToCart = (product: any) => {
    setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => { setCart(prev => prev.filter(item => item.id !== productId)); };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
        if (item.id === productId) {
            const newQuantity = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQuantity };
        }
        return item;
    }));
  };

  const getTotalPrice = () => { return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0); };

  const handleCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let userName = "Aluno MASC";
    if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        if (profile) userName = profile.full_name;
    }

    const totalValue = getTotalPrice();
    const cashback = Math.floor(totalValue / CASHBACK_RATE);
    const itemsList = cart.map(item => `▪️ ${item.quantity}x ${item.title} (R$ ${item.price})`).join('\n');
    const totalFormatted = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const message = `*NOVO PEDIDO - LOJA MASC* 🛒\n\n👤 *Aluno:* ${userName}\n\n📦 *Itens:*\n${itemsList}\n\n💰 *Total:* ${totalFormatted}\n✨ *Cashback Previsto:* +${cashback} Moedas PRO\n\nOlá! Gostaria de finalizar este pedido.`;
    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) return <div className="w-full h-full flex items-center justify-center min-h-[50vh] text-white"><Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="w-full min-h-screen bg-[#000000] text-white p-4 md:p-8 pb-32 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div><h1 className="text-3xl font-extrabold italic tracking-wide">LOJA <span className="text-[#C9A66B]">MASC</span></h1><p className="text-gray-400 mt-2 text-sm">Compre e ganhe Cashback em Moedas PRO.</p></div>
        <div className="bg-[#111] border border-[#222] px-5 py-3 rounded-xl flex items-center gap-3 shadow-lg"><div className="text-right"><p className="text-[10px] text-gray-500 uppercase font-bold">Acumulado na Loja</p><p className="text-xl font-black text-[#C9A66B]">+{storeCoins} PRO</p></div><Coins className="w-8 h-8 text-[#C9A66B]" /></div>
      </div>

      {products.length === 0 ? <div className="text-center text-gray-500 py-10"><Package size={48} className="mx-auto mb-3 opacity-50"/><p>Nenhum produto disponível.</p></div> : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
                <div key={product.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden flex flex-col hover:border-[#333] transition-colors group">
                    <div className="h-48 bg-[#0a0a0a] relative overflow-hidden">
                        {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-gray-700"><ShoppingBag size={40} /></div>}
                        <div className="absolute top-2 right-2 bg-black/80 text-[#C9A66B] text-[10px] font-bold px-2 py-1 rounded border border-[#C9A66B]/30">+{Math.floor(product.price / CASHBACK_RATE)} PRO</div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg text-white mb-1">{product.title}</h3>
                        <p className="text-xs text-gray-400 mb-4 flex-1 line-clamp-3">{product.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#222]">
                            <span className="text-lg font-bold text-white">{formatCurrency(product.price)}</span>
                            <button onClick={() => addToCart(product)} className="bg-[#222] hover:bg-[#C9A66B] hover:text-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2"><Plus size={14} /> Adicionar</button>
                        </div>
                    </div>
                </div>
            ))}
          </div>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-[#1a1a1a] border-t border-[#333] p-4 z-40 animate-in slide-in-from-bottom-5 shadow-2xl">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-center mb-2 md:mb-0">
                         <span className="text-sm font-bold text-gray-400 uppercase">Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)} itens)</span>
                         <button onClick={() => setIsCartOpen(!isCartOpen)} className="text-xs text-[#C9A66B] md:hidden">{isCartOpen ? "Ocultar" : "Ver Itens"}</button>
                    </div>
                    <div className={`${isCartOpen ? 'flex' : 'hidden'} md:flex flex-wrap gap-3 mt-2 md:mt-0`}>
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center gap-2 bg-[#000] px-3 py-1 rounded border border-[#333]"><span className="text-xs font-bold text-white">{item.quantity}x {item.title}</span><button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-400"><Trash2 size={12}/></button></div>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-4">
                        <div className="text-right"><p className="text-[10px] text-gray-500 uppercase">Total</p><p className="text-xl font-black text-white">{formatCurrency(getTotalPrice())}</p></div>
                        <button onClick={handleCheckout} className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"><MessageCircle size={18} /> PEDIR NO WHATS</button>
                    </div>
                    <div className="text-[10px] text-[#C9A66B] font-bold">Você ganhará +{Math.floor(getTotalPrice() / CASHBACK_RATE)} Moedas PRO</div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
