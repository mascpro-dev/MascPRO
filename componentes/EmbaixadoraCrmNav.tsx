"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Kanban } from "lucide-react";

const LINKS = [
  { href: "/embaixador/crm/dashboard", label: "Dashboard", icon: LayoutDashboard, match: (p: string) => p.includes("/dashboard") },
  { href: "/embaixador/crm", label: "Pipeline", icon: Kanban, match: (p: string) => p === "/embaixador/crm" || (p.startsWith("/embaixador/crm/leads") && !p.includes("/dashboard")) },
];

export default function EmbaixadoraCrmNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
      <div className="mr-auto mb-2 sm:mb-0">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C9A66B]/80">
          CRM da Rede
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          Pedidos registrados para envio pela MascPRO
        </p>
      </div>
      {LINKS.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              active
                ? "bg-[#C9A66B]/15 border border-[#C9A66B]/30 text-[#C9A66B]"
                : "bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-[#C9A66B] hover:border-[#C9A66B]/20"
            }`}
          >
            <item.icon size={14} className={active ? "text-[#C9A66B]" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
