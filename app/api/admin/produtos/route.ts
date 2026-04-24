import { NextRequest, NextResponse } from "next/server";
import {
  getSessionUserId,
  createServiceRoleClient,
  assertAdmin,
} from "@/lib/adminServer";

const MSG_SERVICE_ROLE = `Salvar produtos exige a variável SUPABASE_SERVICE_ROLE_KEY no servidor (Vercel → Settings → Environment Variables, ou .env.local no dev). Coloque a chave "service_role" do Supabase (Settings → API). Sem ela, o PostgreSQL retorna "permission denied" na tabela products por causa do RLS.`;

export async function GET() {
  try {
    const s = await getSessionUserId();
    if (!s.ok) {
      return NextResponse.json({ ok: false, error: s.error }, { status: s.status });
    }
    const service = createServiceRoleClient();
    if (!service) {
      return NextResponse.json(
        { ok: false, error: MSG_SERVICE_ROLE },
        { status: 503 }
      );
    }
    const admin = await assertAdmin(service, s.userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const { data, error: qerr } = await service
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (qerr) return NextResponse.json({ ok: false, error: qerr.message }, { status: 500 });
    return NextResponse.json({ ok: true, products: data || [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSessionUserId();
    if (!s.ok) {
      return NextResponse.json({ ok: false, error: s.error }, { status: s.status });
    }
    const service = createServiceRoleClient();
    if (!service) {
      return NextResponse.json(
        { ok: false, error: MSG_SERVICE_ROLE },
        { status: 503 }
      );
    }
    const admin = await assertAdmin(service, s.userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, how_to_use, image_url, video_url, volume, peso_gramas,
      price_hairdresser, price_ambassador, price_distributor, stock, ativo } = body;
    if (!title) return NextResponse.json({ ok: false, error: "Título obrigatório" }, { status: 400 });
    const pg = Math.round(Number(peso_gramas));
    const { data, error: ierr } = await service
      .from("products")
      .insert({
        title, description, how_to_use, image_url, video_url, volume,
        price_hairdresser: Number(price_hairdresser) || 0,
        price_ambassador: Number(price_ambassador) || 0,
        price_distributor: Number(price_distributor) || 0,
        stock: Number(stock) || 0,
        ativo: ativo !== false,
        peso_gramas: Number.isFinite(pg) && pg > 0 ? pg : 500,
      })
      .select()
      .single();
    if (ierr) return NextResponse.json({ ok: false, error: ierr.message }, { status: 500 });
    return NextResponse.json({ ok: true, product: data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const s = await getSessionUserId();
    if (!s.ok) {
      return NextResponse.json({ ok: false, error: s.error }, { status: s.status });
    }
    const service = createServiceRoleClient();
    if (!service) {
      return NextResponse.json(
        { ok: false, error: MSG_SERVICE_ROLE },
        { status: 503 }
      );
    }
    const admin = await assertAdmin(service, s.userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const body = await req.json();
    const { id, ...campos } = body;
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    const patch = { ...campos } as Record<string, unknown>;
    ["price_hairdresser", "price_ambassador", "price_distributor", "stock"].forEach((k) => {
      if (patch[k] !== undefined) patch[k] = Number(patch[k]) || 0;
    });
    if (patch.peso_gramas !== undefined) {
      const pg = Math.round(Number(patch.peso_gramas));
      patch.peso_gramas = Number.isFinite(pg) && pg > 0 ? pg : 500;
    }
    const { error: uerr } = await service.from("products").update(patch).eq("id", id);
    if (uerr) return NextResponse.json({ ok: false, error: uerr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const s = await getSessionUserId();
    if (!s.ok) {
      return NextResponse.json({ ok: false, error: s.error }, { status: s.status });
    }
    const service = createServiceRoleClient();
    if (!service) {
      return NextResponse.json(
        { ok: false, error: MSG_SERVICE_ROLE },
        { status: 503 }
      );
    }
    const admin = await assertAdmin(service, s.userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ ok: false, error: "id obrigatório" }, { status: 400 });
    const { error: derr } = await service.from("products").delete().eq("id", id);
    if (derr) return NextResponse.json({ ok: false, error: derr.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
