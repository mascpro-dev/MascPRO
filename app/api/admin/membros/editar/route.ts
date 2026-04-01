import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, full_name, email, whatsapp, instagram, city, state,
      role, nivel, indicado_por, nova_senha } = body;

    if (!user_id) return NextResponse.json({ ok: false, error: "user_id obrigatório" }, { status: 400 });

    const erros: string[] = [];

    // Atualiza profile
    const camposProfile: Record<string, any> = {};
    if (full_name !== undefined) camposProfile.full_name = full_name;
    if (whatsapp !== undefined) camposProfile.whatsapp = whatsapp;
    if (instagram !== undefined) camposProfile.instagram = instagram;
    if (city !== undefined) camposProfile.city = city;
    if (state !== undefined) camposProfile.state = state;
    if (role !== undefined) camposProfile.role = role;
    if (nivel !== undefined) camposProfile.nivel = nivel;
    if (indicado_por !== undefined) camposProfile.indicado_por = indicado_por || null;
    camposProfile.updated_at = new Date().toISOString();

    if (Object.keys(camposProfile).length > 1) {
      const { error: errProfile } = await sb().from("profiles").update(camposProfile).eq("id", user_id);
      if (errProfile) erros.push(`Perfil: ${errProfile.message}`);
    }

    // Atualiza email no auth se fornecido
    if (email) {
      const { error: errEmail } = await sb().auth.admin.updateUserById(user_id, { email });
      if (errEmail) erros.push(`Email: ${errEmail.message}`);
      else {
        const { error: errEmailProfile } = await sb().from("profiles").update({ email }).eq("id", user_id);
        if (errEmailProfile) erros.push(`Email no perfil: ${errEmailProfile.message}`);
      }
    }

    // Atualiza senha se fornecida
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
