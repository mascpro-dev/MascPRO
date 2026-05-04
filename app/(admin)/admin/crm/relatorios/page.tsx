"use client";
import { useState } from "react";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Download, FileText, ShoppingBag, Users, DollarSign, Kanban } from "lucide-react";

type TipoRelatorio = "pedidos" | "leads" | "clientes" | "comissoes";

const RELATORIOS: { tipo: TipoRelatorio; label: string; desc: string; icon: React.ReactNode; cor: string }[] = [
  { tipo: "pedidos",   label: "Pedidos",    desc: "Todos os pedidos com status, pagamento, rastreio e frete", icon: <ShoppingBag size={20} />, cor: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  { tipo: "leads",     label: "Leads CRM",  desc: "Pipeline de leads com status, origem e valor estimado",    icon: <Kanban size={20} />,      cor: "text-[#C9A66B] bg-[#C9A66B]/10 border-[#C9A66B]/30" },
  { tipo: "clientes",  label: "Clientes",   desc: "Membros da rede com PRO score e total de compras",         icon: <Users size={20} />,       cor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { tipo: "comissoes", label: "Comissões",  desc: "Histórico de comissões geradas e seus status",             icon: <DollarSign size={20} />,  cor: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
];

export default function RelatoriosPage() {
  const hoje = new Date().toISOString().slice(0, 10);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [inicio, setInicio] = useState(inicioMes);
  const [fim, setFim] = useState(hoje);
  const [baixando, setBaixando] = useState<TipoRelatorio | null>(null);

  async function exportar(tipo: TipoRelatorio) {
    setBaixando(tipo);
    try {
      const res = await fetch(`/api/admin/crm/relatorios?tipo=${tipo}&inicio=${inicio}&fim=${fim}`);
      if (!res.ok) { alert("Erro ao gerar relatório."); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tipo}_${inicio}_${fim}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setBaixando(null);
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <FileText className="text-[#C9A66B]" size={26} />
          <div>
            <h1 className="text-2xl font-black italic uppercase">Relatórios <span className="text-[#C9A66B]">& Exportação</span></h1>
            <p className="text-zinc-500 text-xs">Exporte dados em CSV compatível com Excel</p>
          </div>
        </div>

        {/* Período */}
        <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 mb-6">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-3">Período do Relatório</p>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Data Inicial</label>
              <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Data Final</label>
              <input type="date" value={fim} onChange={e => setFim(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#C9A66B]" />
            </div>
          </div>
        </div>

        {/* Relatórios disponíveis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RELATORIOS.map((r) => (
            <div key={r.tipo} className={`bg-zinc-900/50 border rounded-2xl p-6 flex items-center justify-between gap-4 ${r.cor.split(" ")[2] ? `border-${r.cor.split(" ")[2]}` : "border-white/5"}`}>
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${r.cor.split(" ")[1]} border ${r.cor.split(" ")[2] || ""}`}>
                  <span className={r.cor.split(" ")[0]}>{r.icon}</span>
                </div>
                <div>
                  <p className="font-black text-white">{r.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{r.desc}</p>
                  <p className="text-[10px] text-zinc-600 mt-1">{inicio} → {fim}</p>
                </div>
              </div>
              <button
                onClick={() => exportar(r.tipo)}
                disabled={baixando === r.tipo}
                className="shrink-0 flex items-center gap-2 bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-50 text-black font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all"
              >
                <Download size={14} />
                {baixando === r.tipo ? "..." : "CSV"}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Como usar</p>
          <ul className="text-xs text-zinc-500 space-y-1">
            <li>• Arquivos CSV com separador <code className="text-zinc-300">";"</code> e encoding UTF-8 com BOM</li>
            <li>• Para abrir no Excel: Dados → De Texto/CSV → selecione o arquivo</li>
            <li>• Relatório de Clientes não usa filtro de data (exporta toda a rede)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
