import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, assertAdmin } from "@/lib/adminServer";
import { emitirNfe, type DadosCliente } from "@/lib/blingNfe";
import { registrarAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

// POST /api/admin/nfe/emitir
// Body: { order_id, cpf_cnpj?, observacao? }
export async function POST(req: NextRequest) {
  const { supabase, userId, error: authErr, status } = await getAdminContext();
  if (!supabase || !userId) return NextResponse.json({ ok: false, error: authErr }, { status });

  const check = await assertAdmin(supabase, userId);
  if (!check.ok) return NextResponse.json({ ok: false, error: check.error }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.order_id) {
    return NextResponse.json({ ok: false, error: "order_id obrigatório." }, { status: 400 });
  }

  if (!process.env.BLING_API_TOKEN) {
    return NextResponse.json({ ok: false, error: "BLING_API_TOKEN não configurado. Adicione ao .env e reinicie." }, { status: 503 });
  }

  // ── Verifica se já existe NF-e para este pedido ──────────
  const { data: nfeExistente } = await supabase
    .from("notas_fiscais")
    .select("id, numero_nfe, status")
    .eq("order_id", body.order_id)
    .in("status", ["emitida", "pendente"])
    .maybeSingle();

  if (nfeExistente) {
    return NextResponse.json({
      ok: false,
      error: `Já existe uma NF-e ${nfeExistente.status === "emitida" ? `emitida (Nº ${nfeExistente.numero_nfe})` : "pendente"} para este pedido.`,
    }, { status: 409 });
  }

  // ── Busca dados do pedido ────────────────────────────────
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select(`
      id, total, shipping_cost, status,
      profile_id,
      profiles!orders_profile_id_fkey(
        id, full_name, email, whatsapp,
        cpf_cnpj, cep, logradouro, numero, complemento,
        bairro, municipio, uf
      ),
      order_items(
        quantidade, preco_unitario,
        products!order_items_product_id_fkey(
          id, title, bling_produto_id
        )
      )
    `)
    .eq("id", body.order_id)
    .maybeSingle();

  if (orderErr || !order) {
    return NextResponse.json({ ok: false, error: "Pedido não encontrado." }, { status: 404 });
  }

  // Valida status — só emite para pedidos pagos
  const STATUS_PAGOS = ["paid", "separacao", "despachado", "entregue"];
  if (!STATUS_PAGOS.includes(order.status)) {
    return NextResponse.json({
      ok: false,
      error: `Pedido com status "${order.status}" — só é possível emitir NF-e para pedidos pagos.`,
    }, { status: 400 });
  }

  const perfil: any = order.profiles;

  // CPF pode vir do body (informado no modal) ou já estar no perfil
  const cpfCnpj = (body.cpf_cnpj || perfil?.cpf_cnpj || "").replace(/\D/g, "");
  if (!cpfCnpj || (cpfCnpj.length !== 11 && cpfCnpj.length !== 14)) {
    return NextResponse.json({
      ok: false,
      error: "CPF (11 dígitos) ou CNPJ (14 dígitos) obrigatório para emitir NF-e.",
    }, { status: 400 });
  }

  // Valida endereço
  const enderecoOk = perfil?.logradouro && perfil?.municipio && perfil?.uf && perfil?.cep;
  if (!enderecoOk && !body.endereco) {
    return NextResponse.json({
      ok: false,
      error: "Endereço completo do cliente obrigatório (logradouro, município, UF, CEP).",
    }, { status: 400 });
  }

  const endereco = body.endereco || perfil;
  const cliente: DadosCliente = {
    nome:        perfil?.full_name || "Consumidor Final",
    email:       perfil?.email || "",
    cpf_cnpj:    cpfCnpj,
    telefone:    perfil?.whatsapp || "",
    cep:         endereco?.cep || body.shipping_cep || "",
    logradouro:  endereco?.logradouro || "",
    numero:      endereco?.numero || "S/N",
    complemento: endereco?.complemento || "",
    bairro:      endereco?.bairro || "",
    municipio:   endereco?.municipio || "",
    uf:          endereco?.uf || "",
  };

  // Valida itens — todos precisam ter bling_produto_id
  const itens: any[] = [];
  const semBlingId: string[] = [];

  for (const item of (order.order_items as any[])) {
    const prod = item.products;
    if (!prod?.bling_produto_id) {
      semBlingId.push(prod?.title || "produto desconhecido");
      continue;
    }
    itens.push({
      bling_produto_id: prod.bling_produto_id,
      titulo:           prod.title,
      quantidade:       Number(item.quantidade || 1),
      valor_unitario:   Number(item.preco_unitario || 0),
    });
  }

  if (semBlingId.length > 0) {
    return NextResponse.json({
      ok: false,
      error: `Os seguintes produtos não têm o ID do Bling configurado: ${semBlingId.join(", ")}. Configure em Admin → Produtos.`,
    }, { status: 400 });
  }

  if (itens.length === 0) {
    return NextResponse.json({ ok: false, error: "Nenhum item válido para emitir." }, { status: 400 });
  }

  // ── Registra NF-e com status "pendente" ─────────────────
  const { data: nfeRec, error: nfeInsErr } = await supabase
    .from("notas_fiscais")
    .insert({
      order_id:    body.order_id,
      status:      "pendente",
      emitido_por: userId,
    })
    .select()
    .single();

  if (nfeInsErr) {
    return NextResponse.json({ ok: false, error: nfeInsErr.message }, { status: 500 });
  }

  // ── Emite pelo Bling ────────────────────────────────────
  const resultado = await emitirNfe({
    order_id:   body.order_id,
    cliente,
    itens,
    valor_frete: Number(order.shipping_cost || 0),
    observacao:  body.observacao || "",
  });

  // ── Atualiza o registro da NF-e com o resultado ─────────
  if (resultado.ok) {
    await supabase.from("notas_fiscais").update({
      status:       "emitida",
      bling_id:     resultado.bling_id,
      numero_nfe:   resultado.numero_nfe,
      serie:        resultado.serie,
      chave_acesso: resultado.chave_acesso,
    }).eq("id", nfeRec.id);

    // Salva CPF no perfil para próximas emissões
    if (body.cpf_cnpj && perfil?.id && !perfil?.cpf_cnpj) {
      await supabase.from("profiles")
        .update({ cpf_cnpj: cpfCnpj })
        .eq("id", perfil.id);
    }

    await registrarAudit(supabase, {
      usuarioId: userId, acao: "EMIT_NFE",
      entidade: "notas_fiscais", entidadeId: nfeRec.id,
      dadosApos: { order_id: body.order_id, numero_nfe: resultado.numero_nfe },
    });

    return NextResponse.json({
      ok: true,
      numero_nfe:   resultado.numero_nfe,
      chave_acesso: resultado.chave_acesso,
      bling_id:     resultado.bling_id,
    });
  } else {
    // Registra erro
    await supabase.from("notas_fiscais").update({
      status:    "erro",
      error_msg: resultado.error,
    }).eq("id", nfeRec.id);

    return NextResponse.json({ ok: false, error: resultado.error }, { status: 422 });
  }
}
