import { NextRequest, NextResponse } from "next/server";

/** Proxy ViaCEP — o CSP do app bloqueia fetch direto a viacep.com.br no browser. */
export async function GET(
  _req: NextRequest,
  { params }: { params: { cep: string } }
) {
  const cep = String(params.cep || "").replace(/\D/g, "");
  if (cep.length !== 8) {
    return NextResponse.json({ ok: false, error: "CEP inválido." }, { status: 400 });
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: "ViaCEP indisponível." }, { status: 502 });
    }
    const data = await res.json();
    if (data.erro) {
      return NextResponse.json({ ok: false, error: "CEP não encontrado." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      cep: data.cep,
      logradouro: data.logradouro || "",
      bairro: data.bairro || "",
      localidade: data.localidade || "",
      uf: data.uf || "",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Falha ao consultar CEP." }, { status: 502 });
  }
}
