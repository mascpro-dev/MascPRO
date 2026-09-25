"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LogoMasc from "@/componentes/mapa/LogoMasc";

const link = "text-sm text-zinc-600 hover:text-[#1A1A1A] transition-colors";
const ativo = "text-sm font-semibold text-[#E23B4A]";

export default function MapaHeader() {
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const noMapa = path === "/mapa" && params.get("ver") === "mapa";
  const inicio = path === "/mapa" && !noMapa && !params.get("q");
  const inscrever = path.startsWith("/mapa/inscrever");

  function voltar() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/home");
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border border-black/5 bg-white/95 px-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={voltar}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <Link href="/mapa" className="shrink-0">
            <LogoMasc className="h-8 w-auto" />
          </Link>
          <nav className="ml-1 hidden items-center gap-5 lg:flex">
            <Link href="/mapa" className={inicio ? ativo : link}>
              Início
            </Link>
            <Link href="/mapa?ver=mapa" className={noMapa ? ativo : link}>
              Mapa
            </Link>
            <Link href="/mapa?ver=mapa" className={link}>
              Fazer agendamento
            </Link>
            <Link href="/mapa/inscrever" className={inscrever ? ativo : link}>
              Conheça a Masc
            </Link>
          </nav>
        </div>

        <Link
          href="/mapa?ver=mapa"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#fde8e6] px-4 py-2 text-sm font-semibold text-[#E23B4A]"
        >
          Mapa
        </Link>
      </div>
      <nav className="mx-auto mt-2 flex max-w-6xl gap-4 overflow-x-auto px-2 pb-1 text-sm lg:hidden">
        <Link href="/mapa" className={`shrink-0 ${inicio ? ativo : link}`}>
          Início
        </Link>
        <Link href="/mapa?ver=mapa" className={`shrink-0 ${noMapa ? ativo : link}`}>
          Mapa
        </Link>
        <Link href="/mapa?ver=mapa" className={`shrink-0 ${link}`}>
          Fazer agendamento
        </Link>
        <Link href="/mapa/inscrever" className={`shrink-0 ${inscrever ? ativo : link}`}>
          Conheça a Masc
        </Link>
      </nav>
    </header>
  );
}
