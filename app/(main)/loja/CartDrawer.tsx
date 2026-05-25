"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCart } from "./CartContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  X, Plus, Minus, Trash2, CreditCard, Loader2,
  MapPin, CheckCircle2, Truck, ChevronDown, ChevronUp,
} from "lucide-react";
import { isCepMariliaSp } from "@/lib/freteMarilia";

const FRETE_GRATIS_PADRAO = 1500;

type Endereco = {
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

const ENDERECO_VAZIO: Endereco = {
  cep: "", endereco: "", numero: "", complemento: "",
  bairro: "", cidade: "", estado: "",
};

function normalizeText(v: string): string {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, clearCart } = useCart();
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [showEnderecoForm, setShowEnderecoForm] = useState(false);
  const [endereco, setEndereco] = useState<Endereco>(ENDERECO_VAZIO);
  const [enderecoSalvo, setEnderecoSalvo] = useState(false);
  const [frete, setFrete] = useState<number | null>(null);
  const [freteInfo, setFreteInfo] = useState("");
  const [loadingFrete, setLoadingFrete] = useState(false);
  const [freteErro, setFreteErro] = useState("");
  const [freteGratisAcima, setFreteGratisAcima] = useState(FRETE_GRATIS_PADRAO);
  const freteAbortRef = useRef<AbortController | null>(null);

  const subtotal = cart.reduce(
    (acc: number, i: any) => acc + (Number(i.displayPrice || i.price || 0) * (i.quantity || 1)),
    0
  );
  const cepLimpo = endereco.cep.replace(/\D/g, "");
  const cidadeNorm = normalizeText(endereco.cidade);
  const estadoNorm = String(endereco.estado || "").trim().toUpperCase();
  const isentoSubtotal = freteGratisAcima > 0 && subtotal >= freteGratisAcima;
  const isentoMarilia = cepLimpo.length === 8 && isCepMariliaSp(cepLimpo);
  const isentoMariliaCidade = cidadeNorm === "marilia" && estadoNorm === "SP";
  const freteGratis = isentoSubtotal || isentoMarilia || isentoMariliaCidade;
  const freteValor = freteGratis ? 0 : (frete ?? 0);
  const total = subtotal + freteValor;

  useEffect(() => {
    if (!isCartOpen) return;
    fetch("/api/config/loja", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && typeof d.freteGratisAcima === "number" && d.freteGratisAcima > 0) {
          setFreteGratisAcima(d.freteGratisAcima);
        }
      })
      .catch(() => {});
  }, [isCartOpen]);

  const consultarFreteCorreios = useCallback(
    async (signal?: AbortSignal): Promise<number | null> => {
      const c = endereco.cep.replace(/\D/g, "");
      if (c.length !== 8 || cart.length === 0) return null;

      const res = await fetch("/api/frete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store",
        signal,
        body: JSON.stringify({
          cep: c,
          cidade: endereco.cidade,
          estado: endereco.estado,
          items: cart.map((i: { id: string; quantity?: number }) => ({
            id: i.id,
            quantity: Number(i.quantity || 1),
          })),
          subtotal,
        }),
      });

      // Trata resposta não-JSON (Vercel pode devolver HTML em 504/timeout).
      // Sem isso, iOS Safari lança "The string did not match the expected pattern".
      const raw = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          res.status >= 500
            ? "Servidor demorou para responder o frete. Tente de novo em alguns segundos."
            : "Resposta inválida ao calcular o frete."
        );
      }
      if (typeof data?.freteGratisAcima === "number" && data.freteGratisAcima > 0) {
        setFreteGratisAcima(data.freteGratisAcima);
      }
      if (!res.ok || !data?.ok) {
        throw new Error(String(data?.error || "Não foi possível calcular o frete."));
      }
      if (data.freteGratis) {
        setFrete(0);
        setFreteInfo(String(data.mensagem || "Frete grátis"));
        return 0;
      }
      const valor = typeof data.frete === "number" ? data.frete : null;
      const pr = data.prazoEntrega;
      const pg = data.pesoGramas;
      const estimado = data.freteEstimado || data.motivo === "estimado";
      const cepFmt = data.cepDestino ? String(data.cepDestino).replace(/(\d{5})(\d{3})/, "$1-$2") : c;
      setFreteInfo(
        `${estimado ? "Frete estimado (PAC)" : "PAC Correios"} · CEP ${cepFmt}${
          pr != null ? ` · ~${pr} dia(s) úteis` : ""
        }${pg != null ? ` · ${Number(pg).toLocaleString("pt-BR")} g` : ""}${
          estimado ? " · valor aproximado" : ""
        }`
      );
      return valor;
    },
    [endereco.cep, endereco.cidade, endereco.estado, cart, subtotal]
  );

  const recalcularFrete = useCallback(async () => {
    const c = endereco.cep.replace(/\D/g, "");
    freteAbortRef.current?.abort();
    const ac = new AbortController();
    freteAbortRef.current = ac;

    setFreteErro("");
    if (c.length !== 8 || cart.length === 0) {
      setFrete(null);
      setFreteInfo("");
      setLoadingFrete(false);
      return;
    }
    if (isentoSubtotal) {
      setFrete(0);
      setFreteInfo(
        `Pedido acima de R$ ${freteGratisAcima.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} — frete grátis`
      );
      setLoadingFrete(false);
      return;
    }
    if (isCepMariliaSp(c) || isentoMariliaCidade) {
      setFrete(0);
      setFreteInfo("Marília/SP — entrega com frete isento.");
      setLoadingFrete(false);
      return;
    }

    setFrete(null);
    setLoadingFrete(true);
    try {
      const valor = await consultarFreteCorreios(ac.signal);
      if (!ac.signal.aborted) setFrete(valor);
    } catch (e) {
      if (ac.signal.aborted) return;
      setFrete(null);
      setFreteInfo("");
      setFreteErro(e instanceof Error ? e.message : "Falha de conexão ao consultar o frete.");
    } finally {
      if (!ac.signal.aborted) setLoadingFrete(false);
    }
  }, [
    endereco.cep,
    cart.length,
    isentoSubtotal,
    isentoMariliaCidade,
    freteGratisAcima,
    consultarFreteCorreios,
  ]);

  useEffect(() => {
    const t = setTimeout(() => { void recalcularFrete(); }, 350);
    return () => clearTimeout(t);
  }, [recalcularFrete]);

  // Carrega endereço salvo no perfil
  useEffect(() => {
    if (!isCartOpen) return;
    async function carregarEndereco() {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("cep, address, number, complement, neighborhood, city, state")
        .eq("id", authData.session.user.id)
        .single();
      if (profile?.cep) {
        const end: Endereco = {
          cep:         profile.cep          || "",
          endereco:    profile.address       || "",
          numero:      profile.number        || "",
          complemento: profile.complement    || "",
          bairro:      profile.neighborhood  || "",
          cidade:      profile.city          || "",
          estado:      profile.state         || "",
        };
        setEndereco(end);
        setEnderecoSalvo(true);
      }
    }
    void carregarEndereco();
  }, [isCartOpen, supabase]);

  async function buscarCep(cep: string) {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEndereco(prev => ({
          ...prev,
          cep: clean,
          endereco: data.logradouro || "",
          bairro: data.bairro || "",
          cidade: data.localidade || "",
          estado: data.uf || "",
        }));
      }
    } finally {
      setLoadingCep(false);
    }
  }

  async function salvarEndereco() {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return;
    await supabase.from("profiles").update({
      cep:          endereco.cep,
      address:      endereco.endereco,
      number:       endereco.numero,
      complement:   endereco.complemento,
      neighborhood: endereco.bairro,
      city:         endereco.cidade,
      state:        endereco.estado,
    }).eq("id", authData.session.user.id);
    setEnderecoSalvo(true);
    setShowEnderecoForm(false);
  }

  const handlePagar = async () => {
    if (cart.length === 0) return;
    if (!enderecoSalvo || !endereco.cep) {
      alert("Informe o endereço de entrega antes de pagar.");
      setShowEnderecoForm(true);
      return;
    }
    const freteParaPagamento = freteValor;

    if (!freteGratis) {
      if (loadingFrete) {
        alert("Aguarde o cálculo do frete (Correios).");
        return;
      }
      if (freteErro || frete === null) {
        alert(freteErro || "Calcule o frete antes de pagar (confira o CEP).");
        return;
      }
    }

    setLoading(true);
    const abortCtl = new AbortController();
    const checkoutTimer = setTimeout(() => abortCtl.abort(), 90_000);
    try {
      const { data: authData } = await supabase.auth.getSession();
      const session = authData.session;
      if (!session) { alert("Faça login para continuar."); setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      const enderecoCompleto = `${endereco.endereco}, ${endereco.numero}${endereco.complemento ? " " + endereco.complemento : ""} — ${endereco.bairro}, ${endereco.cidade}/${endereco.estado} — CEP ${endereco.cep}`;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortCtl.signal,
        body: JSON.stringify({
          items: cart,
          userId: session.user.id,
          userEmail: session.user.email,
          userName: profile?.full_name || "",
          accessToken: session.access_token,
          shippingCost: freteParaPagamento,
          shippingCep: endereco.cep,
          shippingCity: endereco.cidade,
          shippingState: endereco.estado,
          shippingAddress: enderecoCompleto,
        }),
      });

      const raw = await res.text();
      let data: { init_point?: string; error?: string } = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        alert(
          res.status >= 500
            ? "Servidor demorou para responder. Aguarde e tente pagar de novo."
            : "Resposta inválida do servidor. Tente novamente."
        );
        setLoading(false);
        return;
      }
      if (!res.ok || !data.init_point) {
        alert(data.error || "Erro ao iniciar pagamento.");
        setLoading(false);
        return;
      }

      const payUrl = data.init_point;
      clearCart();
      setIsCartOpen(false);
      // PWA: mesma aba evita bloqueio de popup e perda de sessão
      window.location.assign(payUrl);
    } catch (err: unknown) {
      console.error(err);
      const aborted = err instanceof DOMException && err.name === "AbortError";
      alert(aborted ? "Tempo esgotado ao contatar o pagamento. Tente de novo." : "Erro ao conectar com o gateway de pagamento.");
    } finally {
      clearTimeout(checkoutTimer);
      setLoading(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />

      <div className="relative w-full max-w-md bg-[#0a0a0a] h-full shadow-2xl border-l border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-bold uppercase italic tracking-tighter">Seu Carrinho</h2>
          <button onClick={() => setIsCartOpen(false)}><X size={24} /></button>
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <p className="text-zinc-500 text-center py-10">Carrinho vazio.</p>
          ) : (
            cart.map((item: any) => (
              <div key={item.id} className="flex gap-4 bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                <img src={item.image_url} className="w-16 h-16 object-contain bg-white rounded-lg" alt="" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase mb-1">{item.title}</h4>
                  <p className="text-[#C9A66B] text-sm font-black mb-2">
                    R$ {Number(item.displayPrice || item.price || 0).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-black rounded-lg p-1 border border-white/10">
                      <button onClick={() => updateQuantity(item.id, -1)} className="p-1 hover:text-[#C9A66B]"><Minus size={13} /></button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="p-1 hover:text-[#C9A66B]"><Plus size={13} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-zinc-600 hover:text-red-500">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Endereço de Entrega */}
          {cart.length > 0 && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
              <button
                onClick={() => setShowEnderecoForm(!showEnderecoForm)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {enderecoSalvo && endereco.cep ? (
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  ) : (
                    <MapPin size={16} className="text-[#C9A66B] shrink-0" />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-bold uppercase tracking-widest text-white">Endereço de Entrega</p>
                    {enderecoSalvo && endereco.cidade ? (
                      <p className="text-[10px] text-zinc-400 truncate max-w-[220px]">
                        {endereco.endereco}, {endereco.numero} — {endereco.cidade}/{endereco.estado}
                      </p>
                    ) : (
                      <p className="text-[10px] text-zinc-500">Clique para informar</p>
                    )}
                  </div>
                </div>
                {showEnderecoForm ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
              </button>

              {showEnderecoForm && (
                <div className="mt-4 space-y-3">
                  {/* CEP */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">CEP</label>
                      <input
                        type="text"
                        maxLength={9}
                        placeholder="00000-000"
                        value={endereco.cep}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, "");
                          setEndereco(prev => ({ ...prev, cep: v }));
                          if (v.length === 8) buscarCep(v);
                        }}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C9A66B]"
                      />
                    </div>
                    {loadingCep && <Loader2 size={16} className="animate-spin text-zinc-500 self-end mb-2" />}
                  </div>

                  {/* Endereço + Número */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Rua/Av.</label>
                      <input type="text" value={endereco.endereco}
                        onChange={e => setEndereco(prev => ({ ...prev, endereco: e.target.value }))}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C9A66B]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Nº</label>
                      <input type="text" value={endereco.numero}
                        onChange={e => setEndereco(prev => ({ ...prev, numero: e.target.value }))}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C9A66B]" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Complemento</label>
                    <input type="text" value={endereco.complemento} placeholder="Apto, sala, bloco..."
                      onChange={e => setEndereco(prev => ({ ...prev, complemento: e.target.value }))}
                      className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C9A66B]" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Bairro</label>
                      <input type="text" value={endereco.bairro}
                        onChange={e => setEndereco(prev => ({ ...prev, bairro: e.target.value }))}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C9A66B]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">Cidade</label>
                      <input type="text" value={endereco.cidade}
                        onChange={e => setEndereco(prev => ({ ...prev, cidade: e.target.value }))}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C9A66B]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1 block">UF</label>
                      <input type="text" maxLength={2} value={endereco.estado}
                        onChange={e => setEndereco(prev => ({ ...prev, estado: e.target.value.toUpperCase() }))}
                        className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[#C9A66B]" />
                    </div>
                  </div>

                  <button
                    onClick={salvarEndereco}
                    disabled={!endereco.cep || !endereco.numero}
                    className="w-full bg-[#C9A66B] text-black font-black uppercase text-xs tracking-widest py-2 rounded-lg disabled:opacity-40"
                  >
                    Salvar endereço
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-5 border-t border-white/5 bg-zinc-900/20 shrink-0 space-y-2">

            {/* Frete */}
            {(frete !== null || freteGratis || loadingFrete || freteErro) && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                    <Truck size={13} /> Frete
                    {loadingFrete && <Loader2 size={12} className="animate-spin text-zinc-500" />}
                  </div>
                  {freteGratis ? (
                    <span className="text-emerald-400 text-xs font-black uppercase">Grátis!</span>
                  ) : loadingFrete ? (
                    <span className="text-zinc-500 text-[10px]">Calculando…</span>
                  ) : frete === null ? (
                    <span className="text-zinc-500 text-[10px]">—</span>
                  ) : (
                    <span className="text-white text-xs font-black">R$ {freteValor.toFixed(2)}</span>
                  )}
                </div>
                {freteInfo && (
                  <p className="text-[9px] text-zinc-500 text-right leading-tight">{freteInfo}</p>
                )}
                {freteErro && (
                  <p className="text-[9px] text-amber-500/90 text-right leading-tight">{freteErro}</p>
                )}
              </div>
            )}

            {/* Frete grátis info */}
            {!isentoSubtotal && !isentoMarilia && subtotal > 0 && (
              <p className="text-[10px] text-zinc-500 text-center">
                🎁 Frete grátis em compras acima de{" "}
                <span className="text-[#C9A66B] font-bold">R$ {freteGratisAcima.toLocaleString("pt-BR")}</span>
                {subtotal > 0 && freteGratisAcima > subtotal && ` — faltam R$ ${(freteGratisAcima - subtotal).toFixed(2)}`}
              </p>
            )}
            {isentoSubtotal && (
              <p className="text-[10px] text-emerald-400 text-center font-bold">
                🎉 Você ganhou frete grátis!
              </p>
            )}

            {/* Subtotal + Total */}
            <div className="flex justify-between pt-1 border-t border-white/5">
              <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Total</span>
              <span className="text-xl font-black text-white">R$ {total.toFixed(2)}</span>
            </div>

            <p className="text-zinc-600 text-[10px]">
              Parcelamento em 2x ou mais: juros repassados ao comprador conforme tabela MP.
            </p>

            <button
              onClick={handlePagar}
              disabled={loading}
              className="w-full bg-[#009EE3] text-white h-13 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-[#007EC3] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <><CreditCard size={18} /> PAGAR COM MERCADO PAGO</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
