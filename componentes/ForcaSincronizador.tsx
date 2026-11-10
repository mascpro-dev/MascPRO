"use client";

import { useEffect } from "react";
import { enviarFilaPedido } from "@/lib/forcaFilaPedido";

const CINCO_MINUTOS = 5 * 60 * 1000;

export default function ForcaSincronizador() {
  useEffect(() => {
    void enviarFilaPedido();
    const timer = window.setInterval(() => {
      void enviarFilaPedido();
    }, CINCO_MINUTOS);
    const aoVoltar = () => {
      void enviarFilaPedido();
    };
    window.addEventListener("online", aoVoltar);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", aoVoltar);
    };
  }, []);

  return null;
}
