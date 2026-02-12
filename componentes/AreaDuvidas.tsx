"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Send, MessageSquare, Loader2, User } from "lucide-react";

export default function AreaDuvidas({ lessonId, currentUser }: { lessonId: string, currentUser: any }) {
  const supabase = createClientComponentClient();
  const [duvidas, setDuvidas] = useState<any[]>([]);
  const [textoDuvida, setTextoDuvida] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // 1. BUSCAR DÚVIDAS ANTERIORES
  useEffect(() => {
    if (lessonId) {
      fetchDuvidas();
    }
  }, [lessonId]);

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
      setAllUsers(data || []);
    }
    loadUsers();
  }, []);

  async function fetchDuvidas() {
    const { data, error } = await supabase
      .from('lesson_comments')
      .select(`*, profiles(full_name, avatar_url)`)
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: false });

    if (data) setDuvidas(data);
  }

  // 2. LÓGICA DE MENÇÃO @
  const handleTyping = (text: string) => {
    setTextoDuvida(text);
    const words = text.split(/\s/);
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith("@")) {
      setMentionQuery(lastWord.substring(1));
    } else {
      setMentionQuery(null);
    }
  };

  const selectUser = (name: string) => {
    const words = textoDuvida.split(/\s/);
    words.pop();
    setTextoDuvida([...words, `@${name} `].join(" "));
    setMentionQuery(null);
  };

  // 3. ENVIAR NOVA DÚVIDA
  const postarDuvida = async () => {
    if (!textoDuvida.trim() || !currentUser) return;
    setEnviando(true);
    const { error } = await supabase.from('lesson_comments').insert({
      lesson_id: lessonId,
      user_id: currentUser.id,
      content: textoDuvida.trim()
    });

    if (!error) {
      setTextoDuvida("");
      fetchDuvidas(); // Recarrega a lista
    }
    setEnviando(false);
  };

  return (
    <div className="mt-8 border-t border-white/5 pt-6">
      <h3 className="text-lg font-black italic uppercase mb-4 flex items-center gap-2">
        <MessageSquare className="text-[#C9A66B]" size={20} /> Dúvidas da Aula
      </h3>

      {/* CAMPO DE ENTRADA */}
      <div className="relative mb-6">
        <div className="flex gap-2">
          <textarea 
            value={textoDuvida}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Tire sua dúvida aqui... use @ para marcar"
            className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#C9A66B]/50 resize-none h-20"
          />
          <button 
            onClick={postarDuvida}
            disabled={enviando || !textoDuvida.trim()}
            className="bg-[#C9A66B] text-black px-4 rounded-xl hover:brightness-110 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {enviando ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </div>
        
        {/* MENU DE MENÇÃO (Aparece se digitar @) */}
        {mentionQuery !== null && (
          <div className="absolute bottom-full mb-2 bg-zinc-900 border border-white/10 w-64 rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto">
            <p className="p-3 text-[10px] text-zinc-500 font-bold uppercase border-b border-white/5">Marcar usuário...</p>
            {allUsers.filter(u => u.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())).length > 0 ? (
              allUsers.filter(u => u.full_name?.toLowerCase().includes(mentionQuery.toLowerCase())).map(user => (
                <button
                  key={user.id}
                  onClick={() => selectUser(user.full_name)}
                  className="w-full text-left px-4 py-3 hover:bg-zinc-800 flex items-center gap-3 text-sm border-b border-white/5 last:border-0 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border border-white/10">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      <User size={12} className="text-zinc-500" />
                    )}
                  </div>
                  <span className="truncate font-medium text-zinc-300">{user.full_name}</span>
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-xs text-zinc-500">Ninguém encontrado...</div>
            )}
          </div>
        )}
      </div>

      {/* LISTA DE DÚVIDAS ANTERIORES */}
      <div className="space-y-4">
        {duvidas.length === 0 ? (
          <p className="text-zinc-600 text-sm italic">Nenhuma dúvida enviada ainda nesta aula.</p>
        ) : (
          duvidas.map((d) => (
            <div key={d.id} className="bg-zinc-900/30 border border-white/5 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden border border-white/10">
                  {d.profiles?.avatar_url && <img src={d.profiles.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <p className="text-[10px] font-black text-[#C9A66B] uppercase">{d.profiles?.full_name}</p>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {/* Aqui aplicamos a cor no @ caso exista */}
                {d.content.split(" ").map((word: string, i: number) => 
                  word.startsWith("@") ? <span key={i} className="text-[#C9A66B] font-bold">{word} </span> : word + " "
                )}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
