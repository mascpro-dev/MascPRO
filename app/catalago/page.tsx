"use client";

import { ShoppingBag, MessageCircle } from "lucide-react";
import CatalogContent from "./CatalogContent";
import { useCart } from "./CartContext"; 
import CartDrawer from "./CartDrawer"; 

export default function CatalogPage() {
  const { cart, setIsCartOpen } = useCart(); 
  const cartCount = cart?.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0) || 0;

  // Link do WhatsApp (Troque o número pelo seu oficial)
  const whatsappNumber = "5514991570389"; 
  const whatsappMessage = encodeURIComponent("Olá! Estava vendo o catálogo MascPRO e gostaria de saber como comprar com descontos exclusivos.");
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER COMPRAS + WHATSAPP CTA */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter italic uppercase text-white">
                MascPRO <span className="text-[#C9A66B]">COMPRAS</span>
              </h1>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">
                Catálogo Oficial de Produtos
              </p>
            </div>

            {/* LINK DO WHATSAPP ONDE VOCÊ MARCOU O CÍRCULO */}
            <a 
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 group border-b border-[#C9A66B]/30 pb-1 hover:border-[#C9A66B] transition-all"
            >
              <MessageCircle size={14} className="text-[#C9A66B]" />
              <span className="text-[11px] font-bold text-[#C9A66B] uppercase tracking-widest group-hover:text-white transition-colors">
                Deseja comprar com descontos?
              </span>
            </a>
          </div>
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="group relative flex items-center gap-4 bg-white text-black px-8 py-4 rounded-lg font-bold uppercase text-[10px] tracking-[0.2em] hover:bg-[#C9A66B] transition-all duration-300 shadow-xl active:scale-95"
          >
            <div className="relative">
                <ShoppingBag size={16} />
                {cartCount > 0 && (
                  <span className="absolute -top-3 -right-3 bg-[#C9A66B] text-black text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
            </div>
            Meu Carrinho
          </button>
        </div>

        {/* LISTAGEM DE PRODUTOS */}
        <CatalogContent />

        {/* CARRINHO LATERAL (Drawer) */}
        <CartDrawer />
      </div>
    </div>
  );
}
