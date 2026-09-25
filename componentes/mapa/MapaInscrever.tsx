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

const OURO = "#E0A84A";

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

  function irFormulario() {
    document.getElementById("formulario")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A]">
      <MapaHeader />

      <section className="relative overflow-hidden bg-[#0c0c0c] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_70%_40%,#3a2a12,transparent_42%),radial-gradient(circle_at_10%_80%,#1a1208,transparent_35%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-3xl font-black uppercase leading-[1.05] tracking-tight md:text-5xl">
              Deixe novas clientes encontrarem seu salão de forma simples!
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/80 md:text-base">
              O Mapa de Salões Masc PRO ajuda a conectar profissionais com novas clientes próximas da sua região.
            </p>
            <button
              type="button"
              onClick={irFormulario}
              className="mt-8 rounded-md px-6 py-3 text-xs font-black uppercase tracking-widest text-black"
              style={{ background: OURO }}
            >
              Quero aparecer no mapa
            </button>
          </div>
          <MapaBrasil />
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold leading-tight md:text-4xl" style={{ color: OURO }}>
              O seu salão merece mais visibilidade!
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-600 md:text-base">
              O Mapa de Salões existe para facilitar isso: mostrar o seu trabalho para quem está perto de você e ainda não te conhece.
            </p>
          </div>
          <PhoneMapa />
        </div>
      </section>

      <section className="bg-black py-14 text-center text-white">
        <h2 className="text-3xl font-black uppercase tracking-wide md:text-5xl">
          Aumente sua
          <br />
          visibilidade agora
        </h2>
      </section>

      <section className="bg-black pb-16 text-white">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 md:grid-cols-2">
          <article className="rounded-sm border border-white/10 bg-[#141414] p-8">
            <ul className="space-y-3 text-sm text-white/85">
              <li>• Seu salão visível no mapa</li>
              <li>• Contato direto pelo WhatsApp</li>
              <li>• Suas redes sociais no perfil</li>
              <li>• Busca por localização</li>
            </ul>
            <button
              type="button"
              onClick={irFormulario}
              className="mt-8 w-full rounded-md py-3 text-xs font-black uppercase tracking-widest text-black"
              style={{ background: OURO }}
            >
              Quero aparecer no mapa
            </button>
          </article>
          <article className="rounded-sm border p-8" style={{ borderColor: OURO, background: "linear-gradient(180deg,#1a1408,#0e0e0e)" }}>
            <ul className="space-y-3 text-sm text-white/85">
              <li>• Suas redes sociais no perfil</li>
              <li>• Pin colorido conforme seu papel no app</li>
              <li>• Busca por localização</li>
              <li>• Apoio da equipe Masc PRO</li>
              <li>• Agenda, WhatsApp e Instagram no mesmo pin</li>
            </ul>
            <a
              href={`https://wa.me/${MAPA_WHATSAPP}?text=${encodeURIComponent("Olá! Quero colocar meu salão no mapa da Masc PRO.")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-8 block w-full rounded-md py-3 text-center text-xs font-black uppercase tracking-widest text-black"
              style={{ background: OURO }}
            >
              Falar com a Masc
            </a>
          </article>
        </div>
      </section>

      <section className="bg-white px-4 py-16">
        <h2 className="text-center text-3xl font-black uppercase tracking-wide md:text-4xl">Como funciona?</h2>
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {[
            ["1", "Cadastre seus dados", "Só pedimos o necessário: nome, contato, Instagram e endereço. A ficha chega no WhatsApp."],
            ["2", "Seu salão aparece no mapa", "Depois do cadastro, o admin liga o mapa no seu perfil e o pin entra na busca."],
            ["3", "A cliente encontra você", "Ela vê o pin, o Instagram e chama no WhatsApp ou agenda direto na sua agenda."],
          ].map(([n, t, d]) => (
            <article key={n} className="bg-black p-6 text-white">
              <p className="text-sm font-black" style={{ color: OURO }}>
                {n}.
              </p>
              <h3 className="mt-3 text-lg font-black uppercase leading-tight">{t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/75">{d}</p>
            </article>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-3xl border px-6 py-5 text-center text-sm text-zinc-600 md:text-base" style={{ borderColor: OURO }}>
          Todos os meses profissionais e clientes entram no mapa para procurar um salão mais próximo.
        </p>
      </section>

      <section className="bg-black text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-black uppercase leading-tight md:text-4xl">
              Benefícios de estar no mapa de salões:
            </h2>
            <ul className="mt-6 space-y-3 text-sm text-white/85 md:text-base">
              <li>• Ser encontrada por quem já está perto de você</li>
              <li>• Receber contatos diretos no seu WhatsApp</li>
              <li>• Ter mais um caminho para uma nova cliente chegar até você</li>
            </ul>
            <button
              type="button"
              onClick={irFormulario}
              className="mt-8 rounded-md px-6 py-3 text-xs font-black uppercase tracking-widest text-black"
              style={{ background: OURO }}
            >
              Quero aparecer no mapa
            </button>
          </div>
          <MapaBrasil />
        </div>
      </section>

      <section
        id="formulario"
        className="relative overflow-hidden bg-[#f4f1ea]"
        style={{
          backgroundImage:
            "linear-gradient(90deg,rgba(244,241,234,0.94),rgba(244,241,234,0.72)),url(https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1600&q=60)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <form onSubmit={enviar} className="border border-black/80 bg-[#f7f4ef]/95 p-6 shadow-xl md:p-8">
            <h2 className="text-center text-3xl font-semibold [font-family:var(--font-mapa),Georgia,serif]">
              Preencha o formulário
            </h2>
            <p className="mt-1 text-center text-sm text-zinc-600">e entraremos em contato</p>
            <p className="mb-5 mt-3 text-center text-xs text-zinc-500">
              Os dados servem só para o cadastro no mapa. A ficha abre no WhatsApp 14 99743-3541.
            </p>
            <Campo label="Nome*" value={form.nome} onChange={(v) => set("nome", v)} />
            <Campo label="E-mail*" type="email" value={form.email} onChange={(v) => set("email", v)} />
            <Campo label="Telefone*" value={form.telefone} onChange={(v) => set("telefone", v)} placeholder="(14) 99999-9999" />
            <Campo label="Instagram*" value={form.instagram} onChange={(v) => set("instagram", v)} placeholder="@seusalao" />
            <Campo label="CEP*" value={form.cep} onChange={(v) => set("cep", v)} placeholder="00000-000" />
            <Campo label="Bairro*" value={form.bairro} onChange={(v) => set("bairro", v)} />
            <Campo label="Rua*" value={form.rua} onChange={(v) => set("rua", v)} />
            <Campo label="Número*" value={form.numero} onChange={(v) => set("numero", v)} />
            {erro && <p className="mb-3 text-sm text-[#E23B4A]">{erro}</p>}
            <button type="submit" className="mt-2 w-full rounded-full bg-[#3a2a24] py-3.5 text-xs font-black uppercase tracking-[0.18em] text-white">
              Cadastrar no mapa
            </button>
          </form>
          <div className="hidden flex-col items-center md:flex">
            <div className="mb-4 flex items-end gap-3">
              <Pin cor="#9CA3AF" />
              <Pin cor={OURO} alto />
              <Pin cor="#E23B4A" />
            </div>
            <LogoMasc className="h-16 w-auto" />
            <p className="mt-3 text-3xl font-black tracking-tight">Mapa de Salões</p>
          </div>
        </div>
      </section>

      <footer className="py-3 text-center text-xs text-black" style={{ background: OURO }}>
        © Masc PRO {new Date().getFullYear()}. Todos os direitos reservados.
      </footer>
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
      <span className="mb-1 block text-xs text-zinc-600">{label}</span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-[#E0A84A]"
      />
    </label>
  );
}

function Pin({ cor, alto = false }: { cor: string; alto?: boolean }) {
  return (
    <svg width={alto ? 72 : 54} height={alto ? 96 : 72} viewBox="0 0 32 42" aria-hidden="true">
      <path d="M16 1C8 1 2 7.2 2 15.2 2 26 16 41 16 41s14-15 14-25.8C30 7.2 24 1 16 1z" fill={cor} />
      <text x="16" y="19" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
        M
      </text>
    </svg>
  );
}

function MapaBrasil() {
  return (
    <figure className="relative mx-auto w-full max-w-md">
      <img
        src="/mapa/globo.jpg"
        alt="Mapa de Salões"
        className="h-80 w-full rounded-[28px] object-cover object-center shadow-2xl"
      />
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[28px] bg-gradient-to-t from-black/80 to-transparent px-4 pb-5 pt-16 text-center text-2xl font-black text-white md:text-3xl">
        Mapa de Salões
      </figcaption>
    </figure>
  );
}

function PhoneMapa() {
  return (
    <img
      src="/mapa/pin-3d.jpg"
      alt="Seu salão visível no mapa"
      className="mx-auto h-72 w-full max-w-sm object-contain"
    />
  );
}
