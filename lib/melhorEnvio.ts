/**
 * Integração com Melhor Envio API v2
 * Documentação: https://docs.melhorenvio.com.br
 *
 * Para ativar:
 * 1. Crie conta em melhorenvio.com.br
 * 2. Gere token em: Minha Conta > Tokens de Acesso
 * 3. Adicione ao .env: MELHOR_ENVIO_TOKEN=seu_token
 * 4. Adicione ao .env: MELHOR_ENVIO_SANDBOX=true (para testes)
 */

const BASE_URL = process.env.MELHOR_ENVIO_SANDBOX === "true"
  ? "https://sandbox.melhorenvio.com.br/api/v2"
  : "https://melhorenvio.com.br/api/v2";

const TOKEN = process.env.MELHOR_ENVIO_TOKEN;

export type FreteOption = {
  id: number;
  name: string;
  company: { id: number; name: string; picture: string };
  price: number;
  custom_price: number;
  discount: number;
  currency: string;
  delivery_time: number;
  delivery_range: { min: number; max: number };
  custom_delivery_time: number;
  packages: any[];
  additional_services: any;
  error?: string;
};

export type CotacaoFreteInput = {
  cepOrigem: string;
  cepDestino: string;
  produtos: { peso_gramas: number; quantidade: number }[];
};

export async function cotarFreteMelhorEnvio(input: CotacaoFreteInput): Promise<{
  ok: boolean;
  opcoes?: FreteOption[];
  error?: string;
}> {
  if (!TOKEN) {
    return { ok: false, error: "MELHOR_ENVIO_TOKEN não configurado." };
  }

  // Calcula peso total em kg
  const pesoKg = input.produtos.reduce(
    (s, p) => s + (p.peso_gramas / 1000) * p.quantidade,
    0
  );
  const pesoFinal = Math.max(pesoKg, 0.1);

  try {
    const res = await fetch(`${BASE_URL}/me/shipment/calculate`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
        "User-Agent":    "MascPRO/1.0 (suporte@mascpro.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: input.cepOrigem.replace(/\D/g, "") },
        to:   { postal_code: input.cepDestino.replace(/\D/g, "") },
        package: {
          height: 10,
          width:  15,
          length: 20,
          weight: pesoFinal,
        },
        options: { receipt: false, own_hand: false },
        services: "1,2,3,4,17", // PAC, SEDEX, Mini, .COM e Jadlog
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `Melhor Envio API error: ${err}` };
    }

    const data: FreteOption[] = await res.json();
    const validas = data.filter(o => !o.error && o.price > 0);
    return { ok: true, opcoes: validas };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}
