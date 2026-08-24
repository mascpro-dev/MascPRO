-- =============================================================================
-- Comunidade: bucket de fotos/vídeos
-- Rode no SQL Editor do Supabase se o post com mídia falhar.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('community-media', 'community-media', true, 83886080)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = COALESCE(storage.buckets.file_size_limit, 83886080);

DROP POLICY IF EXISTS "community-media public read" ON storage.objects;
CREATE POLICY "community-media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-media');

DROP POLICY IF EXISTS "community-media authenticated insert" ON storage.objects;
CREATE POLICY "community-media authenticated insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[1] IN ('posts', 'profile-avatars')
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "community-media owner delete" ON storage.objects;
CREATE POLICY "community-media owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'community-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
