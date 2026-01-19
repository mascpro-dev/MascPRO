"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlayCircle, LayoutGrid, User, Trophy, Share2 } from "lucide-react";

// Mantenha os links apontando para os caminhos que já funcionavam
const menuItems = [
  { name: "Visão Geral", href: "/", icon: LayoutGrid },
  { name: "Evolução", href: "/evolucao", icon: PlayCircle }, // Restaurado para o nome original
  { name: "Minha Rede", href: "/rede", icon: Share2 },
  { name: "Comunidade", href: "/comunidade", icon: Trophy },
  { name: "Meu Perfil", href: "/perfil", icon: User },
];