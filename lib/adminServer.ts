import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function getAdminServiceClient(): Promise<{
  supabase: SupabaseClient | null;
  error: string | null;
  status: number;
}> {
  const supabaseAuth = createRouteHandlerClient({ cookies });
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  if (!session?.user) {
    return { supabase: null, error: "Não autenticado.", status: 401 };
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Se service role key disponível: usa client privilegiado (ignora RLS)
  if (serviceKey) {
    return {
      supabase: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey),
      error: null,
      status: 200,
    };
  }

  // Fallback: usa o JWT do usuário logado (requer GRANTs corretos nas tabelas)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${session.access_token}` } } }
  );

  return { supabase, error: null, status: 200 };
}
