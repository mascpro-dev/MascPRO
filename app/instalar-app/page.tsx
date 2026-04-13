"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Download,
  Loader2,
  Monitor,
  Share2,
  Smartphone,
} from "lucide-react";

type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const APP_DOWNLOAD_UNIVERSAL = process.env.NEXT_PUBLIC_MASCPRO_APP_DOWNLOAD_URL?.trim() || "";
const APP_IOS_URL = process.env.NEXT_PUBLIC_MASCPRO_APP_IOS_URL?.trim() || "";
const APP_ANDROID_URL = process.env.NEXT_PUBLIC_MASCPRO_APP_ANDROID_URL?.trim() || "";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

export default function InstalarAppPage() {
  const [deferred, setDeferred] = useState<BipEvent | null>(null);
  const [jaInstalado, setJaInstalado] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isDev, setIsDev] = useState(false);
  const [swOk, setSwOk] = useState<boolean | null>(null);

  useEffect(() => {
    const dev = process.env.NODE_ENV === "development";
    setIsDev(dev);
    if (isStandalone()) {
      setJaInstalado(true);
      return;
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BipEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);

    if ("serviceWorker" in navigator && !dev) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) =>
          setSwOk(Boolean(reg.active || reg.installing || reg.waiting))
        )
        .catch(() => setSwOk(false));
    }

    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  const tentarInstalarPwa = useCallback(async () => {
    if (!deferred) return;
    setInstalando(true);
    setMsg(null);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      setMsg(outcome === "accepted" ? "Ótimo! O app deve aparecer na sua tela inicial ou menu." : "Tudo bem — você pode instalar pelo menu do navegador (veja as dicas abaixo).");
      setDeferred(null);
    } catch {
      setMsg("Use o menu do navegador para instalar (instruções abaixo).");
    } finally {
      setInstalando(false);
    }
  }, [deferred]);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10">
      <div className="max-w-lg mx-auto">
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#C9A66B] transition-colors"
          >
            <ArrowLeft size={14} /> Voltar ao perfil
          </Link>
          <Link
            href="/home"
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Ir ao início
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[#C9A66B]/15 flex items-center justify-center">
              <Smartphone className="text-[#C9A66B]" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black italic uppercase leading-tight">
                App <span className="text-[#C9A66B]">Masc PRO</span>
              </h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Instalação na tela inicial (PWA)</p>
            </div>
          </div>

          <p className="text-sm text-zinc-400 mt-4 leading-relaxed">
            O Masc PRO funciona como aplicativo pelo navegador: você instala uma vez e abre direto da tela inicial,
            sem precisar da loja — desde que use um navegador compatível (Chrome, Edge, Safari).
          </p>

          {isDev && (
            <div className="mt-4 rounded-xl border border-amber-700/40 bg-amber-950/30 px-4 py-3 text-xs text-amber-200">
              Em ambiente de desenvolvimento o PWA costuma ficar desligado. Para testar a instalação de verdade, use o site publicado em HTTPS (produção).
            </div>
          )}

          {jaInstalado && (
            <div className="mt-6 flex items-start gap-2 rounded-xl border border-green-700/40 bg-green-950/25 px-4 py-3 text-sm text-green-300">
              <CheckCircle size={18} className="shrink-0 mt-0.5" />
              <span>Você já está usando o Masc PRO como app (modo standalone).</span>
            </div>
          )}

          {!jaInstalado && deferred && (
            <button
              type="button"
              disabled={instalando}
              onClick={() => void tentarInstalarPwa()}
              className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-[#C9A66B] py-4 text-sm font-black uppercase tracking-widest text-black hover:bg-[#b08d55] disabled:opacity-60 transition-colors"
            >
              {instalando ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
              {instalando ? "Abrindo instalador…" : "Instalar / adicionar à tela inicial"}
            </button>
          )}

          {!jaInstalado && !deferred && !isIOS && (
            <div className="mt-6 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-zinc-400">
              <p className="font-bold text-zinc-300 mb-1">Não apareceu o botão de instalar?</p>
              <p>
                No <strong className="text-zinc-200">Chrome</strong> ou <strong className="text-zinc-200">Edge</strong> no computador: ícone de instalação (⊕ ou monitor com seta) na barra de endereços, ou menu{" "}
                <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300">⋮</kbd> → <strong className="text-zinc-200">Instalar Masc PRO…</strong> / <strong className="text-zinc-200">Aplicativos</strong>.
              </p>
              {swOk === false && (
                <p className="mt-2 text-amber-200/90">
                  Confirme que está em HTTPS e que o build de produção gerou o service worker (<code className="text-[10px]">/sw.js</code>).
                </p>
              )}
            </div>
          )}

          {msg && (
            <p className="mt-4 text-sm text-zinc-300">{msg}</p>
          )}

          {!jaInstalado && isIOS && (
            <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
              <div className="flex items-center gap-2 text-[#C9A66B] font-black uppercase text-[10px] tracking-widest">
                <Share2 size={14} /> iPhone / iPad (Safari)
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-400 leading-relaxed">
                <li>Abra este site no <strong className="text-zinc-200">Safari</strong> (no Chrome do iOS a instalação na tela inicial não funciona igual).</li>
                <li>Toque no botão <strong className="text-zinc-200">Compartilhar</strong> <span className="inline-flex align-middle"><Share2 size={12} className="inline" /></span>.</li>
                <li>Role e escolha <strong className="text-zinc-200">Adicionar à Tela de Início</strong> → Adicionar.</li>
              </ol>
            </div>
          )}

          {!jaInstalado && isAndroid && !deferred && (
            <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
              <div className="flex items-center gap-2 text-[#C9A66B] font-black uppercase text-[10px] tracking-widest">
                <Smartphone size={14} /> Android (Chrome)
              </div>
              <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-400 leading-relaxed">
                <li>No Chrome, toque no menu <strong className="text-zinc-200">⋮</strong> (três pontos).</li>
                <li>
                  <strong className="text-zinc-200">Instalar app</strong> ou <strong className="text-zinc-200">Adicionar à tela inicial</strong>.
                </li>
              </ol>
            </div>
          )}

          {!jaInstalado && !isIOS && !isAndroid && !deferred && (
            <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-zinc-300">
              <div className="flex items-center gap-2 text-[#C9A66B] font-black uppercase text-[10px] tracking-widest">
                <Monitor size={14} /> Computador (Windows / Mac)
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Use Chrome ou Edge. Procure o ícone de instalação na barra de endereço ou no menu do navegador para fixar o Masc PRO como aplicativo.
              </p>
            </div>
          )}

          {(APP_DOWNLOAD_UNIVERSAL || APP_IOS_URL || APP_ANDROID_URL) && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3">Versão nas lojas (opcional)</p>
              <div className="flex flex-wrap gap-3">
                {APP_DOWNLOAD_UNIVERSAL && (
                  <a
                    href={APP_DOWNLOAD_UNIVERSAL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#C9A66B] hover:underline"
                  >
                    Link oficial de download
                  </a>
                )}
                {APP_ANDROID_URL && (
                  <a
                    href={APP_ANDROID_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-zinc-400 hover:text-[#C9A66B]"
                  >
                    Google Play
                  </a>
                )}
                {APP_IOS_URL && (
                  <a
                    href={APP_IOS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-zinc-400 hover:text-[#C9A66B]"
                  >
                    App Store
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
