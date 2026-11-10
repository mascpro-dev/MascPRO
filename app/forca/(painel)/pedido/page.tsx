"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Minus, Package, Plus, ShoppingBag } from "lucide-react";
import { FAIXA_LINHA, SEM_LINHA, agruparProdutosPorLinha } from "@/lib/gruposLinhaProduto";

type Lead = {
  id: string;
  nome: string | null;
  empresa: string | null;
  telefone: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  profile_id: string | null;
};

type Produto = {
  id: string;
  title: string;
  image_url: string | null;
  linha: string | null;
  preco: number;
};

type Item = Produto & { quantidade: number };
type Parte = { metodo: string; valor: string };

const COMBOS = [
  { id: "pix", label: "Pix", formas: ["pix"] },
  { id: "cartao", label: "Cartão", formas: ["cartao"] },
  { id: "boleto", label: "Boleto", formas: ["boleto"] },
  { id: "dinheiro", label: "Dinheiro", formas: ["dinheiro"] },
  { id: "dois-cartoes", label: "Dois cartões", formas: ["cartao", "cartao"] },
  { id: "pix-boleto", label: "Pix + boleto", formas: ["pix", "boleto"] },
  { id: "cartao-boleto", label: "Cartão + boleto", formas: ["cartao", "boleto"] },
  { id: "pix-cartao", label: "Pix + cartão", formas: ["pix", "cartao"] },
];

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function partir(total: number, formas: string[]): Parte[] {
  if (formas.length === 1) return [{ metodo: formas[0], valor: total.toFixed(2) }];
  const primeira = Math.round((total / 2) * 100) / 100;
  const segunda = Math.round((total - primeira) * 100) / 100;
  return [
    { metodo: formas[0], valor: primeira.toFixed(2) },
    { metodo: formas[1], valor: segunda.toFixed(2) },
  ];
}

