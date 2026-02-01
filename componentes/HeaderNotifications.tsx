"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Bell } from "lucide-react";
import Link from "next/link"; // Importante para o redirecionamento

export default function HeaderNotifications() {
  const supabase = createClientComponentClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. Carregar Inicial
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchNotifications(user.id);
      }
    };
    init();
  }, []);

  // 2. Realtime (Modo Blindado)
  useEffect(() => {
    if (!userId) return;

    console.log("🟢 Conectando ao Realtime de notificações...");

    const channel = supabase.channel('global_notifications')
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications'
          // Removi o filtro aqui para garantir que o evento chegue. Filtramos abaixo.
        }, 
        (payload) => {
          // Só atualiza se a notificação for para MIM
          if (payload.new.user_id === userId) {
            console.log("🔔 Ding Dong! Notificação recebida:", payload.new);
            
            // Toca um som suave (opcional)
            const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-software-interface-start-2574.mp3');
            audio.volume = 0.2;
            audio.play().catch(() => {}); // Ignora erro se navegador bloquear

            fetchNotifications(userId);
          }
        }
      )
      .subscribe((status) => {
          console.log("Status da conexão:", status);
      });

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchNotifications = async (uid: string) => {
    const { data } = await supabase
      .from("notifications")
      .select(`*, profiles:actor_id(full_name, avatar_url)`)
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
  };

  const markAsRead = async () => {
    if (unreadCount > 0 && userId) {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    }
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) markAsRead();
  };

  const timeAgo = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime())/1000;
    if(diff<60) return "agora";
    if(diff<3600) return `${Math.floor(diff/60)}m`;
    if(diff<86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  };

  return (
    <div className="relative">
      <button 
        onClick={toggleOpen} 
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-white"
      >
        <Bell size={20} className={unreadCount > 0 ? "text-[#C9A66B]" : "text-gray-400"} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-600 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          <div className="absolute right-0 top-12 w-80 bg-[#111] border border-[#222] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="p-3 border-b border-[#222] font-bold text-xs text-gray-400 uppercase flex justify-between items-center bg-[#0a0a0a]">
                <span>Notificações</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <p className="p-6 text-center text-xs text-gray-600">Nenhuma notificação.</p>
              ) : (
                notifications.map(n => (
                  <Link 
                    key={n.id} 
                    href={n.link || "#"} // AQUI ESTÁ A MÁGICA DO REDIRECIONAMENTO
                    onClick={() => setIsOpen(false)}
                    className={`block p-3 border-b border-[#222] flex gap-3 hover:bg-[#1a1a1a] transition-colors ${n.read ? "opacity-60" : "bg-[#161616]"}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#222] overflow-hidden shrink-0 mt-1">
                      {n.profiles?.avatar_url && <img src={n.profiles.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="text-xs text-gray-300 leading-snug">
                        <span className="font-bold text-[#C9A66B]">{n.profiles?.full_name || "Alguém"}</span> {n.content}
                      </p>
                      <p className="text-[9px] text-gray-600 mt-1 font-bold">{timeAgo(n.created_at)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
