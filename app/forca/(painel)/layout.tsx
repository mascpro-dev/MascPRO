"use client";

import ForcaShell from "@/componentes/ForcaShell";
import { ReactNode } from "react";

export default function ForcaPainelLayout({ children }: { children: ReactNode }) {
  return <ForcaShell>{children}</ForcaShell>;
}
