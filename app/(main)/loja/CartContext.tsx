'use client';
import { createContext, useContext, useState } from 'react';

interface CartItem {
  id: string;
  name: string;
  [key: string]: any;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  priceField: string;
  add: (product: any, qty?: number) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartCtx | null>(null);
export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve estar dentro de CartProvider');
  return ctx;
};

export function CartProvider({
  children,
  priceField,
}: {
  children: React.ReactNode;
  priceField: string;
}) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (p: any, qty = 1) =>
    setItems((arr) => {
      const found = arr.find((i) => i.id === p.id);
      return found
        ? arr.map((i) =>
            i.id === p.id ? { ...i, qty: i.qty + qty } : i
          )
        : [...arr, { ...p, qty }];
    });

  const remove = (id: string) =>
    setItems((arr) => arr.filter((i) => i.id !== id));

  const clear = () => setItems([]);

  return (
    <CartContext.Provider value={{ items, priceField, add, remove, clear }}>
      {children}
    </CartContext.Provider>
  );
}
