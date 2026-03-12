-- Kolumna pojemności silnika w listings
-- Przechowujemy pojemność w cm3 jako dodatnią liczbę całkowitą.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS engine_capacity_cc INT CHECK (engine_capacity_cc > 0);

CREATE INDEX IF NOT EXISTS idx_listings_engine_capacity_cc ON public.listings(engine_capacity_cc);

