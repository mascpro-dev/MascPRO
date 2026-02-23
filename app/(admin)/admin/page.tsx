"use client";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminSidebar from "@/componentes/AdminSidebar";
import { Users, Activity, ShoppingCart, Zap, Moon } from "lucide-react"; // Ajuste os ícones se precisar

export default function AdminDashboard() {
  const supabase = createClientComponentClient();
  const [stats, setStats] = useState({ total: 0, ativos: 0, acessosHoje: 0, carrinhos: 0 });

  useEffect(() => {
    async function carregarNumerosReais() {
      // Pega a data de hoje para comparar
      const hoje = new Date().toISOString().split('T')[0];
      
      // 1. Busca TODOS os perfis do banco sem filtro (Agora que o banco está liberado, vem todo mundo)
      const { data: todos } = await supabase.from('profiles').select('id, last_access');
      
      // 2. Busca carrinhos abandonados na tabela de pedidos (ajuste o nome da tabela se for diferente)
      const { count: carrinhos } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'abandoned');

      if (todos) {
        setStats({
          total: todos.length, // AQUI VAI APARECER OS SEUS 13+ MEMBROS!
          ativos: todos.filter(u => u.last_access).length, // Quem já logou alguma vez
          acessosHoje: todos.filter(u => u.last_access?.startsWith(hoje)).length, // Acessos do dia
          carrinhos: carrinhos || 0
        });
      }
    }
    carregarNumerosReais();
  }, [supabase]);

  return (
    <div className="flex min-h-screen bg-black text-white">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-black italic uppercase mb-8">
          Painel <span className="text-[#C9A66B]">Admin</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARD 1: Total de Membros */}
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
            <Users className="text-[#C9A66B]" size={32} />
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase">Total da Rede</p>
              <p className="text-3xl font-black">{stats.total}</p>
            </div>
          </div>
          
          {/* CARD 2: Acessos Hoje */}
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
            <Activity className="text-green-500" size={32} />
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase">Acessos Hoje</p>
              <p className="text-3xl font-black">{stats.acessosHoje}</p>
            </div>
          </div>

          {/* CARD 3: Carrinhos Parados */}
          <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 flex items-center gap-4">
            <ShoppingCart className="text-red-500" size={32} />
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase">Carrinhos Parados</p>
              <p className="text-3xl font-black">{stats.carrinhos}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
