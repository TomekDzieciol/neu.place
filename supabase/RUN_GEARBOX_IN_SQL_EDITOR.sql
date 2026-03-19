-- Uruchom to w Supabase: SQL Editor → New query → wklej i Run
-- Dodaje kolumnę "gearbox" do tabeli listings (gdy brakuje jej w schema cache).

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS gearbox TEXT
  CHECK (gearbox IS NULL OR gearbox IN ('Manualna', 'Automatyczna'));

COMMENT ON COLUMN public.listings.gearbox IS 'Skrzynia biegów: Manualna lub Automatyczna.';

CREATE INDEX IF NOT EXISTS idx_listings_gearbox ON public.listings(gearbox)
  WHERE gearbox IS NOT NULL;

-- Po wykonaniu: w Supabase Dashboard → Settings → API → "Reload schema"
-- (opcjonalnie – cache zwykle odświeża się sam po chwili)
