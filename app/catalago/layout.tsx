"use client";

import { CartProvider } from "./CartContext";

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
