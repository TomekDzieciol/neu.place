-- Tabela paliw + powiązanie z listings

CREATE TABLE IF NOT EXISTS public.fuels (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Seed: stała lista paliw
INSERT INTO public.fuels (name) VALUES
  ('Diesel'),
  ('Benzyna'),
  ('LPG'),
  ('CNG i Hybryda'),
  ('Hybryda Plug-in'),
  ('Elektryczny')
ON CONFLICT (name) DO NOTHING;

-- Kolumna fuel_id w listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS fuel_id INT REFERENCES public.fuels(id);

CREATE INDEX IF NOT EXISTS idx_listings_fuel ON public.listings(fuel_id);

-- RLS: odczyt paliw dla wszystkich
ALTER TABLE public.fuels ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fuels' AND policyname = 'fuels_select_all'
  ) THEN
    CREATE POLICY "fuels_select_all" ON public.fuels
      FOR SELECT USING (true);
  END IF;
END $$;

