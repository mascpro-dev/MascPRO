"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Kanban, LayoutDashboard, MapPin, Target } from "lucide-react";

const LINKS = [
  { href: "/vendedor/crm/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendedor/crm", label: "Pipeline", icon: Kanban },
  { href: "/vendedor/crm/visitas", label: "Visitas", icon: MapPin },
  { href: "/vendedor/crm/metas", label: "Metas", icon: Target },
];

export default function VendedorCrmNav() {
  const pathname = usePathname();
  return (
    <div className="mb-6 flex flex-wrap gap-2 border-b border-white/5 pb-4">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const ativo =
          href === "/vendedor/crm"
            ? pathname === href || pathname.startsWith("/vendedor/crm/leads")
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
              ativo
                ? "bg-[#C9A66B]/15 text-[#C9A66B] border border-[#C9A66B]/30"
                : "text-zinc-500 hover:text-white border border-transparent"
            }`}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
