"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CATALOGO_REF_STORAGE_KEY,
  CATALOGO_WHATSAPP_PADRAO,
  montarLinkWhatsApp,
  type VendedorCatalogo,
  whatsappCatalogo,
} from "@/lib/catalogoVendedor";

type CatalogVendedorContextValue = {
  vendedor: VendedorCatalogo | null;
  whatsappNumero: string;
  loading: boolean;
  montarWhatsApp: (texto: string) => string;
};

const CatalogVendedorContext = createContext<CatalogVendedorContextValue | null>(null);

export function CatalogVendedorProvider({ children }: { children: React.ReactNode }) {
  const [vendedor, setVendedor] = useState<VendedorCatalogo | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarVendedor = useCallback(async (refId: string) => {
    const res = await fetch(`/api/catalago/vendedor?ref=${encodeURIComponent(refId)}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok && data.vendedor) {
      setVendedor(data.vendedor);
      localStorage.setItem(CATALOGO_REF_STORAGE_KEY, data.vendedor.id);
    } else {
      setVendedor(null);
      localStorage.removeItem(CATALOGO_REF_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let refId: string | null = null;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const refUrl = params.get("ref")?.trim();
      if (refUrl) {
        refId = refUrl;
        localStorage.setItem(CATALOGO_REF_STORAGE_KEY, refUrl);
        const path = window.location.pathname;
        window.history.replaceState({}, "", path);
      } else {
        refId = localStorage.getItem(CATALOGO_REF_STORAGE_KEY);
      }
    }

    if (!refId) {
      setLoading(false);
      return;
    }

    void carregarVendedor(refId).finally(() => setLoading(false));
  }, [carregarVendedor]);

  const whatsappNumero = whatsappCatalogo(vendedor);

  const montarWhatsApp = useCallback(
    (texto: string) => montarLinkWhatsApp(whatsappNumero, texto),
    [whatsappNumero]
  );

  const value = useMemo(
    () => ({
      vendedor,
      whatsappNumero,
      loading,
      montarWhatsApp,
    }),
    [vendedor, whatsappNumero, loading, montarWhatsApp]
  );

  return (
    <CatalogVendedorContext.Provider value={value}>
      {children}
    </CatalogVendedorContext.Provider>
  );
}

export function useCatalogVendedor(): CatalogVendedorContextValue {
  const ctx = useContext(CatalogVendedorContext);
  if (!ctx) {
    return {
      vendedor: null,
      whatsappNumero: CATALOGO_WHATSAPP_PADRAO,
      loading: false,
      montarWhatsApp: (texto: string) =>
        montarLinkWhatsApp(CATALOGO_WHATSAPP_PADRAO, texto),
    };
  }
  return ctx;
}
