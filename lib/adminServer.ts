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
  if (!serviceKey) {
    return {
      supabase: null,
      error: "SUPABASE_SERVICE_ROLE_KEY não configurada.",
      status: 500,
    };
  }

  return {
    supabase: createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey),
    error: null,
    status: 200,
  };
}
