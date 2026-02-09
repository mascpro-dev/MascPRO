"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext<any>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // Trava de segurança

  // 1. CARREGAR (Só roda uma vez ao abrir o app)
  useEffect(() => {
    const saved = localStorage.getItem('mascpro_loja_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCart(parsed);
        }
      } catch (e) {
        console.error("Erro ao carregar dados do carrinho:", e);
      }
    }
    setIsInitialized(true); // Libera para salvar depois de ler
  }, []);

  // 2. SALVAR (Só salva se a trava estiver liberada)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('mascpro_loja_cart', JSON.stringify(cart));
    }
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

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
