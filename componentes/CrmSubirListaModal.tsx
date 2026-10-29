"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { parseListaLeads } from "@/lib/crmImportarLista";
import {
  CAMPOS_PLANILHA,
  parseMatrizLeads,
  sugerirMapeamento,
  type CampoPlanilha,
} from "@/lib/crmImportarPlanilha";

type Responsavel = { id: string; full_name: string; role: string };
type Duplicado = { linha: number; nome: string; telefone: string | null; lead_id: string; lead_nome: string };
type Decisao = "manter" | "preencher_vazios" | "criar";

type Props = {
  api: string;
  tema: "claro" | "escuro";
  escolherResponsavel?: boolean;
  responsavelInicial?: string;
  onClose: () => void;
  onImportado: () => void;
};

function csvParaMatriz(texto: string): { cabecalhos: string[]; linhas: string[][] } {
  const bruto = texto.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const linhasBrutas = bruto.split("\n").filter((l) => l.trim());
  if (!linhasBrutas.length) return { cabecalhos: [], linhas: [] };
  const sep = linhasBrutas[0].includes(";") ? ";" : linhasBrutas[0].includes("\t") ? "\t" : ",";
  const split = (l: string) => l.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
  const cabecalhos = split(linhasBrutas[0]);
  const linhas = linhasBrutas.slice(1).map(split);
  return { cabecalhos, linhas };
}

