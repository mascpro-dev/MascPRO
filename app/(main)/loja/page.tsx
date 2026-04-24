"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { ShoppingBag, Loader2, ChevronRight, ShoppingCart, Search } from "lucide-react";
import Link from "next/link";
import { useCart } from "./CartContext";

/** Texto para busca: minúsculas e sem acento (ex.: "shampoo" encontra "Shampoo"). */
function normalizarBusca(s: string) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

function normalizarNivelParaPreco(nivel: string | null | undefined): "cabeleireiro" | "embaixador" | "distribuidor" {
  const v = String(nivel || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
  if (v === "distribuidor") return "distribuidor";
  if (v === "embaixador" || v === "educador_tecnico" || v === "educador tecnico") return "embaixador";
  return "cabeleireiro";
}

function LojaContent() {
  const supabase = createClientComponentClient();
  const { cart, addToCart, setIsCartOpen } = useCart(); // Pegando o 'cart' do contexto
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState('cabeleireiro');
  const [busca, setBusca] = useState("");

  // Cálculo da bolinha de notificação
  const cartCount = cart?.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0) || 0;

  useEffect(() => {
    async function loadStore() {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // BUSCA SEM ACENTO
          const { data: profile } = await supabase
            .from('profiles')
            .select('nivel')
            .eq('id', session.user.id)
            .single();
          
          // O "pulo do gato": Normalizar o texto para comparar
          const userNivel = normalizarNivelParaPreco(profile?.nivel);
          setUserLevel(userNivel);
        }
        const { data: productsData } = await supabase.from("products").select("*");
        const sorted = [...(productsData || [])].sort((a, b) =>
          String(a.title ?? "").localeCompare(String(b.title ?? ""), "pt-BR", {
            numeric: true,
            sensitivity: "base",
          })
        );
        setProducts(sorted);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    }
    loadStore();
  }, []);

  // Na função de mostrar o preço:
  const getDisplayPrice = (product: any) => {
    if (userLevel === 'distribuidor') return product.price_distributor;
    if (userLevel === 'embaixador' || userLevel === 'educador_tecnico') return product.price_ambassador;
    return product.price_hairdresser; // Padrão
  };

  const handleQuickBuy = (product: any) => {
    // Salva o preço correto para o nível do usuário como 'displayPrice'
    addToCart({ ...product, quantity: 1, displayPrice: getDisplayPrice(product) });
  };

  const produtosFiltrados = useMemo(() => {
    const q = normalizarBusca(busca);
    if (!q) return products;
    return products.filter((p) => normalizarBusca(String(p.title ?? "")).includes(q));
  }, [products, busca]);

  if (loading) return <div className="h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter italic uppercase text-white">
              MascPRO <span className="text-[#C9A66B]">LOJA</span>
            </h1>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Tabela: {userLevel}</p>
          </div>
          <button onClick={() => setIsCartOpen(true)} className="group relative flex items-center gap-3 bg-zinc-900/50 px-5 py-3 rounded-xl border border-white/5">
            <div className="relative">
              <ShoppingBag size={18} className="text-[#C9A66B]" />
              {/* A NOTIFICAÇÃO SÓ APARECE SE FOR MAIOR QUE 0 */}
              {cartCount > 0 && (
                <span className="absolute -top-3 -right-3 bg-[#C9A66B] text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#050505]">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-xs font-bold uppercase">Carrinho</span>
          </button>
        </div>

        <div className="mb-8">
          <label className="sr-only" htmlFor="loja-busca-produto">
            Buscar produto na loja
          </label>
          <div className="relative max-w-xl">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
              size={18}
              aria-hidden
            />
            <input
              id="loja-busca-produto"
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto pelo nome…"
              autoComplete="off"
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 py-3.5 pl-12 pr-4 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#C9A66B]/60 transition-colors"
            />
          </div>
          {busca.trim() && (
            <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
              {produtosFiltrados.length} resultado{produtosFiltrados.length === 1 ? "" : "s"} na loja
            </p>
          )}
        </div>

        {produtosFiltrados.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
            <p className="text-sm text-zinc-400">
              {products.length === 0
                ? "Nenhum produto disponível na loja no momento."
                : busca.trim()
                  ? (
                    <>
                      Nenhum produto encontrado com esse nome.{" "}
                      <button
                        type="button"
                        onClick={() => setBusca("")}
                        className="text-[#C9A66B] font-bold hover:underline"
                      >
                        Limpar busca
                      </button>
                    </>
                  )
                : "Nenhum produto disponível na loja no momento."}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {produtosFiltrados.map((product) => (
            <div key={product.id} className="group flex flex-col bg-zinc-900/80 border border-white/10 rounded-xl overflow-hidden hover:border-[#C9A66B]/50 transition-all duration-300">
              <div className="aspect-square relative overflow-hidden bg-[#F5F5F7] p-2">
                <img src={product.image_url} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="p-3 md:p-4 flex flex-col flex-1">
                <div className="mb-2 flex-1 space-y-1">
                  <p className="text-[9px] font-black text-[#C9A66B] uppercase tracking-widest opacity-90">{product.category || 'MascPRO'}</p>
                  {/* AJUSTE: font-semibold em vez de font-bold */}
                  <h3 className="text-xs md:text-sm font-semibold text-white uppercase tracking-tight leading-tight line-clamp-2">{product.title}</h3>
                </div>
                <div className="space-y-2">
                  <p className="text-lg md:text-xl font-black text-[#C9A66B] tracking-tighter">R$ {Number(getDisplayPrice(product) || 0).toFixed(2)}</p>
                  <div className="flex gap-2 h-9 md:h-10">
                      <button 
                        onClick={() => handleQuickBuy(product)}
                        className="flex-1 bg-white text-black rounded-lg flex items-center justify-center gap-2 hover:bg-[#C9A66B] transition-all text-[11px] md:text-xs font-bold uppercase tracking-widest active:scale-95 px-2"
                      >
                        <ShoppingCart size={14} /> COMPRAR
                      </button>
                      {/* REDIRECIONAMENTO CORRETO PARA EVITAR 404 */}
                      <Link href={`/loja/${product.id}`} className="w-9 md:w-10 bg-zinc-800 border border-white/10 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#C9A66B] transition-all">
                        <ChevronRight size={18} />
                      </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

export default function LojaPage() {
  return <LojaContent />;
}
