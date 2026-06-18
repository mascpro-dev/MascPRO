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
    <nav className="mb-6 flex flex-wrap items-center gap-2 border-b border-purple-500/20 pb-4">
      <div className="mr-auto mb-2 sm:mb-0">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-purple-400/80">
          CRM da Rede
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          Pedidos enviados pela MascPRO · não confundir com gestão admin
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
                ? "bg-purple-600/20 border border-purple-500/40 text-purple-300"
                : "bg-zinc-900/50 border border-zinc-800 text-zinc-500 hover:text-purple-300 hover:border-purple-500/30"
            }`}
          >
            <item.icon size={14} className={active ? "text-purple-400" : ""} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
