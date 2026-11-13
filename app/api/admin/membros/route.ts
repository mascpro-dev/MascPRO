import { NextRequest, NextResponse } from "next/server";
import { getAdminContext } from "@/lib/adminServer";
import {
  contextoMembros,
  membroNoEscopoDistribuidor,
} from "@/lib/adminMembrosAcesso";
import { criarCadastroMembro, roleCadastroValido } from "@/lib/criarCadastroMembro";
import { lerCidadeEstado } from "@/lib/profileLocalizacao";
import { enriquecerPerfilComEndereco, PROFILE_ENDERECO_SELECT } from "@/lib/profileEndereco";
import {
  contarIndicadosDiretos,
  enriquecerProRedeMembro,
  sincronizarNetworkCoinsLote,
} from "@/lib/syncProRedeMembro";
import { compraDentroDoPrazo, ultimasComprasPorPerfil } from "@/lib/mapaCompra";
import { normalizarUf } from "@/lib/forcaAcesso";

export const dynamic = "force-dynamic";

const SELECT_MEMBROS = `id, full_name, email, whatsapp, instagram, role, nivel, created_at, indicado_por, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total, avatar_url, cpf_cnpj, ${PROFILE_ENDERECO_SELECT}`;
const SELECT_MEMBROS_SEM_CPF = `id, full_name, email, whatsapp, instagram, role, nivel, created_at, indicado_por, personal_coins, network_coins, total_compras_proprias, total_compras_rede, pro_total, avatar_url, ${PROFILE_ENDERECO_SELECT}`;

export async function GET() {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) return NextResponse.json({ ok: false, error }, { status });

    const ctx = await contextoMembros(supabase, userId);
    if (!ctx.ok) return NextResponse.json({ ok: false, error: ctx.error }, { status: 403 });

    let query = supabase
      .from("profiles")
      .select(SELECT_MEMBROS)
      .neq("role", "EXCLUIDO")
      .order("pro_total", { ascending: false });

    let profiles: any[] | null = null;
    let { data: primeira, error: errPerfis } = await query;
    profiles = (primeira as any[] | null) || null;
    if (errPerfis && /cpf_cnpj|schema cache|PGRST204/i.test(errPerfis.message)) {
      const retry = await supabase
        .from("profiles")
        .select(SELECT_MEMBROS_SEM_CPF)
        .neq("role", "EXCLUIDO")
        .order("pro_total", { ascending: false });
      profiles = (retry.data as any[] | null) || null;
      errPerfis = retry.error;
    }

    if (errPerfis || !profiles) {
      return NextResponse.json({ ok: false, error: errPerfis?.message || "Erro ao buscar perfis" }, { status: 500 });
    }

    const lista =
      ctx.role === "ADMIN"
        ? profiles
        : profiles.filter((m: { id: string; role?: string | null; indicado_por?: string | null; uf?: string | null; state?: string | null }) =>
            membroNoEscopoDistribuidor(m, { userId, uf: ctx.uf, redeIds: ctx.redeIds })
          );

    const indicadosCount = contarIndicadosDiretos(ctx.role === "ADMIN" ? profiles : lista);
    if (ctx.role === "ADMIN") {
      await sincronizarNetworkCoinsLote(supabase, profiles, indicadosCount);
    }

    const ultimasCompras = await ultimasComprasPorPerfil(supabase);
    const agora = new Date();
    const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).getTime();
    const compraNoMesAtual = (iso: string | null | undefined) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      if (!Number.isFinite(t)) return false;
      return t >= inicioMes;
    };

    const mapaPorId = new Map<string, boolean>();
    const { data: mapas, error: errMapa } = await supabase.from("profiles").select("id, mapa_visivel");
    const mapaColuna = !errMapa;
    if (mapaColuna) {
      for (const row of mapas || []) mapaPorId.set(String(row.id), row.mapa_visivel === true);
    }

    const perfilMap = new Map(lista.map((p: any) => [p.id, p]));

    const membros = lista.map((m: any) => {
      const loc = lerCidadeEstado(m);
      const end = enriquecerPerfilComEndereco(m);
      const qtd = indicadosCount.get(m.id) || 0;
      const proRede = enriquecerProRedeMembro(m, qtd);
      return {
        ...end,
        city: loc.city || end.city || m.city,
        state: loc.state || end.state || m.state,
        tem_compra: compraNoMesAtual(ultimasCompras.get(m.id)),
        ultima_compra: ultimasCompras.get(m.id) || null,
        compra_30d: compraDentroDoPrazo(ultimasCompras.get(m.id)),
        mapa_visivel: mapaPorId.get(m.id) === true,
        mapa_coluna: mapaColuna,
        qtd_indicados: qtd,
        pro_indicacao: proRede.pro_indicacao,
        pro_compras_rede: proRede.pro_compras_rede,
        pro_rede_total: proRede.pro_rede_total,
        indicador: m.indicado_por
          ? perfilMap.get(m.indicado_por)
            ? { full_name: perfilMap.get(m.indicado_por).full_name }
            : null
          : null,
      };
    });

    return NextResponse.json({
      ok: true,
      viewer_role: ctx.role,
      uf: ctx.uf || null,
      aviso:
        ctx.role === "DISTRIBUIDOR" && !ctx.uf
          ? "Cadastre a UF do distribuidor no perfil para ver todos os salões da região."
          : null,
      membros,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, error, status } = await getAdminContext();
    if (!supabase || !userId) return NextResponse.json({ ok: false, error }, { status });

    const ctx = await contextoMembros(supabase, userId);
    if (!ctx.ok) return NextResponse.json({ ok: false, error: ctx.error }, { status: 403 });

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { ok: false, error: "Cadastro indisponível (service role)." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "Body inválido." }, { status: 400 });

    const role = roleCadastroValido(body.role, ctx.role);
    if (!role) {
      return NextResponse.json({ ok: false, error: "Papel de cadastro não permitido." }, { status: 400 });
    }
    if (ctx.role !== "ADMIN" && role === "VENDEDOR") {
      return NextResponse.json(
        { ok: false, error: "Cadastre vendedores em CRM → Equipe / Vendedores." },
        { status: 400 }
      );
    }

    let estado = String(body.state || body.uf || "").trim();
    if (ctx.role === "DISTRIBUIDOR") {
      if (ctx.uf) {
        const ufBody = normalizarUf(estado);
        if (ufBody && ufBody !== ctx.uf) {
          return NextResponse.json(
            { ok: false, error: "O cadastro precisa estar na UF da sua região." },
            { status: 403 }
          );
        }
        estado = ctx.uf;
      }
    }

    let indicadoPor = body.indicado_por || null;
    if (ctx.role === "DISTRIBUIDOR") {
      indicadoPor = userId;
    }

    const resultado = await criarCadastroMembro(supabase, {
      nome: body.full_name || body.nome,
      email: body.email,
      whatsapp: body.whatsapp,
      instagram: body.instagram,
      cpfCnpj: body.cpf_cnpj,
      role,
      indicadoPor,
      createdBy: userId,
      cep: body.cep,
      address: body.address,
      number: body.number,
      complement: body.complement,
      neighborhood: body.neighborhood,
      city: body.city,
      state: estado,
      criarLead: true,
    });

    if (!resultado.ok) {
      return NextResponse.json({ ok: false, error: resultado.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      profile_id: resultado.profile_id,
      email: resultado.email,
      senha_temporaria: resultado.senha_temporaria,
      lead_id: resultado.lead_id,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