export default function PedidoLojaPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [papel, setPapel] = useState("VENDEDOR");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);
  const [busca, setBusca] = useState("");
  const [itens, setItens] = useState<Item[]>([]);
  const [aberto, setAberto] = useState(false);
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [frete, setFrete] = useState<number | null>(null);
  const [freteMsg, setFreteMsg] = useState("");
  const [freteErro, setFreteErro] = useState("");
  const [partes, setPartes] = useState<Parte[]>([{ metodo: "pix", valor: "0.00" }]);
  const [combo, setCombo] = useState("pix");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    const [clientesRes, lojaRes] = await Promise.all([
      fetch("/api/vendedor/forca/carteira", { cache: "no-store" }),
      fetch("/api/vendedor/forca/loja", { cache: "no-store" }),
    ]);
    const clientes = await clientesRes.json().catch(() => null);
    const loja = await lojaRes.json().catch(() => null);
    if (!clientesRes.ok || !clientes?.ok) setErro(clientes?.error || "Não foi possível abrir os clientes.");
    else {
      setLeads(clientes.leads || []);
      setPapel(clientes.papel || "VENDEDOR");
    }
    if (!lojaRes.ok || !loja?.ok) setErro(loja?.error || "Não foi possível abrir a loja.");
    else setProdutos(loja.produtos || []);
    setLoading(false);
  }

  function escolher(cliente: Lead) {
    setLead(cliente);
    setCep(String(cliente.cep || "").replace(/\D/g, ""));
    setItens([]);
    setAberto(false);
    setFrete(null);
    setFreteMsg("");
    setFreteErro("");
  }

  function adicionar(produto: Produto) {
    setItens((lista) => {
      const atual = lista.find((i) => i.id === produto.id);
      if (atual) return lista.map((i) => (i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i));
      return [...lista, { ...produto, quantidade: 1 }];
    });
    setAberto(true);
  }

  function quantidade(id: string, delta: number) {
    setItens((lista) =>
      lista
        .map((i) => (i.id === id ? { ...i, quantidade: i.quantidade + delta } : i))
        .filter((i) => i.quantidade > 0)
    );
  }

  const subtotal = itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
  const total = subtotal + (frete || 0);
  const qtd = itens.reduce((acc, i) => acc + i.quantidade, 0);
  const termo = busca.trim().toLowerCase();
  const grupos = useMemo(
    () => agruparProdutosPorLinha(produtos.filter((p) => !termo || p.title.toLowerCase().includes(termo))),
    [produtos, termo]
  );
  const clientes = leads.filter((l) => {
    if (!termo || lead) return true;
    return [l.empresa, l.nome, l.cidade, l.telefone].join(" ").toLowerCase().includes(termo);
  });

  useEffect(() => {
    if (!aberto) return;
    const formas = COMBOS.find((c) => c.id === combo)?.formas || ["pix"];
    setPartes(partir(total, formas));
  }, [combo, total, aberto]);

  useEffect(() => {
    if (!aberto || !lead) return;
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8 || itens.length === 0) {
      setFrete(null);
      setFreteMsg("");
      setFreteErro(digitos.length === 8 ? "" : "Informe o CEP para calcular o frete da loja.");
      return;
    }
    const ctrl = new AbortController();
    setFreteErro("");
    setFreteMsg("Calculando frete...");
    fetch("/api/frete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        cep: digitos,
        cidade: lead.cidade,
        estado: lead.estado,
        subtotal,
        items: itens.map((i) => ({ id: i.id, quantity: i.quantidade })),
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d?.ok || typeof d.frete !== "number") {
          setFrete(null);
          setFreteErro(d?.error || "Não foi possível calcular o frete.");
          setFreteMsg("");
          return;
        }
        setFrete(d.frete);
        setFreteMsg(d.mensagem || (d.freteGratis ? "Frete isento." : `Frete ${moeda(d.frete)}`));
        setFreteErro("");
      })
      .catch((e) => {
        if (e?.name === "AbortError") return;
        setFrete(null);
        setFreteErro("Não foi possível calcular o frete.");
      });
    return () => ctrl.abort();
  }, [aberto, cep, itens, lead, subtotal]);

  async function fechar() {
    if (!lead) return;
    const cpfDigitos = cpf.replace(/\D/g, "");
    if (cpfDigitos.length !== 11 && cpfDigitos.length !== 14) {
      setErro("Informe o CPF ou CNPJ do cliente.");
      return;
    }
    if (frete == null) {
      setErro(freteErro || "Espere o frete da loja.");
      return;
    }
    setEnviando(true);
    setErro("");
    const api = papel === "VENDEDOR" ? "/api/vendedor/crm" : "/api/admin/crm";
    const res = await fetch(`${api}/leads/${lead.id}/fechar-pedido`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: lead.profile_id,
        cliente_nome: lead.empresa || lead.nome,
        cpf_cnpj: cpfDigitos,
        telefone: lead.telefone,
        email: lead.email,
        items: itens.map((i) => ({
          product_id: i.id,
          quantidade: i.quantidade,
          preco_unitario: i.preco,
        })),
        pagamentos: partes.map((p) => ({ metodo: p.metodo, valor: Number(p.valor) })),
        shipping_cost: frete,
        cep,
        logradouro: lead.endereco || "Endereço da visita",
        numero: "s/n",
        bairro: lead.bairro,
        municipio: lead.cidade,
        uf: lead.estado,
      }),
    });
    const d = await res.json().catch(() => null);
    setEnviando(false);
    if (!res.ok || !d?.ok) {
      setErro(d?.error || "Não foi possível fechar o pedido.");
      return;
    }
    window.location.href = "/forca/pedidos";
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-[#C9A66B]" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <Link href="/forca" className="text-xs font-bold uppercase tracking-widest text-zinc-500">Voltar</Link>
      <header>
        <p className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B]">Força de vendas</p>
        <h1 className="text-2xl font-black">{lead ? lead.empresa || lead.nome : "Novo pedido"}</h1>
        {lead && (
          <button type="button" onClick={() => setLead(null)} className="text-xs font-bold text-zinc-500">
            Trocar cliente
          </button>
        )}
      </header>
      {erro && <p className="text-sm text-red-400">{erro}</p>}

      {!lead ? (
        <>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar salão"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
          />
          <div className="space-y-2">
            {clientes.map((l) => (
              <button key={l.id} type="button" onClick={() => escolher(l)} className="block w-full rounded-xl border border-white/10 px-3 py-3 text-left">
                <p className="font-bold">{l.empresa || l.nome}</p>
                <p className="text-xs text-zinc-500">{[l.cidade, l.estado].filter(Boolean).join("/")}</p>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar produto"
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm"
          />
          {grupos.map((grupo) => {
            const faixa = FAIXA_LINHA[grupo.id] || FAIXA_LINHA[SEM_LINHA];
            return (
              <section key={grupo.id} className="space-y-3">
                <div className="rounded-xl px-4 py-3" style={{ backgroundColor: faixa.bg, color: faixa.fg }}>
                  <h2 className="text-sm font-black uppercase tracking-[0.16em]">{grupo.label}</h2>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {grupo.items.map((produto) => (
                    <button
                      key={produto.id}
                      type="button"
                      onClick={() => adicionar(produto)}
                      className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900 text-left"
                    >
                      <div className="flex aspect-square items-center justify-center bg-black">
                        {produto.image_url ? (
                          <img src={produto.image_url} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <Package className="text-zinc-700" />
                        )}
                      </div>
                      <div className="space-y-1 p-3">
                        <p className="line-clamp-2 text-[11px] font-bold uppercase">{produto.title}</p>
                        <p className="text-sm font-black">{moeda(produto.preco)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}

      {lead && qtd > 0 && (
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="fixed bottom-20 left-1/2 z-30 flex w-[min(100%-2rem,36rem)] -translate-x-1/2 items-center justify-between rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white"
        >
          <span className="flex items-center gap-2"><ShoppingBag size={16} /> Carrinho · {qtd}</span>
          <span>{moeda(subtotal)}</span>
        </button>
      )}

      {aberto && lead && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70" onClick={() => setAberto(false)}>
          <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-zinc-950 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">Carrinho</h2>
              <button type="button" onClick={() => setAberto(false)} className="text-xs font-bold text-zinc-500">Fechar</button>
            </div>
            <div className="space-y-3">
              {itens.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="h-14 w-14 overflow-hidden rounded-lg bg-black">
                    {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-contain" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{item.title}</p>
                    <p className="text-xs text-zinc-500">{moeda(item.preco)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => quantidade(item.id, -1)} className="rounded-full border border-white/10 p-1"><Minus size={14} /></button>
                    <span className="w-4 text-center text-sm font-black">{item.quantidade}</span>
                    <button type="button" onClick={() => quantidade(item.id, 1)} className="rounded-full border border-white/10 p-1"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
            </div>

            <label className="mt-4 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              CEP
              <input value={cep} onChange={(e) => setCep(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm" />
            </label>
            {freteMsg && <p className="mt-2 text-xs text-zinc-400">{freteMsg}</p>}
            {freteErro && <p className="mt-2 text-xs text-red-400">{freteErro}</p>}

            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pagamento</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMBOS.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  onClick={() => setCombo(opcao.id)}
                  className={`rounded-full px-3 py-2 text-[11px] font-black uppercase ${combo === opcao.id ? "bg-[#C9A66B] text-black" : "border border-white/10 text-zinc-300"}`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-2">
              {partes.map((parte, index) => (
                <label key={`${parte.metodo}-${index}`} className="block text-xs text-zinc-400">
                  {parte.metodo}
                  <input
                    value={parte.valor}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setPartes((lista) => lista.map((p, i) => (i === index ? { ...p, valor } : p)));
                    }}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-white"
                  />
                </label>
              ))}
            </div>

            <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              CPF ou CNPJ
              <input value={cpf} onChange={(e) => setCpf(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm" />
            </label>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-zinc-400">Total</span>
              <span className="text-xl font-black">{moeda(total)}</span>
            </div>
            <button
              type="button"
              onClick={() => void fechar()}
              disabled={enviando || frete == null}
              className="mt-3 w-full rounded-xl bg-emerald-600 py-3 text-sm font-black text-white disabled:opacity-40"
            >
              {enviando ? "Fechando..." : "Fechar pedido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
