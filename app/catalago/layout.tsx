"use client";

import { CartProvider } from "./CartContext";
import { CatalogVendedorProvider } from "./CatalogVendedorContext";

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <CatalogVendedorProvider>
      <CartProvider>{children}</CartProvider>
    </CatalogVendedorProvider>
  );
}
