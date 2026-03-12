-- Dodanie kolumny category do tabeli listings
-- Dzięki temu aplikacja może filtrować i zapisywać kategorię ogłoszenia.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS category TEXT
    CHECK (category IN (
      'cars',
      'construction',
      'motorcycles_scooters',
      'trailers',
      'vans',
      'trucks',
      'other'
    ));

-- Opcjonalnie, jeśli chcesz ustawić domyślną kategorię dla istniejących ogłoszeń,
-- możesz uruchomić w Supabase SQL Editor:
-- UPDATE public.listings SET category = 'cars' WHERE category IS NULL;

CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);

