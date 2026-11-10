"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let instalacao: BipEvent | null = null;
let ouvindo = false;

function prenderManifestoDaForca() {
  document.querySelectorAll('link[rel="manifest"]').forEach((el) => {
    const href = el.getAttribute("href") || "";
    if (!href.includes("manifest-forca.json")) el.remove();
  });
  if (!document.querySelector('link[rel="manifest"][href="/manifest-forca.json"]')) {
    const link = document.createElement("link");
    link.rel = "manifest";
    link.href = "/manifest-forca.json";
    document.head.appendChild(link);
  }
}

function ouvirInstalacao() {
  if (ouvindo || typeof window === "undefined") return;
  ouvindo = true;
  prenderManifestoDaForca();
  window.addEventListener("beforeinstallprompt", (evento) => {
    evento.preventDefault();
    instalacao = evento as BipEvent;
    window.dispatchEvent(new Event("forca-instalavel"));
  });
}

export function prepararInstalacaoForca() {
  ouvirInstalacao();
}

export default function ForcaBaixarApp() {
  const [pronto, setPronto] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    prenderManifestoDaForca();
    ouvirInstalacao();
    const marcar = () => setPronto(Boolean(instalacao));
    marcar();
    window.addEventListener("forca-instalavel", marcar);
    return () => window.removeEventListener("forca-instalavel", marcar);
  }, []);

  async function baixar() {
    setAviso("");
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setAviso("A Força de Vendas já está neste aparelho.");
      return;
    }
    if (!instalacao) {
      setAviso("Abra esta tela no Chrome ou no Edge para instalar só a Força.");
      return;
    }
    await instalacao.prompt();
    const escolha = await instalacao.userChoice;
    instalacao = null;
    setPronto(false);
    setAviso(escolha.outcome === "accepted" ? "Força de Vendas instalada. O ícone abre só nela." : "");
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void baixar()}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-4 text-sm font-black"
      >
        BAIXAR APP
        <Download size={16} className={pronto ? "text-emerald-400" : "text-zinc-400"} />
      </button>
      {aviso && <p className="text-center text-xs text-zinc-400">{aviso}</p>}
    </div>
  );
}
