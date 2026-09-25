"use client";

import { FormEvent, useState } from "react";
import MapaHeader from "@/componentes/mapa/MapaHeader";
import LogoMasc from "@/componentes/mapa/LogoMasc";
import { MAPA_WHATSAPP } from "@/lib/mapaSaloes";

const VAZIO = {
  nome: "",
  email: "",
  telefone: "",
  instagram: "",
  cep: "",
  bairro: "",
  rua: "",
  numero: "",
};

export default function MapaInscrever() {
  const [form, setForm] = useState(VAZIO);
  const [erro, setErro] = useState<string | null>(null);

  function set(campo: keyof typeof VAZIO, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const obrigatorios: (keyof typeof VAZIO)[] = ["nome", "email", "telefone", "instagram", "cep", "bairro", "rua", "numero"];
    if (obrigatorios.some((c) => !form[c].trim())) {
      setErro("Preencha todos os campos para enviar a ficha.");
      return;
    }
    const texto = [
      "Olá! Quero cadastrar meu salão no mapa.",
      "",
      `Nome: ${form.nome.trim()}`,
      `E-mail: ${form.email.trim()}`,
      `Telefone: ${form.telefone.trim()}`,
      `Instagram: ${form.instagram.trim()}`,
      `CEP: ${form.cep.trim()}`,
      `Bairro: ${form.bairro.trim()}`,
      `Rua: ${form.rua.trim()}`,
      `Número: ${form.numero.trim()}`,
    ].join("\n");
    window.open(`https://wa.me/${MAPA_WHATSAPP}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    setErro(null);
  }

  return (
    <div className="min-h-screen bg-[#FFFBF8] text-[#1A1A1A]">
      <MapaHeader />

      <section className="bg-[#111] text-white">
        <div className="mx-auto grid max-w-5xl items-center gap-8 px-4 py-14 md:grid-cols-2">
          <div>
            <LogoMasc branca className="mb-5 h-14 w-auto" />
            <h1 className="text-3xl font-semibold leading-tight [font-family:var(--font-mapa),Georgia,serif] md:text-5xl">
              Deixe novas clientes encontrarem seu salão.
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/75">
              O mapa conecta quem busca um profissional perto de casa com o salão que já está cadastrado no app.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/85">
            <li>Ser encontrada por quem já está perto de você</li>
            <li>Receber contato direto no WhatsApp</li>
            <li>Aparecer com cidade, endereço e agenda</li>
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-4 py-12 md:grid-cols-3">
        {[
          ["1", "Cadastre seus dados", "Nome, contato, Instagram e endereço. A ficha chega no WhatsApp."],
          ["2", "Você recebe o link do app", "No app, complete o perfil e ligue a opção de aparecer no mapa."],
          ["3", "A cliente encontra você", "Ela vê o pin, o Instagram e chama no WhatsApp ou agenda."],
        ].map(([n, t, d]) => (
          <article key={n} className="rounded-3xl bg-[#161616] p-6 text-white">
            <p className="text-xs font-bold text-[#C9A66B]">{n}</p>
            <h2 className="mt-2 text-lg font-semibold">{t}</h2>
            <p className="mt-2 text-sm text-white/70">{d}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-lg px-4 pb-20">
        <form onSubmit={enviar} className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm md:p-8">
          <LogoMasc className="mx-auto mb-4 h-12 w-auto" />
          <h2 className="text-center text-2xl font-semibold [font-family:var(--font-mapa),Georgia,serif]">
            Preencha o formulário
          </h2>
          <p className="mt-1 text-center text-sm text-zinc-500">e a ficha abre no WhatsApp 14 99743-3541</p>
          <p className="mb-5 mt-2 text-center text-[11px] text-zinc-400">
            Os dados servem só para o cadastro no mapa.
          </p>

          <Campo label="Nome" value={form.nome} onChange={(v) => set("nome", v)} />
          <Campo label="E-mail" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <Campo label="Telefone" value={form.telefone} onChange={(v) => set("telefone", v)} placeholder="(14) 99999-9999" />
          <Campo label="Instagram" value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="@seusalao" />
          <Campo label="CEP" value={form.cep} onChange={(v) => set("cep", v)} placeholder="00000-000" />
          <Campo label="Bairro" value={form.bairro} onChange={(v) => set("bairro", v)} />
          <Campo label="Rua" value={form.rua} onChange={(v) => set("rua", v)} />
          <Campo label="Número" value={form.numero} onChange={(v) => set("numero", v)} />

          {erro && <p className="mb-3 text-sm text-[#E23B4A]">{erro}</p>}

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-[#3a2a24] py-3.5 text-sm font-bold uppercase tracking-widest text-white"
          >
            Cadastrar no mapa
          </button>
        </form>
      </section>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs font-medium text-zinc-500">{label}</span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-black/10 bg-zinc-50 px-3 py-2.5 text-sm outline-none focus:border-[#E23B4A]"
      />
    </label>
  );
}
