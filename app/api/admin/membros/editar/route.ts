import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertAdmin, getAdminContext } from "@/lib/adminServer";
import { camposLocalizacaoSync } from "@/lib/profileLocalizacao";
import { camposEnderecoCompletoSync } from "@/lib/profileEndereco";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function erroUsuarioNaoEncontrado(msg: string | undefined) {
  const t = String(msg || "").toLowerCase();
  return t.includes("user not found") || t.includes("not found");
}

function erroFkPedidos(msg: string | undefined) {
  const t = String(msg || "").toLowerCase();
  return t.includes("orders_profile_id_fkey") || (t.includes("foreign key") && t.includes("orders"));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id, full_name, email, whatsapp, instagram, city, state,
      cep, address, number, complement, neighborhood,
      role, nivel, indicado_por, nova_senha,
    } = body;

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id obrigatório" }, { status: 400 });

    const erros: string[] = [];

    const camposProfile: Record<string, any> = {};
    if (full_name !== undefined) camposProfile.full_name = full_name;
    if (whatsapp !== undefined) camposProfile.whatsapp = whatsapp;
    if (instagram !== undefined) camposProfile.instagram = instagram;

    const temEndereco =
      cep !== undefined ||
      address !== undefined ||
      number !== undefined ||
      complement !== undefined ||
      neighborhood !== undefined ||
      city !== undefined ||
      state !== undefined;

    if (temEndereco) {
      Object.assign(
        camposProfile,
        camposEnderecoCompletoSync({
          cep,
          address,
          number,
          complement,
          neighborhood,
          city,
          state,
          logradouro: address,
          numero: number,
          complemento: complement,
          bairro: neighborhood,
          municipio: city,
          uf: state,
        })
      );
      if (city !== undefined || state !== undefined) {
        Object.assign(camposProfile, camposLocalizacaoSync(city, state));
      }
    }

    if (role !== undefined) camposProfile.role = role;
    if (nivel !== undefined) camposProfile.nivel = nivel;
    if (indicado_por !== undefined) camposProfile.indicado_por = indicado_por || null;

    if (String(role || "").toUpperCase() === "VENDEDOR") {
      let distId = indicado_por !== undefined ? indicado_por : undefined;
      if (distId === undefined) {
        const { data: atual } = await sb()
          .from("profiles")
          .select("indicado_por")
          .eq("id", user_id)
          .maybeSingle();
        distId = atual?.indicado_por;
      }
      if (!distId) {
        return NextResponse.json(
          { ok: false, error: "Vendedor exige distribuidor responsável (indicado_por)." },
          { status: 400 }
        );
      }
      const { data: dist } = await sb()
        .from("profiles")
        .select("role")
        .eq("id", distId)
        .maybeSingle();
      if (String(dist?.role || "").toUpperCase() !== "DISTRIBUIDOR") {
        return NextResponse.json(
          { ok: false, error: "indicado_por deve ser um perfil DISTRIBUIDOR." },
          { status: 400 }
        );
      }
    }

    camposProfile.updated_at = new Date().toISOString();

    if (Object.keys(camposProfile).length > 1) {
      const { error: errProfile } = await sb().from("profiles").update(camposProfile).eq("id", user_id);
      if (errProfile) erros.push(`Perfil: ${errProfile.message}`);
    }

    if (email) {
      const { error: errEmail } = await sb().auth.admin.updateUserById(user_id, { email });
      if (errEmail) erros.push(`Email: ${errEmail.message}`);
      else {
        const { error: errEmailProfile } = await sb().from("profiles").update({ email }).eq("id", user_id);
        if (errEmailProfile) erros.push(`Email no perfil: ${errEmailProfile.message}`);
      }
    }

    if (nova_senha) {
      if (nova_senha.length < 6) {
        erros.push("Senha deve ter pelo menos 6 caracteres.");
      } else {
        const { error: errSenha } = await sb().auth.admin.updateUserById(user_id, { password: nova_senha });
        if (errSenha) erros.push(`Senha: ${errSenha.message}`);
      }
    }

    if (erros.length > 0) {
      return NextResponse.json({ ok: false, error: erros.join(" | ") }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId, error: authErr, status } = await getAdminContext();
    if (!supabase || !userId) {
      return NextResponse.json({ ok: false, error: authErr || "Não autenticado." }, { status });
    }

    const admin = await assertAdmin(supabase, userId);
    if (!admin.ok) {
      return NextResponse.json({ ok: false, error: admin.error }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const alvoId = String(body?.user_id || "").trim();
    if (!alvoId) {
      return NextResponse.json({ ok: false, error: "user_id obrigatório" }, { status: 400 });
    }
    if (alvoId === userId) {
      return NextResponse.json({ ok: false, error: "Você não pode excluir o próprio usuário." }, { status: 400 });
    }

    const adminClient = sb();
    const { data: perfilAlvo, error: errPerfilAlvo } = await adminClient
      .from("profiles")
      .select("role, full_name")
      .eq("id", alvoId)
      .maybeSingle();

    if (errPerfilAlvo) {
      return NextResponse.json({ ok: false, error: errPerfilAlvo.message }, { status: 500 });
    }
    if (!perfilAlvo) {
      return NextResponse.json({ ok: false, error: "Membro não encontrado." }, { status: 404 });
    }
    if (String(perfilAlvo.role || "").toUpperCase() === "ADMIN") {
      return NextResponse.json({ ok: false, error: "Não é permitido excluir outro ADMIN por esta tela." }, { status: 400 });
    }

    const { error: errAuthDelete } = await adminClient.auth.admin.deleteUser(alvoId);
    if (errAuthDelete && !erroUsuarioNaoEncontrado(errAuthDelete.message)) {
      return NextResponse.json({ ok: false, error: `Falha ao excluir usuário: ${errAuthDelete.message}` }, { status: 500 });
    }

    // Fallback: se o usuário já não existe no Auth, remove o perfil diretamente.
    const { error: errProfileDelete } = await adminClient.from("profiles").delete().eq("id", alvoId);
    if (errProfileDelete) {
      if (!erroFkPedidos(errProfileDelete.message)) {
        return NextResponse.json({ ok: false, error: `Falha ao excluir perfil: ${errProfileDelete.message}` }, { status: 500 });
      }

      // Perfil com pedidos vinculados não pode ser removido fisicamente.
      // Faz "inativação lógica": remove dos membros e preserva histórico.
      const anonEmail = `excluido+${alvoId.slice(0, 8)}@mascpro.local`;
      const { error: errSoft } = await adminClient
        .from("profiles")
        .update({
          full_name: `[EXCLUIDO] ${perfilAlvo.full_name || "Membro"}`,
          email: anonEmail,
          whatsapp: null,
          instagram: null,
          role: "EXCLUIDO",
          indicado_por: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", alvoId);

      if (errSoft) {
        return NextResponse.json({ ok: false, error: `Falha ao inativar perfil com pedidos: ${errSoft.message}` }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        msg: "Cadastro ocultado (perfil com pedidos históricos).",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erro interno." }, { status: 500 });
  }
}
