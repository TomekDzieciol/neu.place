-- Tabela typów nadwozia + powiązanie z listings

CREATE TABLE IF NOT EXISTS public.body_types (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Seed: stała lista typów nadwozia
INSERT INTO public.body_types (name) VALUES
  ('Kabriolet'),
  ('Sedan'),
  ('Coupe'),
  ('Pickup'),
  ('Hatchback'),
  ('Kombi'),
  ('Terenowy'),
  ('Minibus'),
  ('Minivan'),
  ('SUV')
ON CONFLICT (name) DO NOTHING;

-- Kolumna body_type_id w listings
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS body_type_id INT REFERENCES public.body_types(id);

CREATE INDEX IF NOT EXISTS idx_listings_body_type ON public.listings(body_type_id);

-- RLS: odczyt typów nadwozia dla wszystkich
ALTER TABLE public.body_types ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'body_types' AND policyname = 'body_types_select_all'
  ) THEN
    CREATE POLICY "body_types_select_all" ON public.body_types
      FOR SELECT USING (true);
  END IF;
END $$;

