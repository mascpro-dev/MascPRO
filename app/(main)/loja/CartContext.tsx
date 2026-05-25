"use client";
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const CartContext = createContext<any>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const remoteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. CARREGAR do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mascpro_loja_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCart(parsed);
      } catch (e) {
        console.error("Erro ao carregar dados do carrinho:", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // 2. SALVAR no localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('mascpro_loja_cart', JSON.stringify(cart));
    }
  }, [cart, isInitialized]);

  // 3. PERSISTIR no banco (admin recupera vendas abandonadas)
  //    — debounce de 1,5 s para não martelar a API.
  useEffect(() => {
    if (!isInitialized) return;
    if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    remoteSaveTimer.current = setTimeout(() => {
      const payload = {
        items: cart.map((i: any) => ({
          id: i.id,
          title: i.title,
          quantity: Number(i.quantity || 1),
          price: Number(i.displayPrice ?? i.price ?? 0),
          image_url: i.image_url,
        })),
      };
      fetch("/api/cart/save", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => { /* silencioso — não pode quebrar o carrinho */ });
    }, 1500);

    return () => {
      if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    };
  }, [cart, isInitialized]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      const qtyToAdd = Number(product.quantity || 1);
      
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: Number(item.quantity || 1) + qtyToAdd } 
            : item
        );
      }
      return [...prev, { ...product, quantity: qtyToAdd }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, (Number(item.quantity) || 1) + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    // Marca como convertido no banco (pagamento aprovado costuma chamar clearCart)
    fetch("/api/cart/clear", { method: "POST", keepalive: true }).catch(() => {});
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
