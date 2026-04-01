import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

const NIVEIS = [
  { nome: "INICIANTE",           min: 0      },
  { nome: "PROFISSIONAL BRONZE", min: 10001  },
  { nome: "PROFISSIONAL PRATA",  min: 50001  },
  { nome: "PROFISSIONAL GOLD",   min: 150001 },
  { nome: "PROFISSIONAL BLACK",  min: 500001 },
];

function calcularNivel(score: number) {
  for (let i = NIVEIS.length - 1; i >= 0; i--) {
    if (score >= NIVEIS[i].min) return NIVEIS[i].nome;
  }
  return "INICIANTE";
}

export async function GET() {
  try {
    const supabase = sb();
    const limite = new Date();
    limite.setDate(limite.getDate() - 30); // últimos 30 dias

    const [
      { data: novos },
      { data: pedidos },
      { data: progresso },
    ] = await Promise.all([
      // Novos membros (últimos 30 dias)
      supabase.from("profiles")
        .select("id, full_name, city, state, created_at, role, moedas_pro_acumuladas, personal_coins")
        .gte("created_at", limite.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),

      // Compras confirmadas (últimos 30 dias)
      supabase.from("orders")
        .select("id, total, created_at, profiles(full_name, city, state)")
        .in("status", ["paid", "separacao", "despachado", "entregue"])
        .gte("created_at", limite.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),

      // Aulas concluídas (últimos 30 dias)
      supabase.from("user_progress")
        .select("id, created_at, profiles(full_name), lessons(title)")
        .gte("created_at", limite.toISOString())
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Monta eventos unificados
    const eventos: any[] = [];

    (novos || []).forEach(p => {
      const score = (p.moedas_pro_acumuladas || 0) + (p.personal_coins || 0);
      const nivel = calcularNivel(score);
      eventos.push({
        id: `novo-${p.id}`,
        tipo: "novo_membro",
        emoji: "🎉",
        titulo: `${p.full_name} entrou na plataforma`,
        subtitulo: [p.city, p.state].filter(Boolean).join(", ") || `Nível ${nivel}`,
        created_at: p.created_at,
      });
    });

    (pedidos || []).forEach((p: any) => {
      eventos.push({
        id: `pedido-${p.id}`,
        tipo: "compra",
        emoji: "🛍️",
        titulo: `${p.profiles?.full_name || "Membro"} fez uma compra`,
        subtitulo: `R$ ${Number(p.total).toFixed(2)}`,
        created_at: p.created_at,
      });
    });

    (progresso || []).forEach((p: any) => {
      if (!p.profiles?.full_name) return;
      eventos.push({
        id: `aula-${p.id}`,
        tipo: "aula",
        emoji: "🎓",
        titulo: `${p.profiles.full_name} concluiu uma aula`,
        subtitulo: p.lessons?.title || "Conteúdo PRO",
        created_at: p.created_at,
      });
    });

    // Ordena por data
    eventos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ ok: true, eventos: eventos.slice(0, 40) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
