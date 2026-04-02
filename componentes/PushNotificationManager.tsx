"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function PushNotificationManager() {
  const [status, setStatus] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    const permissao = Notification.permission;
    if (permissao === "granted") {
      setStatus("granted");
      registrarSW();
    } else if (permissao === "denied") {
      setStatus("denied");
    } else {
      // Mostra banner após 3 segundos se ainda não pediu permissão
      const jaFechou = localStorage.getItem("push_banner_fechado");
      if (!jaFechou) {
        setTimeout(() => setMostrarBanner(true), 3000);
      }
    }
  }, []);

  async function registrarSW() {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Verifica se já tem subscription ativa
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }

      // Salva no banco
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
    } catch (e) {
      console.error("Erro ao registrar push:", e);
    }
  }

  async function ativarNotificacoes() {
    setMostrarBanner(false);
    const permissao = await Notification.requestPermission();
    if (permissao === "granted") {
      setStatus("granted");
      await registrarSW();
    } else {
      setStatus("denied");
    }
  }

  function fecharBanner() {
    setMostrarBanner(false);
    setFechado(true);
    localStorage.setItem("push_banner_fechado", "1");
  }

  if (status === "unsupported" || fechado || !mostrarBanner) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[500] md:left-auto md:right-6 md:w-80">
      <div className="bg-zinc-900 border border-[#C9A66B]/30 rounded-2xl p-4 shadow-2xl shadow-black/60">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C9A66B]/10 flex items-center justify-center shrink-0 mt-0.5">
            <Bell size={18} className="text-[#C9A66B]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm text-white">Ativar notificações</p>
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
              Receba avisos de comunicados, promoções e novidades mesmo com o celular bloqueado.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={ativarNotificacoes}
                className="flex-1 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black text-[10px] uppercase tracking-widest py-2 rounded-xl transition-all"
              >
                Ativar
              </button>
              <button
                onClick={fecharBanner}
                className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-bold transition-all"
              >
                Agora não
              </button>
            </div>
          </div>
          <button onClick={fecharBanner} className="text-zinc-600 hover:text-white p-1 shrink-0">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
