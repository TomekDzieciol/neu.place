-- Tagi AI dla zdjęć ogłoszeń (OpenAI Vision) – do wyszukiwania i opisu
ALTER TABLE public.listing_photos
  ADD COLUMN IF NOT EXISTS ai_tags TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_caption TEXT DEFAULT NULL;

COMMENT ON COLUMN public.listing_photos.ai_tags IS 'Tagi wygenerowane przez OpenAI Vision (np. wnętrze, deska rozdzielcza).';
COMMENT ON COLUMN public.listing_photos.ai_caption IS 'Krótki opis zdjęcia wygenerowany przez AI.';
