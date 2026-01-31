"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Trophy, MessageSquare, Heart, ImageIcon, X, Loader2, Send } from "lucide-react";

export default function ComunidadePage() {
  const supabase = createClientComponentClient();
  const [activeTab, setActiveTab] = useState<'ranking' | 'feed'>('ranking');
  
  // Dados
  const [ranking, setRanking] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Inputs
  const [newPostText, setNewPostText] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    console.log("🔄 Iniciando carregamento de dados...");
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      console.log("✅ Usuário autenticado:", user.id);
      // Busca Perfil
      const { data: myProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (profileError) console.error("❌ Erro ao buscar perfil:", profileError);
      else console.log("✅ Perfil encontrado:", myProfile);

      setCurrentUser(myProfile || { id: user.id, full_name: "Usuário", avatar_url: null });
    } else {
      console.error("⚠️ Nenhum usuário logado!");
    }

    // Busca Posts
    await refreshFeed();
  }

  async function refreshFeed() {
    console.log("🔄 Buscando posts no banco...");
    
    // ATENÇÃO AQUI: Mudamos 'profiles' para 'profiles:posts_author_fkey'
    // Isso resolve o erro PGRST201 dizendo exatamente qual caminho seguir.
    const { data: postsData, error } = await supabase
      .from("posts")
      .select(`
        id, content, image_url, created_at, likes_count,
        profiles:posts_author_fkey (full_name, avatar_url, role)
      `)
      .order("created_at", { ascending: false });

    if (error) {
        console.error("❌ Erro ao buscar feed:", error);
    } else {
        console.log("✅ Posts carregados:", postsData?.length);
        setPosts(postsData || []);
    }
  }

  // --- POSTAGEM COM LOGS DETALHADOS ---
  const handlePublish = async () => {
    console.log("🚀 Botão POSTAR clicado!");
    
    if (!newPostText.trim() && !newPostImage) {
        console.warn("⚠️ Tentativa de postar vazio.");
        return alert("Escreva algo!");
    }
    if (!currentUser) {
        console.error("❌ Erro: currentUser é nulo.");
        return alert("Erro de sessão. Recarregue a página.");
    }

    try {
      setPosting(true);
      let finalImageUrl = null;

      // 1. Upload da Imagem
      if (newPostImage) {
        console.log("📸 Iniciando upload da imagem...");
        const fileExt = newPostImage.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("feed-images")
          .upload(fileName, newPostImage);

        if (uploadError) {
            console.error("❌ Erro no Storage:", uploadError);
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("feed-images")
          .getPublicUrl(fileName);
        
        finalImageUrl = publicUrl;
        console.log("✅ Imagem enviada:", finalImageUrl);
      }

      // 2. Insert no Banco
      console.log("📝 Tentando salvar no banco de dados...");
      const payload = {
        user_id: currentUser.id,
        content: newPostText,
        image_url: finalImageUrl
      };
      console.log("📦 Payload:", payload);

      const { data: insertData, error: dbError } = await supabase
        .from("posts")
        .insert(payload)
        .select(); // IMPORTANTE: .select() retorna o que foi salvo

      if (dbError) {
        console.error("❌ ERRO CRÍTICO NO BANCO:", dbError);
        alert("Erro ao salvar: " + dbError.message);
        throw dbError;
      }

      console.log("✅ Sucesso! Dados salvos:", insertData);

      // 3. Limpeza
      setNewPostText("");
      setNewPostImage(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(null);
      
      console.log("🔄 Atualizando feed...");
      await refreshFeed();
      
    } catch (error: any) {
      console.error("💥 Erro capturado no catch:", error);
    } finally {
      setPosting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPostImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const timeAgo = (dateString: string) => {
    const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#000000] text-white font-sans pb-20">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold italic tracking-wide">
          COMUNIDADE <span className="text-[#C9A66B]">PRO</span>
        </h1>
        </div>

      <div className="flex w-full bg-[#111] p-1 rounded-xl mb-6 border border-[#222]">
        <button 
          onClick={() => setActiveTab('ranking')} 
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg transition-all ${
            activeTab === 'ranking' 
              ? "bg-[#C9A66B] text-black" 
              : "text-gray-500 hover:text-white"
          }`}
        >
          Ranking
        </button>
        <button 
          onClick={() => setActiveTab('feed')} 
          className={`flex-1 py-3 text-sm font-bold uppercase rounded-lg transition-all ${
            activeTab === 'feed' 
              ? "bg-[#C9A66B] text-black" 
              : "text-gray-500 hover:text-white"
          }`}
        >
          Feed Social
        </button>
      </div>

      {activeTab === 'ranking' && (
        <div className="text-center text-gray-500 py-10">
          Ranking aqui...
        </div>
      )}

      {activeTab === 'feed' && (
        <div className="max-w-2xl mx-auto">
          
          {/* CRIAR POST */}
          <div className="bg-[#111] border border-[#222] p-4 rounded-xl mb-6">
            <div className="flex gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#222] shrink-0 overflow-hidden border border-[#333]">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                    {currentUser?.full_name?.substring(0,2).toUpperCase() || "U"}
                  </div>
                )}
              </div>
            <textarea
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="No que você está pensando?"
                className="w-full bg-transparent text-sm text-white placeholder-gray-600 outline-none resize-none h-20"
              />
            </div>
            {previewUrl && (
              <div className="relative mb-3 w-fit">
                <img src={previewUrl} className="h-40 rounded-lg border border-[#333]" alt="Preview" />
                <button 
                  onClick={() => { 
                    setNewPostImage(null); 
                    if (previewUrl) {
                      URL.revokeObjectURL(previewUrl);
                    }
                    setPreviewUrl(null); 
                  }} 
                  className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                >
                  <X size={12}/>
                </button>
              </div>
            )}
            <div className="flex justify-between items-center border-t border-[#222] pt-3">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageSelect} 
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="text-gray-400 hover:text-white flex items-center gap-2 text-xs font-bold transition-colors"
              >
                <ImageIcon size={18} /> FOTO
              </button>
              <button 
                onClick={handlePublish} 
                disabled={posting || (!newPostText.trim() && !newPostImage)} 
                className="bg-[#C9A66B] text-black text-xs font-bold px-6 py-2 rounded-lg hover:bg-[#b08d55] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {posting ? (
                  <Loader2 size={16} className="animate-spin"/>
                ) : (
                  "POSTAR"
                )}
              </button>
            </div>
          </div>

          {/* LISTA POSTS */}
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                <p>Nenhum post encontrado.</p>
                <p className="text-xs mt-2">(Verifique o console para logs)</p>
                <button
                  onClick={() => refreshFeed()}
                  className="mt-4 text-xs text-[#C9A66B] hover:underline"
                >
                  Recarregar feed
                </button>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="bg-[#111] border border-[#222] rounded-xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#222] overflow-hidden border border-[#333]">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt={post.profiles.full_name || "User"} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                            {post.profiles?.full_name?.substring(0,2).toUpperCase() || "U"}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{post.profiles?.full_name || "Membro"}</p>
                        <p className="text-[10px] text-gray-500">{timeAgo(post.created_at)}</p>
                      </div>
                    </div>
                  </div>
                  {post.content && (
                    <div className="px-4 pb-3 text-sm text-gray-300 whitespace-pre-wrap">
                      {post.content}
                    </div>
                  )}
                  {post.image_url && (
                    <div className="w-full bg-black">
                      <img src={post.image_url} className="w-full h-auto max-h-[500px] object-contain" alt="Post" />
                    </div>
                  )}
                  <div className="p-3 border-t border-[#222] flex gap-4 text-gray-500">
                    <Heart size={18}/> 
                    <span className="text-xs">{post.likes_count || 0}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
