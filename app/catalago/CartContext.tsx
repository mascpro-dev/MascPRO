'use client';
import { createContext, useContext, useState } from 'react';

export const CartContext = createContext<any>(null);
export const useCart = () => useContext(CartContext);

export function CartProvider({ priceField, children }: any) {
  const [items, setItems] = useState<any[]>([]);

  const add = (product: any, qty = 1) =>
    setItems((arr) => {
      const found = arr.find((i) => i.id === product.id);
      return found
        ? arr.map((i) =>
            i.id === product.id ? { ...i, qty: i.qty + qty } : i
          )
        : [...arr, { ...product, qty }];
    });

  const remove = (id: string) =>
    setItems((arr) => arr.filter((i) => i.id !== id));

  const clear = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, add, remove, clear, priceField }}>
      {children}
    </CartContext.Provider>
  );
}
