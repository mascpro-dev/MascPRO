"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ShoppingBag, Loader2, Plus, Minus, Trash2, MessageCircle } from "lucide-react";

export default function LojaPage() {
  const supabase = createClientComponentClient();
  
  // CONFIGURAÇÃO
  const ADMIN_PHONE = "5514991570389"; // <--- COLOQUE SEU NÚMERO AQUI (Apenas números)
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data } = await supabase.from("products").select("*").eq("active", true).order("price", { ascending: true });
      if (data) setProducts(data);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DO CARRINHO ---
  const addToCart = (product: any) => {
    setCart(prev => {
        const existing = prev.find(item => item.id === product.id);
        if (existing) {
            return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
        }
        return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
        if (item.id === productId) {
            const newQuantity = Math.max(1, item.quantity + delta);
            return { ...item, quantity: newQuantity };
        }
        return item;
    }));
  };

  const getTotalPrice = () => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  // --- FINALIZAR NO WHATSAPP ---
  const handleCheckout = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    let userName = "Um aluno";
    
    if (user) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
        if (profile) userName = profile.full_name;
    }

    // 1. Monta a lista de produtos
    const itemsList = cart.map(item => `▪️ ${item.quantity}x ${item.title} (R$ ${item.price})`).join('\n');
    const total = getTotalPrice().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 2. Cria a mensagem
    const message = `*NOVO PEDIDO DO APP* 🛒\n\n👤 *Cliente:* ${userName}\n\n📦 *Itens:*\n${itemsList}\n\n💰 *Total:* ${total}\n\nOlá! Gostaria de finalizar este pedido e combinar o pagamento.`;

    // 3. Cria o link e abre
    const url = `https://wa.me/${ADMIN_PHONE}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] text-white p-4 md:p-8 pb-32 font-sans relative">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold italic tracking-wide">
            LOJA <span className="text-[#C9A66B]">MASC</span>
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Invista na sua evolução.</p>
      </div>

      {/* GRADE DE PRODUTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
            <div key={product.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden flex flex-col hover:border-[#333] transition-colors group">
                {/* Imagem */}
                <div className="h-48 bg-[#0a0a0a] relative overflow-hidden">
                    {product.image_url ? (
                        <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.title} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700">
                            <ShoppingBag size={40} />
                        </div>
                    )}
                </div>

                {/* Conteúdo */}
                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-white mb-1">{product.title}</h3>
                    <p className="text-xs text-gray-400 mb-4 flex-1">{product.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#222]">
                        <span className="text-lg font-bold text-[#C9A66B]">{formatCurrency(product.price)}</span>
                        
                        <button 
                            onClick={() => addToCart(product)}
                            className="bg-[#222] hover:bg-[#C9A66B] hover:text-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2"
                        >
                            <Plus size={14} /> Adicionar
                        </button>
                    </div>
                </div>
            </div>
        ))}
      </div>

      {/* BARRA FLUTUANTE DE CARRINHO (Aparece se tiver itens) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#333] p-4 z-50 animate-in slide-in-from-bottom-5 shadow-2xl">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                
                {/* Resumo Carrinho */}
                <div className="flex-1 w-full">
                    <div className="flex justify-between items-center mb-2 md:mb-0">
                         <span className="text-sm font-bold text-gray-400 uppercase">Seu Carrinho ({cart.reduce((a, b) => a + b.quantity, 0)} itens)</span>
                         <button onClick={() => setIsCartOpen(!isCartOpen)} className="text-xs text-[#C9A66B] md:hidden">
                            {isCartOpen ? "Ocultar Detalhes" : "Ver Detalhes"}
                         </button>
                    </div>

                    {/* Lista Detalhada (Mobile: Expansível / Desktop: Sempre visível se couber) */}
                    <div className={`${isCartOpen ? 'block' : 'hidden'} md:flex md:flex-wrap gap-4 mt-2 md:mt-0 max-h-40 overflow-y-auto md:max-h-none`}>
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between gap-3 bg-[#000] p-2 rounded border border-[#333] min-w-[200px]">
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-white truncate max-w-[120px]">{item.title}</span>
                                    <span className="text-[10px] text-gray-500">{formatCurrency(item.price)} un</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="text-gray-400 hover:text-white"><Minus size={14}/></button>
                                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="text-gray-400 hover:text-white"><Plus size={14}/></button>
                                    <button onClick={() => removeFromCart(item.id)} className="text-red-500 ml-1"><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Botão Finalizar */}
                <div className="flex items-center gap-4 w-full md:w-auto border-t md:border-t-0 border-[#333] pt-3 md:pt-0">
                    <div className="text-right">
                        <p className="text-[10px] text-gray-500 uppercase">Total a Pagar</p>
                        <p className="text-xl font-black text-[#C9A66B]">{formatCurrency(getTotalPrice())}</p>
                    </div>
                    <button 
                        onClick={handleCheckout}
                        className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(22,163,74,0.3)]"
                    >
                        <MessageCircle size={18} />
                        FINALIZAR NO WHATS
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}
