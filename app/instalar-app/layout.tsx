import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Instalar o app | Masc PRO",
  description: "Adicione o Masc PRO à tela inicial do celular ou instale no computador (PWA).",
};

export default function InstalarAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
