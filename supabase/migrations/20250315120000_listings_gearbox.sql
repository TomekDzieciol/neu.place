-- Skrzynia biegów: Manualna / Automatyczna (nullable dla istniejących ogłoszeń)

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS gearbox TEXT
  CHECK (gearbox IS NULL OR gearbox IN ('Manualna', 'Automatyczna'));

COMMENT ON COLUMN public.listings.gearbox IS 'Skrzynia biegów: Manualna lub Automatyczna.';

CREATE INDEX IF NOT EXISTS idx_listings_gearbox ON public.listings(gearbox)
  WHERE gearbox IS NOT NULL;
