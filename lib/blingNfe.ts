/**
 * Integração com Bling API v3 para emissão de NF-e
 * Documentação: https://developer.bling.com.br
 *
 * Para ativar:
 * 1. Acesse app.bling.com.br > Configurações > API > Credenciais
 * 2. Crie uma credencial OAuth2 e gere o token
 * 3. Adicione ao .env:
 *    BLING_API_TOKEN=seu_access_token
 *    BLING_CLIENT_ID=seu_client_id
 *    BLING_CLIENT_SECRET=seu_client_secret
 *
 * Pré-requisitos no Bling antes de usar esta integração:
 * - Cadastrar o certificado digital A1 (Configurações > NF-e > Certificado)
 * - Cadastrar CFOP padrão (Configurações > NF-e)
 * - Homologar na SEFAZ (Configurações > NF-e > Ambiente)
 * - Cadastrar produtos com NCM (Produtos > campo NCM)
 */

const BLING_BASE = "https://www.bling.com.br/Api/v3";

export type PedidoNfe = {
  orderId: string;
  cliente: {
    nome: string;
    email: string;
    cpf_cnpj: string;
    ie?: string;
    telefone?: string;
    endereco: {
      logradouro: string; numero: string; complemento?: string;
      bairro: string; municipio: string; uf: string; cep: string;
    };
  };
  itens: {
    produto_bling_id: string; // ID do produto cadastrado no Bling
    quantidade: number;
    valor_unitario: number;
  }[];
  valor_frete: number;
  natureza_operacao?: string;
};

async function blingToken(): Promise<string | null> {
  return process.env.BLING_API_TOKEN || null;
}

export async function emitirNfeBling(pedido: PedidoNfe): Promise<{
  ok: boolean;
  numero_nfe?: string;
  chave_acesso?: string;
  xml_url?: string;
  pdf_url?: string;
  bling_id?: string;
  error?: string;
}> {
  const token = await blingToken();
  if (!token) return { ok: false, error: "BLING_API_TOKEN não configurado." };

  try {
    const payload = {
      tipo: 1, // 1 = NF-e saída
      naturezaOperacao: pedido.natureza_operacao || "Venda de mercadoria",
      contato: {
        nome: pedido.cliente.nome,
        email: pedido.cliente.email,
        tipoPessoa: pedido.cliente.cpf_cnpj.replace(/\D/g,"").length === 11 ? "F" : "J",
        numeroDocumento: pedido.cliente.cpf_cnpj.replace(/\D/g,""),
        ie: pedido.cliente.ie || "",
        telefone: pedido.cliente.telefone || "",
        endereco: {
          endereco:    pedido.cliente.endereco.logradouro,
          numero:      pedido.cliente.endereco.numero,
          complemento: pedido.cliente.endereco.complemento || "",
          bairro:      pedido.cliente.endereco.bairro,
          municipio:   pedido.cliente.endereco.municipio,
          uf:          pedido.cliente.endereco.uf,
          cep:         pedido.cliente.endereco.cep.replace(/\D/g,""),
        },
      },
      itens: pedido.itens.map(i => ({
        produto: { id: parseInt(i.produto_bling_id) },
        quantidade: i.quantidade,
        valor: i.valor_unitario,
      })),
      transporte: {
        fretePorConta: 3, // 3 = sem frete
        frete: pedido.valor_frete,
      },
    };

    const res = await fetch(`${BLING_BASE}/nfe`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, error: data?.error?.message || JSON.stringify(data) };
    }

    const nfe = data?.data;
    return {
      ok:           true,
      bling_id:     String(nfe?.id || ""),
      numero_nfe:   String(nfe?.numero || ""),
      chave_acesso: nfe?.chaveAcesso || "",
    };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function cancelarNfeBling(blingId: string): Promise<{ ok: boolean; error?: string }> {
  const token = await blingToken();
  if (!token) return { ok: false, error: "BLING_API_TOKEN não configurado." };

  try {
    const res = await fetch(`${BLING_BASE}/nfe/${blingId}/cancelar`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" },
    });
    if (!res.ok) {
      const d = await res.json();
      return { ok: false, error: d?.error?.message || "Erro ao cancelar." };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
