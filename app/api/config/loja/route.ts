import { NextResponse } from "next/server";
import { getConfigNum } from "@/lib/systemConfig";

/** Valores públicos da loja (sem dados sensíveis). */
export async function GET() {
  const freteGratisAcima = await getConfigNum("frete_gratis_acima");
  return NextResponse.json({
    ok: true,
    freteGratisAcima: freteGratisAcima > 0 ? freteGratisAcima : 0,
  });
}
