"use client";
import { useEffect, useState } from "react";
import { Calendar, MapPin, User, DollarSign, Clock, X, Image as ImageIcon, Loader2 } from "lucide-react";

type Evento = {
  id: string;
  titulo: string;
  descricao: string | null;
  flyer_url: string | null;
  local: string | null;
  cidade: string | null;
  estado: string | null;
  organizador: string | null;
  valor: number | null;
  data_hora: string;
};

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<Evento | null>(null);

  useEffect(() => {
    fetch("/api/eventos")
      .then(r => r.json())
      .then(d => setEventos(d.eventos || []))
      .finally(() => setLoading(false));
  }, []);

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long",
      year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  const formatarValor = (v: number | null) =>
    v === null ? "" : v === 0 ? "Gratuito 🎉" : `R$ ${Number(v).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-24">
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-[#C9A66B]/20 flex items-center justify-center">
          <Calendar className="text-[#C9A66B]" size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Eventos <span className="text-[#C9A66B]">PRO</span></h1>
          <p className="text-xs text-zinc-500">Fique por dentro dos próximos eventos da comunidade</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center mt-20">
          <Loader2 className="animate-spin text-[#C9A66B]" size={32} />
        </div>
      ) : eventos.length === 0 ? (
        <div className="text-center mt-20 text-zinc-600">
          <Calendar size={56} className="mx-auto mb-4 opacity-20" />
          <p className="font-black uppercase tracking-widest text-sm">Nenhum evento por enquanto</p>
          <p className="text-xs mt-2">Fique de olho — em breve novidades!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {eventos.map(e => (
            <button
              key={e.id}
              onClick={() => setSelecionado(e)}
              className="text-left bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden hover:border-[#C9A66B]/50 hover:scale-[1.02] transition-all group"
            >
              {/* FLYER */}
              <div className="relative aspect-video bg-zinc-800 overflow-hidden flex items-center justify-center">
                {e.flyer_url ? (
                  <img src={e.flyer_url} alt={e.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon size={40} className="text-zinc-600" />
                )}
                {/* Badge data */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A66B] flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(e.data_hora).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    {" · "}
                    {new Date(e.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}h
                  </span>
                </div>
              </div>

              {/* INFO */}
              <div className="p-4">
                <p className="font-black text-sm leading-tight mb-2 group-hover:text-[#C9A66B] transition-colors">{e.titulo}</p>
                <div className="flex flex-col gap-1 text-[11px] text-zinc-500">
                  {(e.cidade || e.local) && (
                    <span className="flex items-center gap-1">
                      <MapPin size={11} className="text-zinc-600" />
                      {[e.local, e.cidade, e.estado].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {e.organizador && (
                    <span className="flex items-center gap-1">
                      <User size={11} className="text-zinc-600" /> {e.organizador}
                    </span>
                  )}
                  {e.valor !== null && (
                    <span className={`flex items-center gap-1 font-bold ${e.valor === 0 ? "text-green-400" : "text-white"}`}>
                      <DollarSign size={11} /> {formatarValor(e.valor)}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-[#C9A66B] opacity-0 group-hover:opacity-100 transition-opacity">
                  Ver detalhes →
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* MODAL DE DETALHES */}
      {selecionado && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setSelecionado(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* FLYER GRANDE */}
            <div className="relative aspect-video bg-zinc-900 overflow-hidden flex items-center justify-center">
              {selecionado.flyer_url ? (
                <img src={selecionado.flyer_url} alt={selecionado.titulo} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={56} className="text-zinc-600" />
              )}
              <button
                onClick={() => setSelecionado(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 rounded-full p-1.5 text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* DETALHES */}
            <div className="p-6">
              <h2 className="text-xl font-black uppercase mb-4">{selecionado.titulo}</h2>

              <div className="flex flex-col gap-3">
                {/* DATA E HORA */}
                <div className="flex items-start gap-3 bg-zinc-900 rounded-xl px-4 py-3">
                  <Clock size={18} className="text-[#C9A66B] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Data e Hora</p>
                    <p className="text-sm font-bold capitalize">{formatarData(selecionado.data_hora)}</p>
                  </div>
                </div>

                {/* LOCAL */}
                {(selecionado.local || selecionado.cidade) && (
                  <div className="flex items-start gap-3 bg-zinc-900 rounded-xl px-4 py-3">
                    <MapPin size={18} className="text-[#C9A66B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Local</p>
                      {selecionado.local && <p className="text-sm font-bold">{selecionado.local}</p>}
                      <p className="text-sm text-zinc-400">{[selecionado.cidade, selecionado.estado].filter(Boolean).join(" · ")}</p>
                    </div>
                  </div>
                )}

                {/* ORGANIZADOR */}
                {selecionado.organizador && (
                  <div className="flex items-start gap-3 bg-zinc-900 rounded-xl px-4 py-3">
                    <User size={18} className="text-[#C9A66B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Quem está fazendo</p>
                      <p className="text-sm font-bold">{selecionado.organizador}</p>
                    </div>
                  </div>
                )}

                {/* VALOR */}
                {selecionado.valor !== null && (
                  <div className="flex items-start gap-3 bg-zinc-900 rounded-xl px-4 py-3">
                    <DollarSign size={18} className="text-[#C9A66B] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Valor</p>
                      <p className={`text-lg font-black ${selecionado.valor === 0 ? "text-green-400" : "text-white"}`}>
                        {formatarValor(selecionado.valor)}
                      </p>
                    </div>
                  </div>
                )}

                {/* DESCRIÇÃO */}
                {selecionado.descricao && (
                  <p className="text-sm text-zinc-400 leading-relaxed border-t border-zinc-800 pt-4 mt-1">
                    {selecionado.descricao}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelecionado(null)}
                className="w-full mt-5 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-xs tracking-widest py-3 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
