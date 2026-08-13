import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  CATALOGO_WHATSAPP_PADRAO,
  normalizarWhatsAppBr,
  type VendedorCatalogo,
} from "@/lib/catalogoVendedor";

export const dynamic = "force-dynamic";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/** Resolve distribuidor para catálogo público (só id, nome e WhatsApp). */
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  if (!ref) {
    return NextResponse.json({
      ok: true,
      vendedor: null,
      whatsapp_padrao: CATALOGO_WHATSAPP_PADRAO,
    });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Serviço indisponível." },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, whatsapp, role")
    .eq("id", ref)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const role = String(data?.role || "").trim().toUpperCase();
  if (!data || role !== "DISTRIBUIDOR") {
    return NextResponse.json({
      ok: true,
      vendedor: null,
      whatsapp_padrao: CATALOGO_WHATSAPP_PADRAO,
    });
  }

  const whatsapp = normalizarWhatsAppBr(data.whatsapp);
  if (!whatsapp) {
    return NextResponse.json({
      ok: true,
      vendedor: null,
      whatsapp_padrao: CATALOGO_WHATSAPP_PADRAO,
      aviso: "Distribuidor sem WhatsApp cadastrado.",
    });
  }

  const vendedor: VendedorCatalogo = {
    id: data.id,
    full_name: String(data.full_name || "Distribuidor MascPRO"),
    whatsapp,
  };

  return NextResponse.json(
    { ok: true, vendedor, whatsapp_padrao: CATALOGO_WHATSAPP_PADRAO },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
