"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, ShoppingBag, Loader2, CheckCircle, Lock, Package } from "lucide-react";

export default function LojaPage() {
  const supabase = createClientComponentClient();
  
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null); // ID do produto sendo comprado
  
  const [products, setProducts] = useState<any[]>([]);
  const [myPurchases, setMyPurchases] = useState<Set<string>>(new Set());
  const [userCoins, setUserCoins] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        // 1. Saldo
        const { data: profile } = await supabase.from("profiles").select("coins, personal_coins").eq("id", user.id).single();
        if (profile) setUserCoins((profile.coins || 0) + (profile.personal_coins || 0));

        // 2. Minhas Compras (Para saber o que eu já tenho)
        const { data: purchases } = await supabase.from("purchases").select("product_id").eq("user_id", user.id);
        if (purchases) {
            setMyPurchases(new Set(purchases.map(p => p.product_id)));
        }
      }

      // 3. Produtos da Loja
      const { data: productsData } = await supabase.from("products").select("*").eq("active", true).order("price", { ascending: true });
      if (productsData) setProducts(productsData);

    } catch (error) {
      console.error("Erro loja:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleBuy = async (product: any) => {
    if (!userId) return;
    if (userCoins < product.price) return alert("Saldo insuficiente!");
    
    // Confirmação simples
    if (!confirm(`Deseja comprar "${product.title}" por ${product.price} PRO?`)) return;

    try {
        setPurchasing(product.id);

        // Chama a função segura do banco
        const { data, error } = await supabase.rpc('buy_product', { 
            p_product_id: product.id, 
            p_user_id: userId 
        });

        if (error) throw error;

        if (data && data.success) {
            alert("🎉 Compra realizada com sucesso!");
            // Atualiza localmente para feedback instantâneo
            setUserCoins(prev => prev - product.price);
            setMyPurchases(prev => new Set(prev).add(product.id));
        } else {
            alert("Erro: " + (data?.message || "Falha na transação"));
        }

    } catch (error) {
        console.error(error);
        alert("Erro ao processar compra.");
    } finally {
        setPurchasing(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white">
      <Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#000000] text-white p-4 md:p-8 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-extrabold italic tracking-wide">
                LOJA <span className="text-[#C9A66B]">PRO</span>
            </h1>
            <p className="text-gray-400 mt-2 text-sm">Troque suas conquistas por recompensas reais.</p>
        </div>

        <div className="bg-[#111] border border-[#222] px-6 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-[#C9A66B]/5">
            <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase font-bold">Seu Saldo</p>
                <p className="text-2xl font-black text-[#C9A66B]">{userCoins}</p>
            </div>
            <Trophy className="w-8 h-8 text-[#C9A66B]" />
        </div>
      </div>

      {/* GRADE DE PRODUTOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {products.map((product) => {
            const alreadyBought = myPurchases.has(product.id);
            const canAfford = userCoins >= product.price;

            return (
                <div key={product.id} className={`group bg-[#111] border ${alreadyBought ? "border-green-900/50" : "border-[#222]"} rounded-xl overflow-hidden flex flex-col transition-all hover:border-[#333]`}>
                    
                    {/* Imagem */}
                    <div className="h-40 bg-[#0a0a0a] relative overflow-hidden">
                        {product.image_url ? (
                            <img src={product.image_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt={product.title} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-700">
                                <ShoppingBag size={40} />
                            </div>
                        )}
                        
                        {alreadyBought && (
                            <div className="absolute inset-0 bg-green-900/80 flex items-center justify-center flex-col text-white animate-in fade-in">
                                <CheckCircle size={32} className="mb-2" />
                                <span className="font-bold text-sm uppercase tracking-wider">Adquirido</span>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="p-5 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg leading-tight mb-2 text-white">{product.title}</h3>
                        <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{product.description}</p>
                        
                        {/* Preço e Botão */}
                        <div className="mt-auto">
                            {!alreadyBought ? (
                                <button 
                                    onClick={() => handleBuy(product)}
                                    disabled={!canAfford || purchasing === product.id}
                                    className={`w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                        canAfford 
                                        ? "bg-[#C9A66B] text-black hover:bg-[#b08d55] shadow-[0_0_15px_rgba(201,166,107,0.2)]" 
                                        : "bg-[#222] text-gray-500 cursor-not-allowed"
                                    }`}
                                >
                                    {purchasing === product.id ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <>
                                            {canAfford ? <ShoppingBag size={16} /> : <Lock size={16} />}
                                            {product.price} PRO
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button disabled className="w-full py-3 bg-green-900/20 text-green-500 border border-green-900/50 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2">
                                    <Package size={16} /> No Inventário
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        })}

      </div>

      {/* ÁREA DE INVENTÁRIO (Opcional, se quiser mostrar lista separada) */}
      {myPurchases.size > 0 && (
          <div className="mt-12 border-t border-[#222] pt-8">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-300">
                  <Package className="text-[#C9A66B]" size={20} /> Seu Inventário
              </h2>
              <div className="bg-[#111] rounded-xl border border-[#222] overflow-hidden">
                  {products.filter(p => myPurchases.has(p.id)).map(item => (
                      <div key={item.id} className="p-4 border-b border-[#222] last:border-0 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-[#222] rounded-lg overflow-hidden">
                                  {item.image_url && <img src={item.image_url} className="w-full h-full object-cover" />}
                              </div>
                              <div>
                                  <p className="font-bold text-sm text-white">{item.title}</p>
                                  <p className="text-xs text-green-500 font-bold">Item Ativo</p>
                              </div>
                          </div>
                          <button className="text-xs bg-[#222] hover:bg-[#333] px-3 py-2 rounded text-white transition-colors">
                              Acessar
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}

    </div>
  );
}