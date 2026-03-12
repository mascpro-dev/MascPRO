"use client";

import { useState, useEffect } from "react";
import { useCart } from "./CartContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  X, Plus, Minus, Trash2, CreditCard, Loader2,
  MapPin, CheckCircle2, Truck, ChevronDown, ChevronUp,
} from "lucide-react";

// Frete grátis acima deste valor (produtos sem frete)
const FRETE_GRATIS_ACIMA = 1500;

// Tabela de frete por prefixo de CEP (estado)
function calcularFrete(cep: string): number {
  const prefix = parseInt(cep.replace(/\D/g, "").substring(0, 2));
  if (isNaN(prefix)) return 35;
  if (prefix >= 1  && prefix <= 9)  return 12; // SP capital
  if (prefix >= 10 && prefix <= 19) return 15; // SP interior
  if (prefix >= 20 && prefix <= 28) return 18; // RJ
  if (prefix >= 29 && prefix <= 29) return 22; // ES
  if (prefix >= 30 && prefix <= 39) return 20; // MG
  if (prefix >= 40 && prefix <= 48) return 28; // BA
  if (prefix >= 49 && prefix <= 49) return 28; // SE
  if (prefix >= 50 && prefix <= 56) return 28; // PE
  if (prefix >= 57 && prefix <= 57) return 28; // AL
  if (prefix >= 58 && prefix <= 58) return 30; // PB
  if (prefix >= 59 && prefix <= 59) return 30; // RN
  if (prefix >= 60 && prefix <= 63) return 30; // CE
  if (prefix >= 64 && prefix <= 64) return 32; // PI
  if (prefix >= 65 && prefix <= 65) return 32; // MA
  if (prefix >= 66 && prefix <= 68) return 38; // PA
  if (prefix >= 69 && prefix <= 69) return 45; // AM
  if (prefix >= 70 && prefix <= 73) return 25; // DF/GO
  if (prefix >= 74 && prefix <= 76) return 25; // GO
  if (prefix >= 77 && prefix <= 77) return 35; // TO
  if (prefix >= 78 && prefix <= 78) return 35; // MT
  if (prefix >= 79 && prefix <= 79) return 28; // MS
  if (prefix >= 80 && prefix <= 87) return 22; // PR
  if (prefix >= 88 && prefix <= 89) return 22; // SC
  if (prefix >= 90 && prefix <= 99) return 25; // RS
  return 35;
}

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

  const subtotal = cart.reduce(
    (acc: number, i: any) => acc + (Number(i.displayPrice || i.price || 0) * (i.quantity || 1)),
    0
  );
  const freteGratis = subtotal >= FRETE_GRATIS_ACIMA;
  const freteValor = freteGratis ? 0 : (frete ?? 0);
  const total = subtotal + freteValor;

  // Carrega endereço salvo no perfil
  useEffect(() => {
    if (!isCartOpen) return;
    async function carregarEndereco() {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("cep, endereco, numero, complemento, bairro, cidade, estado")
        .eq("id", authData.session.user.id)
        .single();
      if (profile?.cep) {
        const end: Endereco = {
          cep: profile.cep || "",
          endereco: profile.endereco || "",
          numero: profile.numero || "",
          complemento: profile.complemento || "",
          bairro: profile.bairro || "",
          cidade: profile.cidade || "",
          estado: profile.estado || "",
        };
        setEndereco(end);
        setEnderecoSalvo(true);
        const f = calcularFrete(profile.cep);
        setFrete(f);
        setFreteInfo(freteGratis ? "Frete grátis" : `R$ ${f.toFixed(2)} — PAC Correios`);
      }
    }
    carregarEndereco();
  }, [isCartOpen, supabase, freteGratis]);

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
        const f = calcularFrete(clean);
        setFrete(f);
        setFreteInfo(subtotal >= FRETE_GRATIS_ACIMA ? "Frete grátis!" : `R$ ${f.toFixed(2)} — PAC Correios`);
      }
    } finally {
      setLoadingCep(false);
    }
  }

  async function salvarEndereco() {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return;
    await supabase.from("profiles").update({
      cep: endereco.cep,
      endereco: endereco.endereco,
      numero: endereco.numero,
      complemento: endereco.complemento,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      estado: endereco.estado,
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
    setLoading(true);
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
        body: JSON.stringify({
          items: cart,
          userId: session.user.id,
          userEmail: session.user.email,
          userName: profile?.full_name || "",
          accessToken: session.access_token,
          shippingCost: freteValor,
          shippingCep: endereco.cep,
          shippingAddress: enderecoCompleto,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.init_point) {
        alert(data.error || "Erro ao iniciar pagamento.");
        setLoading(false);
        return;
      }

      clearCart();
      setIsCartOpen(false);
      window.location.href = data.init_point;
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o gateway de pagamento.");
    } finally {
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
            {frete !== null && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  <Truck size={13} /> Frete
                </div>
                {freteGratis ? (
                  <span className="text-emerald-400 text-xs font-black uppercase">Grátis!</span>
                ) : (
                  <span className="text-white text-xs font-black">R$ {freteValor.toFixed(2)}</span>
                )}
              </div>
            )}

            {/* Frete grátis info */}
            {!freteGratis && subtotal > 0 && (
              <p className="text-[10px] text-zinc-500 text-center">
                🎁 Frete grátis em compras acima de{" "}
                <span className="text-[#C9A66B] font-bold">R$ {FRETE_GRATIS_ACIMA.toLocaleString("pt-BR")}</span>
                {subtotal > 0 && ` — faltam R$ ${(FRETE_GRATIS_ACIMA - subtotal).toFixed(2)}`}
              </p>
            )}
            {freteGratis && (
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
