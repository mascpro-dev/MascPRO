"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, History, Download, Send, Trophy, Lock, CheckCircle, PlayCircle, RotateCcw, MessageCircle, CornerDownRight, User } from "lucide-react";
import Link from "next/link";
import "plyr/dist/plyr.css"; 

export default function AulaPlayerPage() {
  const params = useParams();
  const supabase = createClientComponentClient();
  const courseCode = params?.code as string;

  const playerInstance = useRef<any>(null);
  
  // Dados Principais
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [progressMap, setProgressMap] = useState<Record<string, any>>({}); 
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  
  // Interação
  const [activeTab, setActiveTab] = useState<'info' | 'comments'>('info');
  const [comments, setComments] = useState<any[]>([]);
  
  // Inputs
  const [newComment, setNewComment] = useState("");
  const [replyText, setReplyText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionTarget, setMentionTarget] = useState<'comment' | 'reply' | null>(null);

  const [sendingComment, setSendingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Player
  const [hasJumped, setHasJumped] = useState(false);
  const [jumpTimeDisplay, setJumpTimeDisplay] = useState(0);

  const COINS_PER_LESSON = 10; 

  // 1. CARREGAMENTO
  useEffect(() => {
    async function fetchInitialData() {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setCurrentUser({ id: user.id });

        const [profileRes, lessonsRes, progressRes, usersRes] = await Promise.all([
            supabase.from("profiles").select("coins").eq("id", user.id).single(),
            supabase.from("lessons").select("*").ilike("course_code", courseCode).order("sequence_order", { ascending: true }),
            supabase.from("lesson_progress").select("lesson_id, completed, seconds_watched").eq("user_id", user.id),
            supabase.from("profiles").select("id, full_name, avatar_url") 
        ]);

        if (profileRes.data) setUserCoins(profileRes.data.coins || 0);
        if (usersRes.data) setAllUsers(usersRes.data);

        const pMap: Record<string, any> = {};
        if (progressRes.data) {
            progressRes.data.forEach((p: any) => pMap[p.lesson_id] = p);
            setProgressMap(pMap);
        }

        if (lessonsRes.data && lessonsRes.data.length > 0) {
            setLessons(lessonsRes.data);
            const nextToWatch = lessonsRes.data.find((l: any) => !pMap[l.id]?.completed) || lessonsRes.data[0];
            setCurrentLesson(nextToWatch);
        }
      } catch (err) {
        console.error("Erro carregamento:", err);
      } finally {
        setLoading(false);
      }
    }
    if (courseCode) fetchInitialData();
  }, [courseCode, supabase]);

  // 2. DETALHES
  useEffect(() => {
    if (!currentLesson) return;
    setHasJumped(false); 
    fetchComments();
  }, [currentLesson]); 

  async function fetchComments() {
      if (!currentLesson) return;
      const { data } = await supabase
        .from("lesson_comments")
        .select(`id, content, created_at, parent_id, user_id, profiles(full_name, avatar_url)`)
        .eq("lesson_id", currentLesson.id);
      
      if (data) setComments(data);
  }

  // ORDENAÇÃO INTELIGENTE
  const getSortedThreads = () => {
      const roots = comments.filter(c => !c.parent_id);
      const threadsWithActivity = roots.map(root => {
          const replies = comments.filter(c => c.parent_id === root.id);
          const dates = [new Date(root.created_at).getTime()];
          replies.forEach(r => dates.push(new Date(r.created_at).getTime()));
          const lastActivity = Math.max(...dates);
          return { root, replies, lastActivity };
      });
      return threadsWithActivity.sort((a, b) => b.lastActivity - a.lastActivity);
  };
  const sortedThreads = getSortedThreads();

  // 3. PLAYER
  useEffect(() => {
    if (!currentLesson || !currentLesson.video_id) return;
    const savedTime = progressMap[currentLesson.id]?.seconds_watched || 0;

    let player: any = null;
    if (playerInstance.current) { try { playerInstance.current.destroy(); } catch(e) {} playerInstance.current = null; }

    const loadPlayer = async () => {
        const Plyr = (await import("plyr")).default;
        player = new Plyr("#player-target", {
            autoplay: true,
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
            youtube: { noCookie: true, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 }
        });
        playerInstance.current = player;

        player.on('ready', () => {
            if (savedTime > 5) {
                setTimeout(() => {
                    player.currentTime = savedTime;
                    setJumpTimeDisplay(savedTime);
                    setHasJumped(true);
                }, 1000);
            }
        });

        player.on('timeupdate', (event: any) => {
            const currentTime = event.detail.plyr.currentTime;
            if (Math.floor(currentTime) > 0 && Math.floor(currentTime) % 5 === 0) {
                 salvarProgresso(currentTime, false);
            }
        });

        player.on('ended', () => {
            salvarProgresso(player.duration, true);
            pagarRecompensa();
        });
    };
    setTimeout(() => loadPlayer(), 100);
    return () => { if (playerInstance.current) { try { playerInstance.current.destroy(); } catch(e) {} } };
  }, [currentLesson?.id]); 

  const salvarProgresso = async (time: number, isCompleted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && currentLesson) {
        const updates: any = {
            user_id: user.id,
            lesson_id: currentLesson.id,
            seconds_watched: Math.floor(time),
            last_updated: new Date().toISOString()
        };
        if (isCompleted) updates.completed = true;

        setProgressMap(prev => ({
            ...prev,
            [currentLesson.id]: { ...prev[currentLesson.id], seconds_watched: time, completed: isCompleted ? true : prev[currentLesson.id]?.completed }
        }));
        supabase.from("lesson_progress").upsert(updates).then(({ error }) => { if (error) console.error("Erro save:", error); });
    }
  };

  const reiniciarAula = async () => {
    if (playerInstance.current) { playerInstance.current.currentTime = 0; playerInstance.current.play(); }
    setHasJumped(false);
    await salvarProgresso(0, false);
  };

  async function pagarRecompensa() {
    const { data: { user } } = await supabase.auth.getUser();
    const isAlreadyCompleted = progressMap[currentLesson.id]?.completed;
    if (user && !isAlreadyCompleted) {
        setUserCoins(prev => prev + COINS_PER_LESSON);
        supabase.rpc('add_pro_system', { user_id_param: user.id, amount: COINS_PER_LESSON, type_id: 1 }); 
    }
  }

  // --- MENÇÕES E COMENTÁRIOS ---
  const handleTyping = (text: string, target: 'comment' | 'reply') => {
      if (target === 'comment') setNewComment(text);
      else setReplyText(text);

      const words = text.split(" ");
      const lastWord = words[words.length - 1];

      if (lastWord.startsWith("@")) {
          setMentionQuery(lastWord.substring(1));
          setMentionTarget(target);
      } else {
          setMentionQuery(null);
          setMentionTarget(null);
      }
  };

  const selectMention = (userName: string) => {
      let currentText = mentionTarget === 'comment' ? newComment : replyText;
      const words = currentText.split(" ");
      words.pop();
      words.push(`@${userName} `);
      const newText = words.join(" ");

      if (mentionTarget === 'comment') setNewComment(newText);
      else setReplyText(newText);
      
      setMentionQuery(null);
      setMentionTarget(null);
  };

  // --- NOTIFICAÇÕES ---
  const createNotification = async (targetUserId: string, type: string, content: string) => {
      if (!currentUser || targetUserId === currentUser.id) return; 
      await supabase.from("notifications").insert({
          user_id: targetUserId,
          actor_id: currentUser.id,
          type,
          content,
          link: `/evolucao/${courseCode}`
      });
  };

  const processMentions = (text: string) => {
      const words = text.split(" ");
      const potentialMentions = words.filter(w => w.startsWith("@"));
      potentialMentions.forEach(mention => {
          const nameToFind = mention.substring(1).replace(/[^a-zA-Z0-9À-ÿ ]/g, ""); 
          const userFound = allUsers.find(u => u.full_name === nameToFind || u.full_name.split(" ")[0] === nameToFind);
          if (userFound) createNotification(userFound.id, 'mention', `marcou você em uma aula.`);
      });
  };

  async function handleSendComment(parentId: string | null = null) {
      const textToSend = parentId ? replyText.trim() : newComment.trim();
      if (!textToSend) return;
      
      setSendingComment(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && currentLesson) {
          const payload: any = {
              user_id: user.id,
              lesson_id: currentLesson.id,
              content: textToSend,
              parent_id: parentId
          };

          const { error } = await supabase.from("lesson_comments").insert(payload);
          if (!error) {
              processMentions(textToSend);
              if (parentId) {
                  const parentComment = comments.find(c => c.id === parentId);
                  if (parentComment) createNotification(parentComment.user_id, 'reply', 'respondeu sua dúvida na aula.');
              }
              setNewComment("");
              setReplyText("");
              setReplyingTo(null);
              fetchComments();
          }
      }
      setSendingComment(false);
  }

  const filteredUsers = mentionQuery ? allUsers.filter(u => u.full_name.toLowerCase().includes(mentionQuery!.toLowerCase())).slice(0, 5) : [];
  const renderText = (text: string) => {
    if (!text) return null;
    return text.split(/(\s+)/).map((part, index) => {
      if (part.startsWith('@') && part.length > 2) return <span key={index} className="text-[#C9A66B] font-bold">{part}</span>;
      return part;
    });
  };

  // MENU FLUTUANTE DE MENÇÃO
  const MentionMenu = () => {
    if (!mentionQuery && mentionQuery !== "") return null;
    if (filteredUsers.length === 0) return null;
    return (
        <div className="absolute bottom-full mb-2 left-0 w-64 bg-[#1a1a1a] border border-[#333] rounded-xl shadow-2xl overflow-hidden z-[9999]">
           <div className="p-2 border-b border-[#222] text-[10px] text-gray-500 font-bold uppercase bg-[#111]">Mencionar</div>
           {filteredUsers.map(u => (
               <button key={u.id} onClick={() => selectMention(u.full_name)} className="w-full text-left p-3 hover:bg-[#333] flex items-center gap-3 transition-colors border-b border-[#222] last:border-0">
                   <div className="w-6 h-6 rounded-full bg-[#333] overflow-hidden shrink-0">{u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : <User size={14} className="m-auto text-gray-500"/>}</div>
                   <span className="text-sm font-bold text-gray-300">{u.full_name}</span>
               </button>
           ))}
        </div>
    );
  };

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white"><Loader2 className="w-8 h-8 animate-spin text-[#C9A66B]" /></div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-4 md:p-8 pb-20">
      <style jsx global>{` :root { --plyr-color-main: #C9A66B; } .plyr--full-ui input[type=range] { color: #C9A66B; } .plyr__control--overlaid { background: rgba(201, 166, 107, 0.9); } .plyr--video { border-radius: 12px; overflow: hidden; border: 1px solid #333; } .plyr__video-embed iframe { pointer-events: none; } `}</style>

      {/* TOPO */}
      <div className="flex justify-between items-center mb-6">
        <Link href="/evolucao" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /><span className="font-bold text-sm tracking-wide">VOLTAR</span></Link>
        <div className="flex items-center gap-4">
            <div className="bg-[#1a1a1a] border border-[#333] px-3 py-1 rounded-lg flex items-center gap-2">
                <Trophy size={14} className="text-[#C9A66B]" />
                <span className="font-bold text-[#C9A66B] text-xs">{userCoins} <span className="text-gray-500 font-normal">PRO</span></span>
            </div>
            {hasJumped && <div className="flex items-center gap-1 text-xs text-green-500 font-bold animate-in fade-in bg-green-500/10 px-2 py-1 rounded border border-green-500/20"><History size={12} /> <span className="hidden sm:inline">Continuando de {Math.floor(jumpTimeDisplay/60)}min</span></div>}
             <div className="flex items-center gap-1 text-[10px] text-gray-600"><Save size={10} /></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          
          {/* PLAYER (Z-INDEX 10) */}
          <div className="aspect-video bg-black rounded-xl shadow-2xl shadow-black relative z-10">
            {currentLesson?.video_id ? (
                <div key={currentLesson.id} className="plyr__video-embed" id="player-target">
                    <iframe src={`https://www.youtube.com/embed/${currentLesson.video_id}?origin=https://plyr.io&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1`} allowFullScreen allow="autoplay"></iframe>
                </div>
            ) : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Carregando vídeo...</div>}
          </div>

          {/* ÁREA DE COMENTÁRIOS (Z-INDEX 20 e sem OVERFLOW-HIDDEN) */}
          <div className="bg-[#111] border border-[#222] rounded-lg relative z-20">
             <div className="flex border-b border-[#222]">
                <button onClick={() => setActiveTab('info')} className={`px-4 py-3 text-xs font-bold uppercase transition-colors rounded-tl-lg ${activeTab === 'info' ? "bg-[#C9A66B] text-black" : "text-gray-400 hover:bg-[#1a1a1a]"}`}>Material</button>
                <button onClick={() => setActiveTab('comments')} className={`px-4 py-3 text-xs font-bold uppercase transition-colors ${activeTab === 'comments' ? "bg-[#C9A66B] text-black" : "text-gray-400 hover:bg-[#1a1a1a]"}`}>Dúvidas</button>
             </div>
             <div className="p-4">
                {activeTab === 'info' && currentLesson && (
                    <div className="animate-in fade-in">
                        <div className="flex justify-between items-start mb-2">
                            <h1 className="text-lg font-bold text-white">{currentLesson.title}</h1>
                            <span className="bg-[#C9A66B]/10 text-[#C9A66B] text-[10px] font-bold px-2 py-0.5 rounded border border-[#C9A66B]/20 whitespace-nowrap">+{COINS_PER_LESSON} PRO</span>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-4">{currentLesson.description || "Assista a aula completa para liberar o próximo módulo."}</p>
                        <div className="flex gap-3">
                            {currentLesson.material_url && <a href={currentLesson.material_url} target="_blank" className="inline-flex items-center gap-2 bg-[#222] hover:bg-[#333] border border-[#333] text-white px-3 py-2 rounded text-xs font-bold transition-all"><Download size={14} className="text-[#C9A66B]" /> Baixar PDF</a>}
                            <button onClick={reiniciarAula} className="inline-flex items-center gap-2 bg-[#222] hover:bg-[#333] border border-[#333] text-gray-300 hover:text-white px-3 py-2 rounded text-xs font-bold transition-all"><RotateCcw size={14} /> Reiniciar Aula</button>
                        </div>
                    </div>
                )}
                {activeTab === 'comments' && (
                    <div className="animate-in fade-in">
                        <div className="flex gap-2 mb-6 relative z-30">
                            <div className="flex-1 relative">
                                <input type="text" value={newComment} onChange={(e) => handleTyping(e.target.value, 'comment')} onKeyDown={(e) => e.key === 'Enter' && handleSendComment(null)} placeholder="Faça uma pergunta... (Use @ para marcar)" className="w-full bg-[#0a0a0a] border border-[#333] rounded px-3 py-2 text-xs text-white focus:border-[#C9A66B] outline-none" />
                                {mentionTarget === 'comment' && <MentionMenu />}
                            </div>
                            <button onClick={() => handleSendComment(null)} disabled={sendingComment} className="bg-[#C9A66B] text-black px-3 py-2 rounded hover:bg-[#b08d55] disabled:opacity-50">{sendingComment ? <Loader2 size={14} className="animate-spin"/> : <Send size={14} />}</button>
                        </div>
                        <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
                            {sortedThreads.length === 0 && <p className="text-gray-600 text-xs text-center py-2">Nenhuma dúvida ainda.</p>}
                            
                            {sortedThreads.map(({ root: comment, replies }) => (
                                <div key={comment.id} className="group animate-in fade-in slide-in-from-top-1">
                                    <div className="flex gap-3 items-start">
                                        <div className="w-8 h-8 rounded-full bg-[#222] overflow-hidden shrink-0 mt-1">{comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">{comment.profiles?.full_name?.charAt(0)}</div>}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1"><span className="font-bold text-[#C9A66B] text-xs">{comment.profiles?.full_name}</span><span className="text-[10px] text-gray-600">{new Date(comment.created_at).toLocaleDateString()}</span></div>
                                            <div className="text-xs text-gray-300 bg-[#1a1a1a] p-3 rounded-lg rounded-tl-none border border-[#222]">{renderText(comment.content)}</div>
                                            <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="mt-1 text-[10px] text-gray-500 hover:text-[#C9A66B] font-bold flex items-center gap-1 transition-colors"><MessageCircle size={10} /> Responder</button>
                                        </div>
                                    </div>
                                    {replies.length > 0 && (
                                        <div className="ml-11 mt-3 space-y-3 pl-3 border-l-2 border-[#222]">
                                            {replies.map(reply => (
                                                <div key={reply.id} className="flex gap-2 items-start animate-in fade-in">
                                                     <div className="w-6 h-6 rounded-full bg-[#222] overflow-hidden shrink-0">{reply.profiles?.avatar_url ? <img src={reply.profiles.avatar_url} className="w-full h-full object-cover" /> : null}</div>
                                                    <div><span className="font-bold text-gray-400 text-[10px] mr-2">{reply.profiles?.full_name}</span><span className="text-xs text-gray-400">{renderText(reply.content)}</span></div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {replyingTo === comment.id && (
                                        <div className="ml-11 mt-3 flex gap-2 animate-in fade-in relative z-20">
                                            <CornerDownRight size={14} className="text-gray-600 mt-2" />
                                            <div className="flex-1 relative">
                                                <input autoFocus type="text" value={replyText} onChange={(e) => handleTyping(e.target.value, 'reply')} onKeyDown={(e) => e.key === 'Enter' && handleSendComment(comment.id)} placeholder="Sua resposta..." className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-xs text-white focus:border-[#C9A66B] outline-none" />
                                                {mentionTarget === 'reply' && <MentionMenu />}
                                            </div>
                                            <button onClick={() => handleSendComment(comment.id)} className="bg-[#C9A66B] text-black px-3 py-2 rounded hover:bg-[#b08d55]"><Send size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
          </div>
        </div>

        <div className="bg-[#111] border border-[#222] rounded-lg p-5 h-fit relative z-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Trilha do Módulo</h3>
          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
            {lessons.map((lesson, index) => {
              const isActive = lesson.id === currentLesson?.id;
              const isLocked = index > 0 && !progressMap[lessons[index-1].id]?.completed;
              const isCompleted = progressMap[lesson.id]?.completed;
              return (
                <button key={lesson.id} disabled={isLocked} onClick={() => { setCurrentLesson(lesson); setActiveTab('info'); }} className={`w-full flex items-center gap-3 p-3 rounded text-left transition-all border ${isActive ? "bg-[#C9A66B]/10 border-[#C9A66B]/30" : isLocked ? "opacity-50 cursor-not-allowed border-transparent" : "hover:bg-white/5 border-transparent"}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isCompleted ? "bg-green-500 text-black" : isActive ? "bg-[#C9A66B] text-black" : "bg-[#222] text-gray-500"}`}>{isCompleted ? <CheckCircle size={12} /> : isLocked ? <Lock size={10} /> : index + 1}</div>
                  <div className="flex-1"><p className={`text-xs font-bold leading-tight ${isActive ? "text-white" : "text-gray-400"}`}>{lesson.title}</p></div>
                  {isActive && <PlayCircle size={14} className="text-[#C9A66B]" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
