import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lerEnderecoProfile, montarEnderecoTexto } from "@/lib/profileEndereco";
import {
  consultaGeocode,
  estaAberto,
  geocodificar,
  resolverPin,
  type PinTipo,
  type SalaoPublico,
} from "@/lib/mapaSaloes";
export const dynamic = "force-dynamic";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function colunaAusente(err: { code?: string; message?: string } | null | undefined) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  return err.code === "42703" || err.code === "PGRST204" || (msg.includes("column") && msg.includes("mapa_"));
}

const SELECT_MAPA = [
  "id",
  "full_name",
  "barber_shop",
  "avatar_url",
  "instagram",
  "whatsapp",
  "city",
  "state",
  "role",
  "work_type",
  "bio",
  "studio_address",
  "booking_slug",
  "mapa_lat",
  "mapa_lng",
  "mapa_pin",
  "cep",
  "address",
  "number",
  "neighborhood",
  "logradouro",
  "numero",
  "bairro",
  "municipio",
  "uf",
].join(", ");

export async function GET(req: NextRequest) {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ ok: false, error: "Mapa indisponível no momento." }, { status: 503 });
    }
    const db = sb();
    const q = String(req.nextUrl.searchParams.get("q") || "").trim();
    const latQ = Number(req.nextUrl.searchParams.get("lat"));
    const lngQ = Number(req.nextUrl.searchParams.get("lng"));

    const { data, error } = await db
      .from("profiles")
      .select(SELECT_MAPA)
      .or("mapa_visivel.eq.true,role.ilike.*admin*");

    if (error) {
      if (colunaAusente(error)) {
        return NextResponse.json({
          ok: true,
          saloes: [],
          centro: null,
          precisaSql: true,
        });
      }
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const rows = (data || []) as unknown as Record<string, unknown>[];
    const ids = rows.map((r) => String(r.id));

    const abertoPorId = new Map<string, boolean>();
    const comAgenda = new Set<string>();
    const servicosPorId = new Map<string, string[]>();

    if (ids.length) {
      const [av, sv] = await Promise.all([
        db
          .from("availability")
          .select("professional_id, day_of_week, start_time, end_time, active")
          .in("professional_id", ids)
          .eq("active", true),
        db
          .from("pro_services")
          .select("professional_id, name")
          .in("professional_id", ids)
          .eq("active", true),
      ]);

      if (!av.error) {
        const grupos = new Map<string, { day_of_week: number; start_time: string; end_time: string; active: boolean }[]>();
        for (const row of av.data || []) {
          const id = String(row.professional_id);
          const lista = grupos.get(id) || [];
          lista.push({
            day_of_week: Number(row.day_of_week),
            start_time: String(row.start_time || ""),
            end_time: String(row.end_time || ""),
            active: row.active !== false,
          });
          grupos.set(id, lista);
        }
        for (const [id, dias] of grupos) {
          abertoPorId.set(id, estaAberto(dias));
          if (dias.length) comAgenda.add(id);
        }
      }

      if (!sv.error) {
        for (const row of sv.data || []) {
          const id = String(row.professional_id);
          const nome = String(row.name || "").trim();
          if (!nome) continue;
          const lista = servicosPorId.get(id) || [];
          if (lista.length < 8 && !lista.some((n) => n.toLowerCase() === nome.toLowerCase())) {
            lista.push(nome);
          }
          servicosPorId.set(id, lista);
        }
      }
    }

    const saloes: SalaoPublico[] = [];
    for (const row of rows) {
      const endereco = lerEnderecoProfile(row);
      const cidade = endereco.municipio || String(row.city || "").trim();
      const uf = endereco.uf || String(row.state || "").trim();
      const studio = String(row.studio_address || "").trim();
      const textoEndereco =
        studio ||
        montarEnderecoTexto({ ...row, ...endereco }) ||
        [cidade, uf].filter(Boolean).join(" / ");
      const ehAdmin = String(row.role || "").toUpperCase().includes("ADMIN");
      let lat = Number(row.mapa_lat);
      let lng = Number(row.mapa_lng);
      const consulta = consultaGeocode({
        studio_address: studio,
        city: cidade,
        state: uf,
        municipio: cidade,
        uf,
        logradouro: String(row.logradouro || row.address || ""),
        numero: String(row.numero || row.number || ""),
        bairro: String(row.bairro || row.neighborhood || ""),
      });
      if (studio || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        const ponto =
          (await geocodificar(consulta)) ||
          (cidade ? await geocodificar([cidade, uf, "Brasil"].filter(Boolean).join(", ")) : null);
        if (ponto) {
          const longe =
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            Math.abs(lat - ponto.lat) > 0.0008 ||
            Math.abs(lng - ponto.lng) > 0.0008;
          lat = ponto.lat;
          lng = ponto.lng;
          if (longe || (ehAdmin && row.mapa_visivel !== true)) {
            await db
              .from("profiles")
              .update({
                mapa_lat: lat,
                mapa_lng: lng,
                ...(ehAdmin ? { mapa_visivel: true } : {}),
              })
              .eq("id", row.id);
          }
        }
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const slug = String(row.booking_slug || "").trim();
      const id = String(row.id);
      const nomeSalao = String(row.barber_shop || "").trim();
      const nome = String(row.full_name || "").trim() || nomeSalao;
      if (!nome && !nomeSalao) continue;
      saloes.push({
        id,
        nome,
        salao: nomeSalao || nome,
        avatar: String(row.avatar_url || "").trim() || null,
        instagram: String(row.instagram || "").trim() || null,
        whatsapp: String(row.whatsapp || "").trim() || null,
        cidade,
        uf,
        endereco: textoEndereco,
        lat,
        lng,
        pin: resolverPin({
          mapa_pin: row.mapa_pin as string | null,
          role: row.role as string | null,
          booking_slug: slug,
        }) as PinTipo,
        agenda: slug || comAgenda.has(id) ? `/agendar/${slug || id}` : null,
        aberto: abertoPorId.get(id) === true,
        servicos: servicosPorId.get(id) || [],
        workType: String(row.work_type || "").trim() || null,
        bio: String(row.bio || "").trim().slice(0, 220) || null,
      });
    }

    let centro: { lat: number; lng: number; rotulo: string } | null = null;
    if (Number.isFinite(latQ) && Number.isFinite(lngQ)) {
      const rotulo = String(req.nextUrl.searchParams.get("rotulo") || "").trim();
      centro = { lat: latQ, lng: lngQ, rotulo: rotulo || "Sua localização" };
    } else if (q) {
      const ponto = await geocodificar(`${q}, Brasil`);
      if (ponto) centro = { ...ponto, rotulo: q };
    }

    return NextResponse.json({ ok: true, saloes, centro, precisaSql: false });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Falha ao carregar o mapa.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
