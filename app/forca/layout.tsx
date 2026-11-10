import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Força de Vendas",
  description: "Rotas, visitas e pedidos do vendedor MASC PRO.",
  manifest: "/manifest-forca.json",
  appleWebApp: {
    capable: true,
    title: "Força de Vendas",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/icon-forca.png",
  },
};

export default function ForcaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
