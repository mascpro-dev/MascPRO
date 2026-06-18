"use client";
import { useState } from "react";
import { UserPlus, Loader2, KeyRound, Copy, CheckCircle2 } from "lucide-react";
import { SENHA_PADRAO_CRM } from "@/lib/crmCadastroMembro";

type PerfilCriado = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
};

type Props = {
  leadId: string;
  nome: string;
  emailInicial?: string | null;
  jaTemCadastro?: boolean;
  onCadastrado: (perfil: PerfilCriado, info?: { senha?: string; email?: string }) => void;
};

export default function CrmCadastrarMembroPanel({
  leadId,
  nome,
  emailInicial,
  jaTemCadastro,
  onCadastrado,
}: Props) {
  const [email, setEmail] = useState(emailInicial || "");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState<{
    email: string;
    senha: string;
    vinculado?: boolean;
  } | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (jaTemCadastro) return null;

  async function criarCadastro() {
    setErro("");
    setCriando(true);
    try {
      const res = await fetch(`/api/admin/crm/leads/${leadId}/cadastrar-membro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await res.json().catch(() => null);
      if (!res.ok || !d?.ok) {
        setErro(d?.error || "Erro ao criar cadastro.");
        return;
      }
      const perfil = d.perfil as PerfilCriado;
      const info = {
        email: d.email || perfil?.email || email,
        senha: d.senha_temporaria || SENHA_PADRAO_CRM,
        vinculado: Boolean(d.vinculado_existente),
      };
      setSucesso(info);
      if (perfil) onCadastrado(perfil, info);
    } finally {
      setCriando(false);
    }
  }

  async function copiarSenha() {
    if (!sucesso) return;
    try {
      await navigator.clipboard.writeText(
        `E-mail: ${sucesso.email}\nSenha: ${sucesso.senha}`
      );
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* ignora */
    }
  }

  const inputClass =
    "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]";

  if (sucesso) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-2">
        <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
          <CheckCircle2 size={16} />
          {sucesso.vinculado ? "Cadastro existente vinculado!" : "Cadastro criado no app!"}
        </div>
        {!sucesso.vinculado && (
          <>
            <p className="text-xs text-zinc-400">
              Envie os dados de acesso para <strong className="text-white">{nome}</strong>:
            </p>
            <div className="flex items-center gap-2 text-xs bg-black/40 rounded-lg px-3 py-2 font-mono">
              <KeyRound size={12} className="text-[#C9A66B] shrink-0" />
              <span className="text-zinc-300 truncate">{sucesso.email}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-[#C9A66B]">{sucesso.senha}</span>
            </div>
            <button
              type="button"
              onClick={copiarSenha}
              className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-1"
            >
              {copiado ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              {copiado ? "Copiado!" : "Copiar acesso"}
            </button>
            <p className="text-[10px] text-zinc-500">
              A cliente pode alterar a senha ao entrar no app pela primeira vez.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold text-white">
        <UserPlus size={16} className="text-[#C9A66B]" />
        Sem cadastro no app
      </div>
      <p className="text-[11px] text-zinc-500">
        Crie a conta com senha temporária <span className="text-zinc-400 font-mono">{SENHA_PADRAO_CRM}</span> para a cliente acessar depois.
      </p>
      {erro && <p className="text-xs text-red-400 font-bold">{erro}</p>}
      <div>
        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
          E-mail para login *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          className={inputClass}
        />
      </div>
      <button
        type="button"
        onClick={criarCadastro}
        disabled={criando || !email.trim()}
        className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700 text-white font-black uppercase text-[10px] tracking-widest py-2.5 rounded-xl flex items-center justify-center gap-2"
      >
        {criando ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
        {criando ? "Criando..." : "Criar cadastro no app"}
      </button>
    </div>
  );
}
