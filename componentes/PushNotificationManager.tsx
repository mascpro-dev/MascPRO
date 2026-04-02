"use client";
import { useEffect, useState } from "react";
import { Bell, X, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type StatusMsg = { tipo: "ok" | "erro"; msg: string } | null;

export default function PushNotificationManager() {
  const [status, setStatus] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");
  const [mostrarBanner, setMostrarBanner] = useState(false);
  const [fechado, setFechado] = useState(false);
  const [statusMsg, setStatusMsg] = useState<StatusMsg>(null);
  const [ativando, setAtivando] = useState(false);
  const [mostrarReativar, setMostrarReativar] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    const permissao = Notification.permission;
    if (permissao === "granted") {
      setStatus("granted");
      // Força re-registro sempre que a página carrega — garante que a subscription está no banco
      registrarSW(true);
    } else if (permissao === "denied") {
      setStatus("denied");
    } else {
      const jaFechou = localStorage.getItem("push_banner_fechado");
      if (!jaFechou) {
        setTimeout(() => setMostrarBanner(true), 3000);
      }
    }
  }, []);

  async function registrarSW(silencioso = false): Promise<boolean> {
    if (!VAPID_PUBLIC) {
      if (!silencioso) setStatusMsg({ tipo: "erro", msg: "❌ Chave VAPID não configurada no servidor Vercel. Adicione NEXT_PUBLIC_VAPID_PUBLIC_KEY nas variáveis de ambiente." });
      return false;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Força nova subscription se necessário
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
        });
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      const d = await res.json().catch(() => null);

      if (!res.ok || !d?.ok) {
        const msg = d?.code === "42P01"
          ? "❌ Tabela push_subscriptions não existe. Rode o SQL no Supabase."
          : `❌ Erro ao salvar: ${d?.error || "verifique as permissões no Supabase"}`;
        if (!silencioso) setStatusMsg({ tipo: "erro", msg });
        setMostrarReativar(true);
        return false;
      }

      if (!silencioso) {
        setStatusMsg({ tipo: "ok", msg: "✅ Notificações ativas! Você receberá alertas mesmo com a tela bloqueada." });
        setTimeout(() => setStatusMsg(null), 5000);
      }
      setMostrarReativar(false);
      return true;
    } catch (e: any) {
      if (!silencioso) setStatusMsg({ tipo: "erro", msg: `❌ Erro: ${e.message}` });
      setMostrarReativar(true);
      return false;
    }
  }

  async function ativarNotificacoes() {
    setAtivando(true);
    setMostrarBanner(false);
    const permissao = await Notification.requestPermission();
    if (permissao === "granted") {
      setStatus("granted");
      await registrarSW(false);
    } else {
      setStatus("denied");
      setStatusMsg({ tipo: "erro", msg: "❌ Permissão negada. Habilite notificações nas configurações do navegador." });
    }
    setAtivando(false);
  }

  async function reativar() {
    setAtivando(true);
    setStatusMsg(null);
    // Remove subscription antiga e cria nova
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (reg) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
    }
    await registrarSW(false);
    setAtivando(false);
  }

  function fecharBanner() {
    setMostrarBanner(false);
    setFechado(true);
    localStorage.setItem("push_banner_fechado", "1");
  }

  if (status === "unsupported" || fechado) return null;

  return (
    <>
      {/* FEEDBACK */}
      {statusMsg && (
        <div className={`fixed top-4 left-4 right-4 z-[600] md:left-auto md:right-6 md:w-96 rounded-2xl px-5 py-4 shadow-2xl border flex items-start gap-3
          ${statusMsg.tipo === "ok"
            ? "bg-green-900/90 border-green-700 text-green-300"
            : "bg-red-900/90 border-red-700 text-red-300"}`}>
          {statusMsg.tipo === "ok"
            ? <CheckCircle size={18} className="shrink-0 mt-0.5" />
            : <AlertCircle size={18} className="shrink-0 mt-0.5" />}
          <div className="flex-1">
            <p className="text-xs font-bold leading-relaxed">{statusMsg.msg}</p>
            {mostrarReativar && (
              <button onClick={reativar} disabled={ativando}
                className="mt-2 flex items-center gap-1 text-[10px] font-black uppercase text-red-300 hover:text-white underline">
                <RefreshCw size={10} /> {ativando ? "Tentando..." : "Tentar novamente"}
              </button>
            )}
          </div>
          <button onClick={() => setStatusMsg(null)}><X size={14} className="shrink-0 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* BANNER INICIAL */}
      {mostrarBanner && !fechado && (
        <div className="fixed bottom-24 left-4 right-4 z-[500] md:left-auto md:right-6 md:w-80">
          <div className="bg-zinc-900 border border-[#C9A66B]/30 rounded-2xl p-4 shadow-2xl shadow-black/60">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#C9A66B]/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bell size={18} className="text-[#C9A66B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-white">Ativar notificações</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                  Receba comunicados e promoções mesmo com o celular bloqueado.
                </p>
                <div className="flex gap-2 mt-3">
                  <button onClick={ativarNotificacoes} disabled={ativando}
                    className="flex-1 bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black text-[10px] uppercase tracking-widest py-2 rounded-xl transition-all">
                    {ativando ? "Ativando..." : "Ativar agora"}
                  </button>
                  <button onClick={fecharBanner}
                    className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[10px] font-bold transition-all">
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
      )}
    </>
  );
}
