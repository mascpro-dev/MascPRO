"use client";
import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Loader2 } from "lucide-react";
import EmbaixadoraCrmNav from "@/componentes/EmbaixadoraCrmNav";

export default function EmbaixadoraCrmLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?next=/embaixador/crm/dashboard");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      const role = String(profile?.role || "").toUpperCase();
      if (role !== "EMBAIXADOR") {
        router.replace("/home");
        return;
      }
      setOk(true);
    }
    void check();
  }, [supabase, router]);

  if (!ok) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-purple-400" size={28} />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh]">
      <EmbaixadoraCrmNav />
      {children}
    </div>
  );
}
