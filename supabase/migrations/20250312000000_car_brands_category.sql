-- Migracja: marki pojazdów przypisane do kategorii (dla istniejącej bazy)
-- Uruchom w Supabase SQL Editor, jeśli tabela car_brands istnieje bez kolumny category.

ALTER TABLE public.car_brands ADD COLUMN IF NOT EXISTS category TEXT;
UPDATE public.car_brands SET category = 'cars' WHERE category IS NULL;
ALTER TABLE public.car_brands ALTER COLUMN category SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'car_brands_category_check'
  ) THEN
    ALTER TABLE public.car_brands ADD CONSTRAINT car_brands_category_check
      CHECK (category IN (
        'cars', 'construction', 'motorcycles_scooters', 'trailers', 'vans', 'trucks', 'other'
      ));
  END IF;
END $$;
ALTER TABLE public.car_brands DROP CONSTRAINT IF EXISTS car_brands_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS car_brands_category_name_key ON public.car_brands(category, name);

-- RLS: admin może dodawać/edytować/usuwać marki (jeśli jeszcze nie ma polityk)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'car_brands' AND policyname = 'car_brands_admin_insert') THEN
    CREATE POLICY "car_brands_admin_insert" ON public.car_brands
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin') AND p.is_blocked = FALSE)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'car_brands' AND policyname = 'car_brands_admin_update') THEN
    CREATE POLICY "car_brands_admin_update" ON public.car_brands
      FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin') AND p.is_blocked = FALSE)
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'car_brands' AND policyname = 'car_brands_admin_delete') THEN
    CREATE POLICY "car_brands_admin_delete" ON public.car_brands
      FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin') AND p.is_blocked = FALSE)
      );
  END IF;
END $$;
