-- =============================================================================
-- Comunidade: admin pode apagar posts e comentários (RLS)
-- Rode no SQL Editor do Supabase se a API retornar permission denied.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
GRANT ALL ON public.comments TO service_role;
GRANT ALL ON public.likes TO service_role;

-- Posts: admin apaga qualquer post
DROP POLICY IF EXISTS community_posts_admin_delete ON public.community_posts;
CREATE POLICY community_posts_admin_delete ON public.community_posts
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND UPPER(TRIM(COALESCE(p.role::text, ''))) = 'ADMIN'
    )
  );

-- Comentários: admin apaga qualquer comentário
DROP POLICY IF EXISTS comments_admin_delete ON public.comments;
CREATE POLICY comments_admin_delete ON public.comments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND UPPER(TRIM(COALESCE(p.role::text, ''))) = 'ADMIN'
    )
  );

-- Storage community-media: uploads em posts/{user_id}/...
-- Se upload falhar no celular, confira políticas do bucket no painel Storage.
