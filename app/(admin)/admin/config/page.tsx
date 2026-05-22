"use client";
import { useEffect, useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Settings, Loader2, Save, CheckCircle, AlertCircle } from "lucide-react";

type Config = {
  chave: string;
  valor: string;
  descricao: string | null;
  updated_at: string;
};

const LABELS: Record<string, { label: string; tipo: "number" | "text"; prefixo?: string; sufixo?: string; min?: number; max?: number }> = {
  correios_cep_origem: { label: "CEP de origem Correios (loja)", tipo: "text" },
  frete_pac_usar_estimativa: { label: "Usar frete estimado se Correios falhar", tipo: "text" },
  frete_pac_fallback_base: { label: "Base do frete estimado (R$ 0 = automático)", tipo: "number", prefixo: "R$", min: 0 },
  frete_gratis_acima:  { label: "Frete Grátis acima de",      tipo: "number", prefixo: "R$",  min: 0    },
  percentual_comissao: { label: "Comissão embaixador (indicação)", tipo: "number", sufixo: "%", min: 0, max: 100 },
  percentual_comissao_cabeleireiro: { label: "Comissão cabeleireiro (indicação)", tipo: "number", sufixo: "%", min: 0, max: 100 },
  taxa_saque:          { label: "Taxa de saque",               tipo: "number", sufixo: "%",   min: 0, max: 50  },
  estoque_alerta_min:  { label: "Alerta de estoque mínimo",    tipo: "number", sufixo: "un.", min: 0    },
  dias_cliente_risco:  { label: "Dias sem compra = risco",     tipo: "number", sufixo: "dias",min: 1    },
};

export default function ConfigPage() {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, "ok" | "erro">>({});
  const [valores, setValores] = useState<Record<string, string>>({});

  async function carregar() {
    setLoading(true);
    const res = await fetch("/api/admin/config", { cache: "no-store" });
    const d = await res.json().catch(() => null);
    if (d?.ok) {
      const existentes = (d.configs || []) as Config[];
      const byKey = new Map(existentes.map((c) => [c.chave, c]));
      const lista = Object.keys(LABELS).map((chave) =>
        byKey.get(chave) || {
          chave,
          valor: "",
          descricao: null,
          updated_at: new Date().toISOString(),
        }
      );
      setConfigs(lista);
      const map: Record<string, string> = {};
      for (const c of lista) map[c.chave] = c.valor;
      setValores(map);
    }
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function salvar(chave: string) {
    setSalvando(chave);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chave, valor: valores[chave] }),
    });
    const d = await res.json().catch(() => null);
    setFeedback(f => ({ ...f, [chave]: res.ok && d?.ok ? "ok" : "erro" }));
    setTimeout(() => setFeedback(f => { const n = { ...f }; delete n[chave]; return n; }), 2000);
    setSalvando(null);
  }

  const inputClass = "bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B] w-40 text-right tabular-nums";

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="text-[#C9A66B]" size={26} />
          <div>
            <h1 className="text-2xl font-black italic uppercase">Configurações <span className="text-[#C9A66B]">do Sistema</span></h1>
            <p className="text-zinc-500 text-xs">Parâmetros globais — alterações têm efeito imediato. Distribuidor não recebe comissão em R$ por indicação.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center mt-20"><Loader2 className="animate-spin text-[#C9A66B]" size={32} /></div>
        ) : (
          <div className="max-w-2xl flex flex-col gap-4">
            {configs
              .filter(c => LABELS[c.chave])
              .map(c => {
                const meta = LABELS[c.chave];
                const fb = feedback[c.chave];
                return (
                  <div key={c.chave} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{meta.label}</p>
                      {c.descricao && <p className="text-[10px] text-zinc-500 mt-0.5">{c.descricao}</p>}
                      <p className="text-[9px] text-zinc-700 mt-1">
                        Última alteração: {new Date(c.updated_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {meta.prefixo && <span className="text-xs text-zinc-500 font-bold">{meta.prefixo}</span>}
                      <input
                        type={meta.tipo}
                        min={meta.min}
                        max={meta.max}
                        step={meta.tipo === "number" ? "0.01" : undefined}
                        value={valores[c.chave] ?? c.valor}
                        onChange={e => setValores(v => ({ ...v, [c.chave]: e.target.value }))}
                        className={inputClass}
                        onKeyDown={e => { if (e.key === "Enter") salvar(c.chave); }}
                      />
                      {meta.sufixo && <span className="text-xs text-zinc-500 font-bold">{meta.sufixo}</span>}
                      <button
                        onClick={() => salvar(c.chave)}
                        disabled={salvando === c.chave}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${
                          fb === "ok" ? "bg-green-500/20 text-green-400" :
                          fb === "erro" ? "bg-red-500/20 text-red-400" :
                          "bg-zinc-800 text-zinc-400 hover:bg-[#C9A66B]/20 hover:text-[#C9A66B]"
                        } disabled:opacity-40`}
                      >
                        {salvando === c.chave
                          ? <Loader2 size={14} className="animate-spin" />
                          : fb === "ok" ? <CheckCircle size={14} />
                          : fb === "erro" ? <AlertCircle size={14} />
                          : <Save size={14} />
                        }
                      </button>
                    </div>
                  </div>
                );
              })}

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-4 mt-2">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Como usar</p>
              <ul className="text-xs text-zinc-500 space-y-1">
                <li>• Edite o valor e clique em <strong className="text-zinc-300">salvar</strong> ou pressione <kbd className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[10px]">Enter</kbd></li>
                <li>• <strong className="text-zinc-300">Frete Grátis:</strong> coloque 0 para desativar o frete grátis por valor</li>
                <li>• <strong className="text-zinc-300">CEP origem Correios:</strong> informe 8 dígitos para habilitar cálculo de frete PAC</li>
                <li>• <strong className="text-zinc-300">Comissões:</strong> embaixador e cabeleireiro podem ter percentuais diferentes; vale para novos pedidos</li>
                <li>• Todas as alterações ficam registradas no Audit Log</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
