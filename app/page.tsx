/* app/page.tsx  – Home / Splash simples */
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { redirect } from 'next/navigation'

export default async function Home() {
  /* 1. Verifica se já existe sessão */
  const supabase = createServerComponentClient({ cookies })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  /* 2. Se estiver logado → vai direto pro dashboard (ranking) */
  if (session) {
    redirect('/ranking')
  }

  /* 3. Caso contrário, mostra a splash com o botão “Continuar” */
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-8 p-6 text-center">
      <h1 className="text-2xl font-bold">Bem-vindo(a) à MASC PRO</h1>

      <p className="text-gray-600 max-w-md">
        Construa resultados previsíveis, acompanhe seu progresso e faça parte da
        comunidade.
      </p>

      {/* Botão simples que leva à seleção de perfil */}
      <a
        href="/role-select"
        className="inline-block bg-brand text-white rounded-xl px-8 py-4"
      >
        Continuar
      </a>
    </main>
  )
}
