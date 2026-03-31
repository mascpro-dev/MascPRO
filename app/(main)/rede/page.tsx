"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Users, CheckCircle, TrendingUp, Copy, Instagram, MessageCircle, Search, Filter, AlertTriangle, DollarSign, ArrowDownToLine, X, Loader2, Clock, XCircle, ChevronDown, ChevronUp, Receipt } from "lucide-react";

export default function RedePage() {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  
  // Dados Gerais
  const [linkConvite, setLinkConvite] = useState("");
  
  // Contadores
  const [totalIndicados, setTotalIndicados] = useState(0);      // Mostra TODOS (ex: 14)
  const [membrosAtivosCount, setMembrosAtivosCount] = useState(0); // Só os verdes

  // PRO Financeiro
  const [bonusDireto, setBonusDireto] = useState(0);  
  const [ganhoPassivo, setGanhoPassivo] = useState(0); 
  const [saldoTotal, setSaldoTotal] = useState(0);     

  // Comissões de vendas (R$)
  const [saldoComissoes, setSaldoComissoes] = useState(0);
  const [totalComissoes, setTotalComissoes] = useState(0);

  // Modal de saque
  const [showSaque, setShowSaque] = useState(false);
  const [chavePix, setChavePix] = useState("");
  const [loadingSaque, setLoadingSaque] = useState(false);
  const [saqueEnviado, setSaqueEnviado] = useState(false);

  // Histórico de saques
  const [historicoSaques, setHistoricoSaques] = useState<any[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);

  // Lista da Equipe
  const [listaEquipe, setListaEquipe] = useState<any[]>([]);
  const [membrosComPedidoNoMes, setMembrosComPedidoNoMes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function carregarDados() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // 1. Link
        if (typeof window !== 'undefined') {
            const origem = window.location.origin;
            setLinkConvite(`${origem}/cadastro?ref=${user.id}`);
        }

        // 2. Financeiro (Seu Perfil)
        const { data: profile } = await supabase
          .from("profiles")
          .select("network_coins, passive_pro, total_compras_rede") 
          .eq("id", user.id)
          .single();

        if (profile) {
            const direto = profile.network_coins || 0;
            const passivo = profile.passive_pro || 0;
            const comprasRede = profile.total_compras_rede || 0;
            
            setBonusDireto(direto);
            setGanhoPassivo(passivo);
            setSaldoTotal(direto + passivo + comprasRede);
        }

        // 3. Equipe (Busca TODOS que você indicou)
        // DICA: Se continuar vindo 0, verifique se o RLS da tabela 'profiles' permite leitura.
        const { data: equipe, error } = await supabase
          .from("profiles")
          .select("*") // Pega tudo para não ter erro de coluna
          .eq("indicado_por", user.id)
          .order('created_at', { ascending: false });

        if (error) {
            console.error("Erro ao buscar equipe:", error);
        }

        // Busca saldo de comissões de vendas (R$)
        const { data: comissoes } = await supabase
          .from("commissions")
          .select("valor_comissao, status")
          .eq("embaixador_id", user.id);

        // Busca histórico de saques
        const { data: saques } = await supabase
          .from("withdrawal_requests")
          .select("id, valor_bruto, valor_taxa, valor_liquido, chave_pix, status, created_at, processado_em")
          .eq("embaixador_id", user.id)
          .order("created_at", { ascending: false });
        setHistoricoSaques(saques || []);

        if (comissoes) {
          const disponivel = comissoes
            .filter((c: any) => c.status === "disponivel")
            .reduce((acc: number, c: any) => acc + Number(c.valor_comissao), 0);
          const totalG = comissoes
            .reduce((acc: number, c: any) => acc + Number(c.valor_comissao), 0);
          setSaldoComissoes(disponivel);
          setTotalComissoes(totalG);
        }

        if (equipe) {
            setListaEquipe(equipe);
            setTotalIndicados(equipe.length);

            const equipeIds = equipe.map((m: any) => m.id);
            let mapAtivos: Record<string, boolean> = {};

            if (equipeIds.length > 0) {
              // Usa API com service role para contornar RLS nos pedidos dos membros
              try {
                const res = await fetch("/api/rede/status", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ equipeIds }),
                });
                if (res.ok) {
                  const json = await res.json();
                  mapAtivos = json.ativos || {};
                }
              } catch (e) {
                console.error("Erro ao buscar status da equipe:", e);
              }
            }

            setMembrosComPedidoNoMes(mapAtivos);
            const totalAtivos = equipe.filter((m: any) => !!mapAtivos[m.id]).length;
            setMembrosAtivosCount(totalAtivos);
        }
      }
      setLoading(false);
    }
    
    carregarDados();
  }, []);

  const copiarLink = () => {
    navigator.clipboard.writeText(linkConvite);
    alert("Link copiado!");
  };

  const solicitarSaque = async () => {
    if (saldoComissoes <= 0) { alert("Você não tem saldo disponível para saque."); return; }
    if (!chavePix.trim()) { alert("Informe sua chave PIX."); return; }
    setLoadingSaque(true);
    try {
      const res = await fetch("/api/saques/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valorBruto: saldoComissoes, chavePix }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        alert("Erro ao solicitar saque: " + (data?.error || "Tente novamente."));
        return;
      }
      setSaldoComissoes(0);
      setSaqueEnviado(true);
    } finally {
      setLoadingSaque(false);
    }
  };

  // ATIVO = tem pedido pago/em separação/despachado atualizado este mês
  const verificarStatus = (memberId: string) => {
    return !!membrosComPedidoNoMes[memberId];
  };

  return (
    <div className="p-6 md:p-10 min-h-screen bg-black text-white pb-20">
      
      {/* CABEÇALHO */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-black italic uppercase text-white mb-1">
            MINHA <span className="text-[#C9A66B]">REDE</span>
          </h1>
          <p className="text-gray-400 text-sm">Gerencie sua equipe e amplie seus ganhos.</p>
        </div>

        <div className="w-full xl:w-auto flex flex-col items-end gap-2">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">SEU LINK DE CONVITE</span>
            <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-lg items-center">
                <div className="px-4 text-gray-300 text-xs font-mono truncate w-48 md:w-64">
                    {linkConvite || "..."}
                </div>
                <button onClick={copiarLink} className="bg-[#C9A66B] hover:bg-[#b08d55] text-black font-bold text-xs uppercase px-4 py-2 rounded transition-colors">
                    COPIAR
                </button>
            </div>
        </div>
      </div>

      {/* CARDS DE TOPO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Total Indicados (AGORA VAI MOSTRAR 14) */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-900/20 text-blue-500 flex items-center justify-center">
                <Users size={24} />
            </div>
            <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">TOTAL INDICADOS</p>
                <p className="text-3xl font-black text-white">{totalIndicados}</p>
            </div>
        </div>

        {/* Membros Ativos (Contador do Mês) */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-green-500">
            <div className="w-12 h-12 rounded-lg bg-green-900/20 text-green-500 flex items-center justify-center">
                <CheckCircle size={24} />
            </div>
            <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">MEMBROS ATIVOS</p>
                <p className="text-3xl font-black text-white">{membrosAtivosCount}</p>
                <p className="text-[10px] text-gray-600">No mês atual</p>
            </div>
        </div>

        {/* PROs Gerados */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#C9A66B]/20 text-[#C9A66B] flex items-center justify-center">
                <TrendingUp size={24} />
            </div>
            <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">PROS GERADOS</p>
                <p className="text-3xl font-black text-white">{bonusDireto} <span className="text-sm">PRO</span></p>
            </div>
        </div>
      </div>

      {/* BANNER RESIDUAL (750 PRO) */}
      <div className="w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl mb-10 relative overflow-hidden group hover:border-[#C9A66B]/30 transition-all">
         <div className="relative z-10">
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mb-2">SALDO RESIDUAL (REDE)</p>
            <h2 className="text-6xl font-black text-[#C9A66B] mb-2 tracking-tighter">
                {saldoTotal} <span className="text-2xl text-white">PRO</span>
            </h2>
            <p className="text-gray-500 text-xs italic opacity-60">
                * Bônus direto ({bonusDireto}) + Passivo ({ganhoPassivo}) + Compras da rede ({saldoTotal - bonusDireto - ganhoPassivo}) PRO
            </p>
         </div>
      </div>

      {/* CARD DE COMISSÕES DE VENDAS (R$) */}
      <div className="w-full bg-gradient-to-r from-green-950/40 to-zinc-900 border border-green-800/40 p-8 rounded-3xl mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className="text-green-400 font-bold uppercase text-xs tracking-widest mb-1 flex items-center gap-2">
            <DollarSign size={14} /> COMISSÕES DE VENDAS (15% por indicado)
          </p>
          <h2 className="text-5xl font-black text-white tracking-tighter">
            R$ {saldoComissoes.toFixed(2)}
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            Total acumulado: R$ {totalComissoes.toFixed(2)} · Saque com desconto de 11% de impostos
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { setShowSaque(true); setSaqueEnviado(false); }}
            disabled={saldoComissoes <= 0}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black uppercase text-xs tracking-widest px-6 py-4 rounded-xl transition-all whitespace-nowrap"
          >
            <ArrowDownToLine size={18} /> SACAR
          </button>
          {historicoSaques.length > 0 && (
            <button
              onClick={() => setShowHistorico(!showHistorico)}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all"
            >
              <Receipt size={13} />
              {showHistorico ? "Ocultar" : "Ver recibos"}
              {showHistorico ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* HISTÓRICO DE SAQUES */}
      {showHistorico && historicoSaques.length > 0 && (
        <div className="mb-10 bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center gap-2">
            <Receipt size={16} className="text-[#C9A66B]" />
            <p className="text-sm font-black uppercase tracking-widest text-white">Histórico de Saques</p>
          </div>
          <div className="flex flex-col divide-y divide-zinc-800">
            {historicoSaques.map((s) => {
              const status = s.status as string;
              const isAprovado = status === "aprovado";
              const isRejeitado = status === "rejeitado";
              return (
                <div key={s.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isAprovado ? "bg-green-900/30" : isRejeitado ? "bg-red-900/30" : "bg-zinc-800"}`}>
                      {isAprovado ? <CheckCircle size={18} className="text-green-400" /> : isRejeitado ? <XCircle size={18} className="text-red-400" /> : <Clock size={18} className="text-zinc-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        R$ {Number(s.valor_liquido).toFixed(2)}{" "}
                        <span className="text-zinc-500 font-normal text-xs">(bruto R$ {Number(s.valor_bruto).toFixed(2)})</span>
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        PIX: <span className="text-zinc-300 font-mono">{s.chave_pix}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:text-right">
                    <div>
                      <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Solicitado em</p>
                      <p className="text-xs font-bold text-zinc-300">
                        {new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                      </p>
                    </div>
                    {s.processado_em && (
                      <div>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">Processado em</p>
                        <p className="text-xs font-bold text-green-400">
                          {new Date(s.processado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </p>
                      </div>
                    )}
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                      isAprovado ? "bg-green-900/20 text-green-400 border-green-800/40" :
                      isRejeitado ? "bg-red-900/20 text-red-400 border-red-800/40" :
                      "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}>
                      {isAprovado ? "✓ Aprovado · PIX enviado" : isRejeitado ? "✗ Rejeitado" : "⏳ Aguardando"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE SAQUE */}
      {showSaque && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0f0f0f] border border-zinc-800 rounded-2xl p-8 w-full max-w-md relative">
            <button onClick={() => setShowSaque(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <X size={20} />
            </button>

            {saqueEnviado ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-black text-white mb-2">Saque solicitado!</h3>
                <p className="text-gray-400 text-sm">O PIX será processado em até 2 dias úteis.</p>
                <button onClick={() => setShowSaque(false)} className="mt-6 bg-[#C9A66B] text-black font-black uppercase text-xs px-8 py-3 rounded-xl">FECHAR</button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-white uppercase mb-1">Solicitar Saque</h3>
                <p className="text-gray-500 text-xs mb-6">Valor bruto disponível: <strong className="text-white">R$ {saldoComissoes.toFixed(2)}</strong></p>

                <div className="bg-zinc-900 rounded-xl p-4 mb-6 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Valor bruto</span>
                    <span className="text-white font-bold">R$ {saldoComissoes.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Impostos (11%)</span>
                    <span className="text-red-400 font-bold">- R$ {(saldoComissoes * 0.11).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 flex justify-between">
                    <span className="text-white font-black uppercase text-xs">Você recebe</span>
                    <span className="text-green-400 font-black text-lg">R$ {(saldoComissoes * 0.89).toFixed(2)}</span>
                  </div>
                </div>

                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Chave PIX</label>
                <input
                  type="text"
                  value={chavePix}
                  onChange={e => setChavePix(e.target.value)}
                  placeholder="CPF, telefone, e-mail ou chave aleatória"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#C9A66B] mb-6"
                />

                <button
                  onClick={solicitarSaque}
                  disabled={loadingSaque}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-black uppercase text-xs tracking-widest h-12 rounded-xl flex items-center justify-center gap-2"
                >
                  {loadingSaque ? <Loader2 size={18} className="animate-spin" /> : <><ArrowDownToLine size={16} /> CONFIRMAR SAQUE</>}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* LISTA DE MEMBROS (AGORA MOSTRA TODOS) */}
      <div>
        <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4">
            <h3 className="text-xl font-black italic text-white uppercase">MEMBROS DA <span className="text-[#C9A66B]">EQUIPE</span></h3>
            
            <div className="flex gap-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input type="text" placeholder="Buscar indicado..." className="bg-black border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:border-[#C9A66B] outline-none w-64"/>
                </div>
                <button className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg text-gray-400 hover:text-white">
                    <Filter size={18} />
                </button>
            </div>
        </div>
        
        {/* TABELA DE MEMBROS */}
        <div className="flex flex-col gap-3">
            {listaEquipe.length > 0 ? (
                listaEquipe.map((membro) => {
                    const isAtivo = verificarStatus(membro.id);

                    return (
                        <div key={membro.id} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between hover:bg-zinc-900 transition-colors group">
                            
                            <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                                <div className="w-10 h-10 rounded-lg bg-[#C9A66B] flex items-center justify-center font-bold text-black text-lg">
                                    {membro.full_name ? membro.full_name.charAt(0) : "M"}
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm md:text-base">{membro.full_name || "Membro da Rede"}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">
                                        {membro.role || "CABELEIREIRO"} • {new Date(membro.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                                <div className="flex gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                                    {membro.instagram ? (
                                      <a
                                        href={`https://instagram.com/${membro.instagram.replace(/^@/, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={`@${membro.instagram.replace(/^@/, "")}`}
                                      >
                                        <Instagram size={18} className="text-gray-400 hover:text-[#C9A66B] cursor-pointer" />
                                      </a>
                                    ) : (
                                      <Instagram size={18} className="text-gray-600 cursor-not-allowed" />
                                    )}
                                    {membro.whatsapp ? (
                                      <a
                                        href={`https://wa.me/55${membro.whatsapp.replace(/\D/g, "")}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title={membro.whatsapp}
                                      >
                                        <MessageCircle size={18} className="text-gray-400 hover:text-green-500 cursor-pointer" />
                                      </a>
                                    ) : (
                                      <MessageCircle size={18} className="text-gray-600 cursor-not-allowed" />
                                    )}
                                </div>

                                {/* BOTÃO DINÂMICO: MUDA A COR SOZINHO */}
                                {isAtivo ? (
                                    <span className="px-4 py-1.5 bg-green-900/20 text-green-500 text-[10px] font-black uppercase rounded border border-green-500/30 tracking-widest min-w-[80px] text-center shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                                        ATIVO
                                    </span>
                                ) : (
                                    <span className="px-4 py-1.5 bg-zinc-800 text-gray-500 text-[10px] font-black uppercase rounded border border-zinc-700 tracking-widest min-w-[80px] text-center">
                                        INATIVO
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                // MENSAGEM SE A LISTA ESTIVER ZERADA (DEBUG)
                <div className="text-center py-10 bg-zinc-900/20 rounded-xl border border-dashed border-zinc-800">
                    <AlertTriangle className="mx-auto text-yellow-500 mb-2" />
                    <p className="text-white font-bold">Nenhum indicado encontrado (0).</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                        Se você tem certeza que indicou pessoas, verifique se a coluna <strong>"indicado_por"</strong> existe no banco e se as permissões (RLS) da tabela 'profiles' permitem leitura.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}