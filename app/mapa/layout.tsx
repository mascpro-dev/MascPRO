import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

const display = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-mapa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mapa de Salões | MASC PRO",
  description: "Encontre um salão parceiro perto de você ou inscreva o seu.",
};

export default function MapaLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${display.variable} bg-[#FFFBF8] text-[#1A1A1A]`}>{children}</div>;
}
