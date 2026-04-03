"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, UserPlus, GitMerge, Zap, Clock, LayoutDashboard,
  ShieldCheck, ArrowDownToLine, ShoppingBag, UsersRound,
  Calendar, BookOpen, Bell, Package, Menu, X, ChevronRight,
  Eye,
} from "lucide-react";

const menuItems = [
  {
    title: "VISÃO GERAL",
    items: [
      { name: "Painel Admin", icon: LayoutDashboard, href: "/admin" },
      {
        name: "Gestão PRO (Master)",
        desc: "Agenda, clientes, loja e financeiro por membro",
        icon: Eye,
        href: "/admin/gestao-rede",
        color: "text-cyan-400",
      },
    ],
  },
  {
    title: "MEMBROS",
    items: [
      { name: "Todos os Membros", desc: "Busca e filtros", icon: UsersRound, href: "/admin/membros", color: "text-[#C9A66B]" },
      { name: "Quem Entrou", desc: "Novos cadastros", icon: UserPlus, href: "/admin/novos" },
      { name: "Quem Indicou", desc: "Mapeamento de rede", icon: GitMerge, href: "/admin/rede" },
    ],
  },
  {
    title: "ENGAJAMENTO",
    items: [
      { name: "Quem está Ativo", desc: "Engajamento total", icon: Zap, href: "/admin/ativos", color: "text-yellow-400" },
      { name: "Quem está Parado", desc: "Risco de abandono", icon: Clock, href: "/admin/inativos", color: "text-red-500" },
    ],
  },
  {
    title: "CONTEÚDO",
    items: [
      { name: "Eventos", desc: "Flyers e detalhes", icon: Calendar, href: "/admin/eventos", color: "text-[#C9A66B]" },
      { name: "Cursos & Aulas", desc: "Módulos e vídeos", icon: BookOpen, href: "/admin/cursos", color: "text-blue-400" },
      { name: "Comunicados", desc: "Recados por segmento", icon: Bell, href: "/admin/comunicados", color: "text-yellow-400" },
    ],
  },
  {
    title: "LOJA",
    items: [
      { name: "Produtos", desc: "Preços, estoque, fotos", icon: Package, href: "/admin/produtos", color: "text-emerald-400" },
      { name: "Pedidos", desc: "Separação e despacho", icon: ShoppingBag, href: "/admin/pedidos", color: "text-blue-400" },
    ],
  },
  {
    title: "FINANCEIRO",
    items: [
      { name: "Saques", desc: "Comissões", icon: ArrowDownToLine, href: "/admin/saques", color: "text-green-400" },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const currentPage =
    (menuItems as { items: { name: string; href: string }[] }[])
      .flatMap((s) => s.items)
      .find((i) => i.href === pathname)?.name || "Admin";

  const NavContent = () => (
    <nav className="flex flex-col gap-6">
      {menuItems.map((section, idx) => (
        <div key={idx}>
          <p className="text-[9px] font-black text-zinc-700 tracking-[0.25em] uppercase mb-2 px-2">
            {section.title}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group ${
                    isActive
                      ? "bg-zinc-900 border border-white/10"
                      : "hover:bg-zinc-900/60 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        (item as any).color || (isActive ? "text-[#C9A66B]" : "text-zinc-500")
                      } group-hover:text-[#C9A66B]`}
                    />
                    <div>
                      <p className={`text-[11px] font-bold uppercase tracking-tight leading-tight ${isActive ? "text-white" : "text-zinc-400"}`}>
                        {item.name}
                      </p>
                      {(item as any).desc && (
                        <p className="text-[9px] text-zinc-600">{(item as any).desc}</p>
                      )}
                    </div>
                  </div>
                  {isActive
                    ? <div className="w-1.5 h-1.5 rounded-full bg-[#C9A66B] shadow-[0_0_6px_#C9A66B] shrink-0" />
                    : <ChevronRight className="w-3 h-3 text-zinc-700 opacity-0 group-hover:opacity-100 shrink-0" />
                  }
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* ─── TOPBAR MOBILE (oculto no desktop) ─── */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="bg-[#C9A66B] p-1.5 rounded-lg">
            <ShieldCheck className="text-black w-4 h-4" />
          </div>
          <div>
            <p className="text-white font-black text-xs tracking-tight uppercase italic leading-none">MascPRO</p>
            <p className="text-[#C9A66B] text-[9px] font-bold uppercase tracking-widest leading-none">Admin Radar</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide truncate max-w-[130px]">{currentPage}</p>
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* ─── OVERLAY MOBILE ─── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ─── DRAWER MOBILE ─── */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-[70] w-[80vw] max-w-[300px] bg-zinc-950 border-r border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Header do drawer */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-[#C9A66B] p-1.5 rounded-lg">
              <ShieldCheck className="text-black w-4 h-4" />
            </div>
            <div>
              <p className="text-white font-black text-sm uppercase italic">MascPRO</p>
              <p className="text-[#C9A66B] text-[9px] font-bold uppercase tracking-widest">Admin Radar</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg bg-zinc-900 text-zinc-500">
            <X size={16} />
          </button>
        </div>
        {/* Nav scrollável */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavContent />
        </div>
        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800 shrink-0">
          <Link href="/" className="text-[10px] text-[#C9A66B] font-bold uppercase tracking-widest hover:underline">
            ← Sair do Admin
          </Link>
        </div>
      </div>

      {/* ─── SIDEBAR DESKTOP (oculto no mobile) ─── */}
      <aside className="hidden md:flex w-60 shrink-0 h-full min-h-0 flex-col border-r border-white/5 bg-black">
        <div className="flex h-full min-h-0 flex-col gap-6 p-5">
          <div className="flex items-center gap-3 px-1 shrink-0">
            <div className="bg-[#C9A66B] p-2 rounded-lg">
              <ShieldCheck className="text-black w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-black text-sm tracking-tighter uppercase italic">MascPRO</h2>
              <p className="text-[#C9A66B] text-[9px] font-bold uppercase tracking-widest">Admin Radar</p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden -mx-1 px-1">
            <NavContent />
          </div>
          <div className="shrink-0 border-t border-white/5 pt-4">
            <Link href="/" className="text-[9px] text-[#C9A66B] font-bold uppercase tracking-widest hover:underline">
              ← Sair do Admin
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
