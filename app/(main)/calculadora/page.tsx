"use client";
import { useState } from "react";
import { Calculator, DollarSign, Clock, Zap, Wifi, Droplets, Home, ChevronRight } from "lucide-react";

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function CalculadoraPage() {
  const [form, setForm] = useState({
    aluguel: "",
    energia: "",
    agua: "",
    internet: "",
    outros: "",
    horas_mes: "176",
    lucro_desejado: "",
  });
  const [resultado, setResultado] = useState<null | {
    custo_hora: number;
    valor_com_lucro: number;
    breakdown: { label: string; valor: number }[];
  }>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  function calcular() {
    const aluguel = Number(form.aluguel) || 0;
    const energia = Number(form.energia) || 0;
    const agua = Number(form.agua) || 0;
    const internet = Number(form.internet) || 0;
    const outros = Number(form.outros) || 0;
    const horas = Number(form.horas_mes) || 176;
    const lucro = Number(form.lucro_desejado) || 0;

    const total_fixo = aluguel + energia + agua + internet + outros;
    const custo_hora = total_fixo / horas;
    const valor_com_lucro = custo_hora + lucro;

    setResultado({
      custo_hora,
      valor_com_lucro,
      breakdown: [
        { label: "Aluguel / mês", valor: aluguel },
        { label: "Energia", valor: energia },
        { label: "Água", valor: agua },
        { label: "Internet", valor: internet },
        { label: "Outros fixos", valor: outros },
        { label: "Total fixo mensal", valor: total_fixo },
        { label: `Horas trabalhadas/mês (${horas}h)`, valor: horas },
        { label: "Custo por hora", valor: custo_hora },
        { label: "Ganho desejado/hora", valor: lucro },
      ],
    });
  }

  const campo = (key: string, label: string, icon: any, placeholder = "0,00", tipo = "currency") => {
    const Icon = icon;
    return (
      <div>
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
          <Icon size={11} /> {label}
        </label>
        <div className="relative">
          {tipo === "currency" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">R$</span>}
          <input
            type="number" min="0" step={tipo === "currency" ? "0.01" : "1"}
            value={(form as any)[key]}
            onChange={e => set(key, e.target.value)}
            placeholder={placeholder}
            className={`w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 text-sm text-white outline-none focus:border-[#C9A66B] ${tipo === "currency" ? "pl-8 pr-4" : "px-4"}`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24 max-w-2xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/20 flex items-center justify-center">
          <Calculator className="text-[#C9A66B]" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Calculadora <span className="text-[#C9A66B]">PRO</span></h1>
          <p className="text-xs text-zinc-500">Descubra o valor justo do seu serviço</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* CUSTOS FIXOS */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Custos Fixos Mensais</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campo("aluguel", "Aluguel do espaço", Home)}
            {campo("energia", "Energia elétrica", Zap)}
            {campo("agua", "Água", Droplets)}
            {campo("internet", "Internet", Wifi)}
            {campo("outros", "Outros fixos (produtos, etc.)", DollarSign)}
          </div>
        </div>

        {/* HORAS E LUCRO */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Sua Jornada</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campo("horas_mes", "Horas trabalhadas por mês", Clock, "176", "number")}
            {campo("lucro_desejado", "Ganho desejado por hora", DollarSign)}
          </div>
          <p className="text-[10px] text-zinc-600 mt-3">* 176h = 8h/dia · 22 dias. Ajuste conforme sua rotina.</p>
        </div>

        <button
          onClick={calcular}
          className="w-full bg-[#C9A66B] hover:bg-[#b08d55] text-black font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm"
        >
          <Calculator size={18} /> Calcular Valor do Serviço
        </button>

        {/* RESULTADO */}
        {resultado && (
          <div className="bg-zinc-900/60 border border-[#C9A66B]/30 rounded-2xl p-6 space-y-4">
            <p className="text-[10px] font-black text-[#C9A66B] uppercase tracking-widest">Resultado</p>

            {/* DESTAQUE */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800 rounded-xl p-4 text-center">
                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Custo por hora</p>
                <p className="text-2xl font-black text-white">{moeda(resultado.custo_hora)}</p>
                <p className="text-[10px] text-zinc-600 mt-1">apenas para cobrir gastos</p>
              </div>
              <div className="bg-[#C9A66B]/10 border border-[#C9A66B]/30 rounded-xl p-4 text-center">
                <p className="text-[10px] text-[#C9A66B] uppercase font-bold mb-1">Valor com lucro</p>
                <p className="text-2xl font-black text-[#C9A66B]">{moeda(resultado.valor_com_lucro)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">valor justo por hora</p>
              </div>
            </div>

            {/* EXEMPLOS DE SERVIÇO */}
            <div>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Exemplos por tempo de serviço</p>
              <div className="space-y-2">
                {[
                  { tempo: 0.5, nome: "Serviço rápido (30 min)" },
                  { tempo: 1, nome: "Corte padrão (1h)" },
                  { tempo: 1.5, nome: "Corte + barba (1h30)" },
                  { tempo: 2, nome: "Coloração básica (2h)" },
                  { tempo: 3, nome: "Progressiva (3h)" },
                ].map(s => (
                  <div key={s.tempo} className="flex items-center justify-between bg-zinc-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={14} className="text-[#C9A66B]" />
                      <span className="text-sm">{s.nome}</span>
                    </div>
                    <span className="font-black text-[#C9A66B]">{moeda(resultado.valor_com_lucro * s.tempo)}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
              Este é o valor mínimo para cobrir seus custos e atingir seu ganho desejado.<br />
              Técnica, experiência e posicionamento justificam cobrar mais.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
