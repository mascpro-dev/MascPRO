-- =============================================================================
-- Comunidade: post com foto/vídeo (mesmo sem texto)
-- Rode no SQL Editor do Supabase.
-- =============================================================================

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS media_url TEXT;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS media_type TEXT;

ALTER TABLE public.community_posts
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_media_type_check;

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_media_type_check
  CHECK (media_type IS NULL OR media_type IN ('image', 'video'));

ALTER TABLE public.community_posts
  DROP CONSTRAINT IF EXISTS community_posts_conteudo_check;

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_conteudo_check
  CHECK (
    NULLIF(BTRIM(COALESCE(content, '')), '') IS NOT NULL
    OR NULLIF(BTRIM(COALESCE(media_url, '')), '') IS NOT NULL
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_posts_select_all ON public.community_posts;
CREATE POLICY community_posts_select_all ON public.community_posts
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS community_posts_insert_own ON public.community_posts;
CREATE POLICY community_posts_insert_own ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_posts_update_own ON public.community_posts;
CREATE POLICY community_posts_update_own ON public.community_posts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS community_posts_delete_own ON public.community_posts;
CREATE POLICY community_posts_delete_own ON public.community_posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
