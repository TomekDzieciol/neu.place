-- ============================================================
-- Supabase Storage: bucket na zdjęcia ogłoszeń
-- Uruchom w Supabase Dashboard → SQL Editor (lub przez migracje)
-- ============================================================

-- Bucket publiczny (odczyt bez signed URL)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Upload: zalogowany użytkownik może wgrywać do ścieżki {user_id}/{listing_id}/...
CREATE POLICY "listing_photos_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Odczyt: publiczny (bucket jest public)
CREATE POLICY "listing_photos_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'listing-photos');

-- Usuwanie: tylko właściciel folderu (user_id w ścieżce)
CREATE POLICY "listing_photos_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