export default function CrmSubirListaModal({
  api,
  tema,
  escolherResponsavel = false,
  responsavelInicial = "",
  onClose,
  onImportado,
}: Props) {
  const escuro = tema === "escuro";
  const [texto, setTexto] = useState("");
  const [arquivoNome, setArquivoNome] = useState("");
  const [cabecalhos, setCabecalhos] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<string[][]>([]);
  const [mapeamento, setMapeamento] = useState<CampoPlanilha[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [resumo, setResumo] = useState("");
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [responsavelId, setResponsavelId] = useState(responsavelInicial);
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [decisoes, setDecisoes] = useState<Record<number, Decisao>>({});
  const [origemLista, setOrigemLista] = useState("");

  useEffect(() => {
    if (!escolherResponsavel) return;
    let ativo = true;
    fetch(api, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!ativo || !d?.ok) return;
        setResponsaveis(d.responsaveis || []);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, [api, escolherResponsavel]);

  const parsedMatriz = useMemo(() => {
    if (cabecalhos.length && linhas.length) return parseMatrizLeads(cabecalhos, linhas, mapeamento, origemLista);
    return texto.trim() ? parseListaLeads(texto) : null;
  }, [cabecalhos, linhas, mapeamento, texto, origemLista]);

  async function aplicarArquivo(file: File) {
    setArquivoNome(file.name);
    setErro("");
    setResumo("");
    setDuplicados([]);
    const nome = file.name.toLowerCase();
    if (nome.endsWith(".xlsx") || nome.endsWith(".xls")) {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellFormula: false });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const matriz = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as string[][];
      const heads = (matriz[0] || []).map((c) => String(c || ""));
      const body = matriz.slice(1).map((r) => r.map((c) => String(c ?? "")));
      setCabecalhos(heads);
      setLinhas(body);
      setMapeamento(sugerirMapeamento(heads));
      setTexto("");
      return;
    }
    const buf = await file.arrayBuffer();
    let conteudo = new TextDecoder("utf-8").decode(buf);
    if (conteudo.includes("\uFFFD")) conteudo = new TextDecoder("windows-1252").decode(buf);
    setTexto(conteudo);
    const m = csvParaMatriz(conteudo);
    setCabecalhos(m.cabecalhos);
    setLinhas(m.linhas);
    setMapeamento(sugerirMapeamento(m.cabecalhos));
  }

  async function enviar(dry: boolean) {
    if (escolherResponsavel && !responsavelId) {
      setErro("Escolha o distribuidor ou o vendedor que recebe a lista.");
      return;
    }
    if (!texto.trim() && !linhas.length) {
      setErro("Cole a lista ou escolha um arquivo CSV/Excel.");
      return;
    }
    setEnviando(true);
    setErro("");
    setResumo("");
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texto,
          cabecalhos,
          linhas,
          mapeamento,
          arquivo_nome: arquivoNome,
          origem_lista: origemLista,
          dry_run: dry,
          decisoes,
          ...(escolherResponsavel ? { responsavel_id: responsavelId } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErro(data?.error || "Não foi possível subir a lista.");
        return;
      }
      if (dry) {
        setDuplicados(data.duplicados || []);
        const next: Record<number, Decisao> = {};
        for (const d of data.duplicados || []) next[d.linha] = decisoes[d.linha] || "manter";
        setDecisoes(next);
        setResumo(
          `${data.criados} contato(s) novos. ${data.duplicados?.length || 0} possível(is) duplicata(s). ${data.ignoradas?.length || 0} linha(s) com erro.`
        );
        return;
      }
      const destino = responsaveis.find((r) => r.id === responsavelId)?.full_name;
      setResumo(
        `${data.criados} criado(s)${data.atualizados ? `, ${data.atualizados} atualizado(s) só em campos vazios` : ""}${destino ? ` no pipeline de ${destino}` : ""}.`
      );
      onImportado();
    } finally {
      setEnviando(false);
    }
  }

  const caixa = escuro
    ? "bg-zinc-950 border border-zinc-800 text-white"
    : "bg-white border border-[#E7E1D6] text-[#2A2723]";
  const muted = escuro ? "text-zinc-500" : "text-[#8A847A]";
  const campo = escuro
    ? "w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#C9A66B]"
    : "w-full bg-[#FBF9F6] border border-[#E7E1D6] rounded-xl px-3 py-2 text-sm text-[#2A2723] outline-none focus:border-[#C9A66B]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 ${caixa}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-base font-bold">Subir lista</h2>
            <p className={`text-xs mt-1 ${muted}`}>
              CSV, XLS ou XLSX. Confira o mapeamento e as duplicatas antes de gravar. Histórico e responsável não são sobrescritos.
            </p>
          </div>
          <button type="button" onClick={onClose} className={muted}>
            <X size={18} />
          </button>
        </div>

        {escolherResponsavel && (
          <div className="mb-3">
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${muted}`}>
              Pipeline de destino *
            </label>
            <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)} className={campo}>
              <option value="">Selecione...</option>
              <optgroup label="Distribuidores">
                {responsaveis.filter((r) => r.role === "DISTRIBUIDOR").map((r) => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </optgroup>
              <optgroup label="Vendedores">
                {responsaveis.filter((r) => r.role === "VENDEDOR").map((r) => (
                  <option key={r.id} value={r.id}>{r.full_name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        <input
          value={origemLista}
          onChange={(e) => setOrigemLista(e.target.value)}
          placeholder="Origem da lista (opcional)"
          className={`${campo} mb-3`}
        />

        <label className={`mb-3 inline-flex items-center gap-2 text-xs font-bold cursor-pointer ${escuro ? "text-[#C9A66B]" : "text-[#8A6A32]"}`}>
          <Upload size={14} />
          Escolher CSV / Excel
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void aplicarArquivo(file);
              e.target.value = "";
            }}
          />
        </label>

        {!cabecalhos.length && (
          <textarea
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              const m = csvParaMatriz(e.target.value);
              setCabecalhos(m.cabecalhos);
              setLinhas(m.linhas);
              setMapeamento(sugerirMapeamento(m.cabecalhos));
              setResumo("");
            }}
            rows={6}
            placeholder={"Nome;Empresa;Telefone;Cidade;UF;Email"}
            className={campo}
          />
        )}

        {cabecalhos.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <p className={`text-[11px] mb-2 ${muted}`}>Mapeamento de colunas · {arquivoNome || "texto colado"}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {cabecalhos.map((h, i) => (
                <label key={`${h}-${i}`} className={`text-[11px] ${muted}`}>
                  <span className="block truncate mb-1">{h || `Coluna ${i + 1}`}</span>
                  <select
                    value={mapeamento[i] || "ignorar"}
                    onChange={(e) => {
                      const next = [...mapeamento];
                      next[i] = e.target.value as CampoPlanilha;
                      setMapeamento(next);
                    }}
                    className={campo}
                  >
                    {CAMPOS_PLANILHA.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-3 overflow-auto max-h-40 border border-[#E7E1D6] rounded-xl">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className={escuro ? "bg-zinc-900" : "bg-[#F6F3EE]"}>
                    {cabecalhos.slice(0, 8).map((h, i) => (
                      <th key={i} className="text-left px-2 py-1 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-t border-[#E7E1D6]">
                      {cabecalhos.slice(0, 8).map((_, j) => (
                        <td key={j} className="px-2 py-1 truncate max-w-[120px]">{r[j]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {parsedMatriz && "leads" in parsedMatriz && !parsedMatriz.erro && (
          <p className={`text-xs mt-2 ${muted}`}>{parsedMatriz.leads.length} contato(s) válidos na prévia.</p>
        )}
        {parsedMatriz && "ignoradas" in parsedMatriz && parsedMatriz.ignoradas.length > 0 && (
          <p className="text-xs mt-1 text-amber-600">{parsedMatriz.ignoradas.length} linha(s) com erro na prévia.</p>
        )}

        {duplicados.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className={`text-xs font-semibold ${muted}`}>Possíveis duplicatas (telefone). Nada é mesclado sozinho.</p>
            {duplicados.map((d) => (
              <div key={d.linha} className={`text-[12px] flex flex-col md:flex-row md:items-center gap-2 ${muted}`}>
                <span className="flex-1">Linha {d.linha}: {d.nome} → já existe {d.lead_nome}</span>
                <select
                  value={decisoes[d.linha] || "manter"}
                  onChange={(e) => setDecisoes((s) => ({ ...s, [d.linha]: e.target.value as Decisao }))}
                  className={campo}
                >
                  <option value="manter">Manter existente</option>
                  <option value="preencher_vazios">Preencher só campos vazios</option>
                  <option value="criar">Criar novo contato</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {erro && <p className="text-xs mt-2 text-red-400">{erro}</p>}
        {resumo && <p className="text-xs mt-2 text-emerald-500">{resumo}</p>}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void enviar(true)}
            disabled={enviando}
            className="h-11 rounded-xl border border-[#E7E1D6] text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : null}
            Revisar
          </button>
          <button
            type="button"
            onClick={() => void enviar(false)}
            disabled={enviando}
            className="h-11 bg-[#C9A66B] hover:bg-[#b08d55] disabled:opacity-60 text-black font-black uppercase text-xs tracking-widest rounded-xl flex items-center justify-center gap-2"
          >
            {enviando ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Confirmar importação
          </button>
        </div>
      </div>
    </div>
  );
}
