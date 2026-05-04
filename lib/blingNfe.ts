/**
 * Integração com Bling API v3 para emissão de NF-e
 *
 * Como configurar:
 * 1. No Bling: Configurações → NF-e → cadastre seu certificado A1
 * 2. No Bling: Configurações → API → Credenciais → gere o token
 * 3. Adicione no .env:  BLING_API_TOKEN=seu_access_token
 * 4. Execute o SQL nfe_bling.sql no Supabase
 * 5. Em Admin → NF-e → Configurações, preencha CNPJ, IE, regime
 * 6. Em Admin → Produtos, preencha o campo "ID Bling" em cada produto
 *
 * Fluxo de emissão:
 *   Pedido pago → Admin clica "Emitir NF-e" → sistema monta payload
 *   → envia ao Bling API → Bling envia à SEFAZ → retorna número/chave
 */

const BLING_BASE = "https://www.bling.com.br/Api/v3";

function getToken(): string | null {
  return process.env.BLING_API_TOKEN || null;
}

async function blingRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: Record<string, any>
): Promise<{ ok: boolean; data?: any; error?: string; status?: number }> {
  const token = getToken();
  if (!token) return { ok: false, error: "BLING_API_TOKEN não configurado no .env" };

  try {
    const res = await fetch(`${BLING_BASE}${path}`, {
      method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.error?.message || data?.message || JSON.stringify(data);
      return { ok: false, error: msg, status: res.status, data };
    }

    return { ok: true, data, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ─── Tipos ────────────────────────────────────────────────

export type DadosCliente = {
  nome: string;
  email?: string;
  cpf_cnpj: string;           // CPF (11 dígitos) ou CNPJ (14 dígitos)
  ie?: string;                // Inscrição Estadual (para PJ)
  telefone?: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;                 // ex: "SP", "MG"
};

export type ItemNfe = {
  bling_produto_id: string;   // ID do produto no Bling
  titulo: string;             // Descrição fallback
  quantidade: number;
  valor_unitario: number;
};

export type DadosNfe = {
  order_id: string;
  cliente: DadosCliente;
  itens: ItemNfe[];
  valor_frete: number;
  natureza_operacao?: string;
  cfop?: string;
  observacao?: string;
};

export type ResultadoNfe = {
  ok: boolean;
  bling_id?: string;
  numero_nfe?: string;
  serie?: string;
  chave_acesso?: string;
  xml_url?: string;
  pdf_url?: string;
  error?: string;
};

// ─── Emissão de NF-e ─────────────────────────────────────

export async function emitirNfe(dados: DadosNfe): Promise<ResultadoNfe> {
  const tipoPessoa = dados.cliente.cpf_cnpj.replace(/\D/g, "").length === 11 ? "F" : "J";

  const payload = {
    tipo: 1,
    finalidade: 1,
    naturezaOperacao: dados.natureza_operacao || "Venda de mercadoria ao consumidor final",
    contato: {
      nome:            dados.cliente.nome,
      email:           dados.cliente.email || "",
      tipoPessoa,
      numeroDocumento: dados.cliente.cpf_cnpj.replace(/\D/g, ""),
      ie:              dados.cliente.ie || "ISENTO",
      telefone:        (dados.cliente.telefone || "").replace(/\D/g, ""),
      endereco: {
        endereco:    dados.cliente.logradouro,
        numero:      dados.cliente.numero,
        complemento: dados.cliente.complemento || "",
        bairro:      dados.cliente.bairro,
        municipio:   dados.cliente.municipio,
        uf:          dados.cliente.uf,
        cep:         dados.cliente.cep.replace(/\D/g, ""),
        pais:        "Brasil",
      },
    },
    itens: dados.itens.map((item) => ({
      produto: { id: parseInt(item.bling_produto_id) },
      quantidade: item.quantidade,
      valor: item.valor_unitario,
      cfop: dados.cfop || "5102",
    })),
    transporte: {
      fretePorConta: 0,  // 0 = remetente (empresa), 9 = sem frete
      frete:         dados.valor_frete,
    },
    informacoesAdicionais: {
      informacoesContribuinte: dados.observacao || `Pedido MascPRO #${dados.order_id.slice(0, 8).toUpperCase()}`,
    },
  };

  const result = await blingRequest("POST", "/nfe", payload);

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const nfe = result.data?.data;
  return {
    ok:           true,
    bling_id:     String(nfe?.id || ""),
    numero_nfe:   String(nfe?.numero || ""),
    serie:        String(nfe?.serie || "1"),
    chave_acesso: nfe?.chaveAcesso || "",
  };
}

// ─── Cancelar NF-e ────────────────────────────────────────

export async function cancelarNfe(blingId: string, justificativa: string): Promise<{ ok: boolean; error?: string }> {
  if (!justificativa || justificativa.length < 15) {
    return { ok: false, error: "Justificativa mínima de 15 caracteres." };
  }

  const result = await blingRequest("POST", `/nfe/${blingId}/cancelar`, {
    justificativa,
  });

  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

// ─── Buscar PDF/XML da NF-e no Bling ─────────────────────

export async function buscarLinkNfe(blingId: string): Promise<{
  ok: boolean;
  xml_url?: string;
  pdf_url?: string;
  chave_acesso?: string;
  error?: string;
}> {
  const result = await blingRequest("GET", `/nfe/${blingId}`);
  if (!result.ok) return { ok: false, error: result.error };

  const nfe = result.data?.data;
  return {
    ok:           true,
    xml_url:      nfe?.xml || null,
    pdf_url:      nfe?.linkDanfe || null,
    chave_acesso: nfe?.chaveAcesso || null,
  };
}

// ─── Listar produtos no Bling (para vincular IDs) ─────────

export async function listarProdutosBling(busca?: string): Promise<{
  ok: boolean;
  produtos?: { id: string; codigo: string; descricao: string }[];
  error?: string;
}> {
  const qs = busca ? `?nome=${encodeURIComponent(busca)}` : "";
  const result = await blingRequest("GET", `/produtos${qs}`);
  if (!result.ok) return { ok: false, error: result.error };

  const lista = (result.data?.data || []).map((p: any) => ({
    id:        String(p.id),
    codigo:    p.codigo || "",
    descricao: p.nome || "",
  }));

  return { ok: true, produtos: lista };
}

// ─── Verificar se token está configurado ─────────────────

export function blingConfigurado(): boolean {
  return !!getToken();
}
