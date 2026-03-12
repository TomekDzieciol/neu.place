-- Kolumna stanu technicznego w listings
-- Wartości przechowywane w bazie są po polsku, tak jak w UI.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS technical_condition TEXT
    CHECK (technical_condition IN ('Nieuszkodzony', 'Uszkodzony'))
    NOT NULL DEFAULT 'Nieuszkodzony';

