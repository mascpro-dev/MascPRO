import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Masc PRO Força de Vendas",
  description: "Rotas, visitas e pedidos do vendedor MASC PRO.",
  manifest: "/manifest-forca.json",
  appleWebApp: {
    capable: true,
    title: "Masc PRO Força de Vendas",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-forca-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-forca-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icon-forca-192.png",
  },
};

export default function ForcaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
