import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * Hook que devolve { profile, loading }
 * profile = linha da tabela 'profiles'
 */
export function useUserWithProfile() {
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_evt, session) => {
        if (!session?.user) { setProfile(null); setLoading(false); return; }
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        setProfile(data); setLoading(false);
      }
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  return { profile, loading };
}
