"use client";

import { CartProvider } from "./CartContext";
import CartDrawer from "./CartDrawer";

export default function LojaLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {/* Aqui o carrinho vive "acima" das páginas, então ele nunca morre */}
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
