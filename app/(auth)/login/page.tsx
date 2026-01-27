"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { Link as LinkIcon, MessageCircle, ArrowLeft, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Controle da tela: 'login' ou 'pasteLink'
  const [viewState, setViewState] = useState<'login' | 'pasteLink'>('login');
  const [inviteLink, setInviteLink] = useState("");

  const router = useRouter();
  const supabase = createClientComponentClient();

  // 1. Lógica de Login (Normal)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Erro: " + error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  // 2. Lógica de Redirecionamento pelo Link
  const handleInviteRedirect = () => {
    if (!inviteLink.trim()) return alert("Por favor, cole o link primeiro.");
    
    // Tenta ser inteligente: se a pessoa colar só o código, ou o link completo
    try {
        // Se for um link completo, vai direto
        if (inviteLink.includes('http')) {
            window.location.href = inviteLink;
        } else {
            // Se colar só um código solto, assume que é para cadastro
            router.push(`/cadastro?invite=${inviteLink}`);
        }
    } catch (e) {
        alert("Link inválido.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
      <div className="w-full max-w-md bg-[#111] border border-[#222] rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Cabeçalho Fixo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold italic tracking-tighter mb-2">MASC PRO</h1>
          <p className="text-gray-400 text-sm">
            {viewState === 'login' ? "Entre para acessar sua evolução." : "Ative seu convite exclusivo."}
          </p>
        </div>

        {/* --- TELA 1: LOGIN PADRÃO --- */}
        {viewState === 'login' && (
          <>
            <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white focus:border-[#C9A66B] outline-none transition-colors"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg p-3 text-white focus:border-[#C9A66B] outline-none transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                disabled={loading}
                className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-3 rounded-lg transition-all uppercase tracking-wide"
              >
                {loading ? "Entrando..." : "Entrar na Plataforma"}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-[#222] space-y-3">
              <p className="text-center text-gray-500 text-xs mb-4">AINDA NÃO TEM CONTA?</p>
              
              {/* Botão: JÁ TENHO O LINK */}
              <button 
                onClick={() => setViewState('pasteLink')}
                className="flex items-center justify-center gap-2 w-full bg-[#222] hover:bg-[#333] text-white py-3 rounded-lg transition-all text-sm font-bold border border-[#333]"
              >
                <LinkIcon size={16} className="text-[#C9A66B]" />
                JÁ TENHO MEU LINK DE CONVITE
              </button>

              {/* Botão: PEDIR NO WHATSAPP */}
              <a 
                href="https://wa.me/5514991570389?text=Olá,%20gostaria%20de%20pedir%20um%20link%20de%20convite%20para%20o%20MASC%20PRO."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full border border-[#222] hover:border-[#25D366] hover:bg-[#25D366]/10 text-gray-400 hover:text-[#25D366] py-3 rounded-lg transition-all text-sm font-bold"
              >
                <MessageCircle size={16} />
                PEDIR LINK DE INDICAÇÃO
              </a>
            </div>
          </>
        )}

        {/* --- TELA 2: COLAR O LINK --- */}
        {viewState === 'pasteLink' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#333] mb-6">
              <label className="block text-xs font-bold text-[#C9A66B] uppercase mb-2">
                Cole o link recebido aqui:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  onChange={(e) => setInviteLink(e.target.value)}
                  className="w-full bg-black border border-[#333] rounded p-3 text-sm text-white focus:border-[#C9A66B] outline-none"
                  placeholder="Ex: mascpro.com/cadastro?invite=..."
                  autoFocus
                />
              </div>
              <button 
                onClick={handleInviteRedirect}
                className="w-full mt-3 bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold py-3 rounded transition-all flex items-center justify-center gap-2"
              >
                ACESSAR CADASTRO <ArrowRight size={16} />
              </button>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-xs mb-3">Não tem o link ou perdeu?</p>
              
              {/* Botão VOLTAR E PEDIR */}
              <button
                onClick={() => setViewState('login')} // Volta para a tela inicial
                className="text-gray-400 hover:text-white text-sm underline flex items-center justify-center gap-2 w-full py-2"
              >
                <ArrowLeft size={14} />
                Voltar e Pedir meu Link
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
