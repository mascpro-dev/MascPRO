import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  assertDistribuidorEquipeAccess,
  getVendedoresDoDistribuidor,
} from "@/lib/crmVendedorServer";
import { criarVendedor } from "@/lib/criarVendedor";

export const dynamic = "force-dynamic";

function resolveDistribuidorId(role: string, userId: string, bodyId?: string) {
  if (role === "ADMIN" && bodyId) return bodyId;
  return userId;
}

export async function GET(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertDistribuidorEquipeAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  const distId =
    access.role === "ADMIN"
      ? req.nextUrl.searchParams.get("distribuidor_id") || userId
      : userId;

  const vendedores = await getVendedoresDoDistribuidor(supabase, distId);
  return NextResponse.json({ ok: true, vendedores, distribuidor_id: distId });
}

export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) {
    return NextResponse.json({ ok: false, error: authErr }, { status });
  }

  const access = await assertDistribuidorEquipeAccess(supabase, userId);
  if (!access.ok) {
    return NextResponse.json({ ok: false, error: access.error }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, error: "Cadastro indisponível (service role)." },
      { status: 500 }
    );
  }

  const body = await req.json().catch(() => null);
  const distId = resolveDistribuidorId(access.role, userId, body?.distribuidor_id);

  if (access.role === "DISTRIBUIDOR" && distId !== userId) {
    return NextResponse.json({ ok: false, error: "Sem permissão." }, { status: 403 });
  }

  const resultado = await criarVendedor(supabase, {
    distribuidorId: distId,
    nome: body?.nome,
    email: body?.email,
    whatsapp: body?.whatsapp,
  });

  if (!resultado.ok) {
    return NextResponse.json({ ok: false, error: resultado.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    vendedor: {
      id: resultado.profile_id,
      email: resultado.email,
      senha_temporaria: resultado.senha_temporaria,
    },
  });
}
