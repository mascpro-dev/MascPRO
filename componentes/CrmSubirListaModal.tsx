"use client";

import { useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { parseListaLeads } from "@/lib/crmImportarLista";

type Props = {
  api: string;
  tema: "claro" | "escuro";
  onClose: () => void;
  onImportado: () => void;
};

export default function CrmSubirListaModal({ api, tema, onClose, onImportado }: Props) {
  const escuro = tema === "escuro";
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resumo, setResumo] = useState("");

  const previa = useMemo(() => (texto.trim() ? parseListaLeads(texto) : null), [texto]);

  async function lerArquivo(file: File) {
    const buf = await file.arrayBuffer();
    let conteudo = new TextDecoder("utf-8").decode(buf);
    if (conteudo.includes("\uFFFD")) {
      conteudo = new TextDecoder("windows-1252").decode(buf);
    }
    setTexto(conteudo);
    setErro("");
    setResumo("");
  }

  async function subir() {
    if (!texto.trim()) {
      setErro("Cole a lista ou escolha um arquivo CSV.");
      return;
    }
    setEnviando(true);
    setErro("");
    setResumo("");
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErro(data?.error || "Não foi possível subir a lista.");
        return;
      }
      const pulados = Number(data.ignoradas?.length || 0);
      setResumo(
        `${data.criados} contato(s) entraram em Novo.${pulados ? ` ${pulados} linha(s) ficaram de fora.` : ""}`
      );
      onImportado();
    } finally {
      setEnviando(false);
    }
  }

  const caixa = escuro
    ? "bg-zinc-950 border border-zinc-800 text-white"
    : "bg-white border border-[#E7E1D6] text-[#2A2723]";
  const muted = escuro ? "text-zinc-500" : "text-[#8A847A]";
  const campo = escuro
    ? "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]"
    : "w-full bg-[#FBF9F6] border border-[#E7E1D6] rounded-xl px-3 py-2 text-sm text-[#2A2723] outline-none focus:border-[#C9A66B]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-lg rounded-2xl p-5 ${caixa}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold">Subir lista</h2>
            <p className={`text-xs mt-1 ${muted}`}>
              Os contatos entram na coluna Novo, no seu pipeline. No Excel, salve como CSV ou cole as células aqui.
            </p>
          </div>
          <button type="button" onClick={onClose} className={muted}>
            <X size={18} />
          </button>
        </div>

        <p className={`text-[11px] mb-3 ${muted}`}>
          Aceita a planilha com Nome, Tipo, Endereço, Número, Complemento, Bairro, Telefone, Cidade, UF, CEP, Telefone 1, Telefone 2 e Email. Só o nome é obrigatório.
        </p>

        <label className={`mb-3 inline-flex items-center gap-2 text-xs font-bold cursor-pointer ${escuro ? "text-[#C9A66B]" : "text-[#8A6A32]"}`}>
          <Upload size={14} />
          Escolher arquivo CSV
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void lerArquivo(file);
              e.target.value = "";
            }}
          />
        </label>

        <textarea
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setResumo("");
          }}
          rows={8}
          placeholder={"Nome;Tipo;Endereço;Número;Complemento;Bairro;Telefone;Cidade;UF;CEP;Telefone 1;Telefone 2;Email"}
          className={campo}
        />

        {previa && !previa.erro && (
          <p className={`text-xs mt-2 ${muted}`}>{previa.leads.length} contato(s) pronto(s) para subir.</p>
        )}
        {erro && <p className="text-xs mt-2 text-red-400">{erro}</p>}
        {resumo && <p className="text-xs mt-2 text-emerald-500">{resumo}</p>}

        <button
          type="button"
          onClick={() => void subir()}
          disabled={enviando}
          className="mt-4 w-full bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {enviando ? "Subindo..." : "Subir para o pipeline"}
        </button>
      </div>
    </div>
  );
}
