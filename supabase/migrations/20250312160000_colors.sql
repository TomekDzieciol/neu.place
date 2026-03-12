-- Tabela kolorów + powiązanie z listings

CREATE TABLE IF NOT EXISTS public.colors (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Seed: stała lista kolorów
INSERT INTO public.colors (name) VALUES
  ('Czarny'),
  ('Szary'),
  ('Srebrny'),
  ('Niebieski'),
  ('Brązowy - Beżowy'),
  ('Czerwony'),
  ('Zielony'),
  ('Żółty - Złot'),
  ('Inny kolor')
ON CONFLICT (name) DO NOTHING;

-- Kolumna color_id w listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS color_id INT REFERENCES public.colors(id);

CREATE INDEX IF NOT EXISTS idx_listings_color ON public.listings(color_id);

-- RLS: odczyt kolorów dla wszystkich
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'colors' AND policyname = 'colors_select_all'
  ) THEN
    CREATE POLICY "colors_select_all" ON public.colors
      FOR SELECT USING (true);
  END IF;
END $$;

