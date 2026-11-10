"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CarteiraRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/forca/clientes");
  }, [router]);
  return null;
}
