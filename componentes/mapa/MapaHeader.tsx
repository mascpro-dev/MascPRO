"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const link = "text-sm text-zinc-600 hover:text-[#1A1A1A] transition-colors";
const ativo = "text-sm text-[#E23B4A] font-semibold";

export default function MapaHeader() {
  const path = usePathname();
  const inicio = path === "/mapa";

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/mapa" className="flex min-w-0 items-center gap-2">
          <PinLogo />
          <span className="truncate text-[15px] font-black tracking-tight text-[#1A1A1A]">
            Mapa de Salões
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/mapa" className={inicio ? ativo : link}>
            Início
          </Link>
          <Link href="/mapa?ver=mapa" className={link}>
            Mapa
          </Link>
          <Link href="/mapa/inscrever" className={path.startsWith("/mapa/inscrever") ? ativo : link}>
            Inscrever salão
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/mapa?ver=mapa"
            className="hidden rounded-full border border-black/10 px-3 py-1.5 text-sm font-medium text-[#1A1A1A] sm:inline-flex"
          >
            Mapa
          </Link>
          <Link
            href="/mapa/inscrever"
            className="rounded-full bg-[#E23B4A] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#cf3140]"
          >
            Inscrever salão
          </Link>
        </div>
      </div>
    </header>
  );
}

function PinLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <path
        d="M16 2C10.2 2 5.5 6.6 5.5 12.4 5.5 19.2 16 30 16 30s10.5-10.8 10.5-17.6C26.5 6.6 21.8 2 16 2z"
        fill="#E23B4A"
      />
      <circle cx="16" cy="12.5" r="3.6" fill="#fff" />
    </svg>
  );
}
