-- Migracja: polityki RLS dla car_models (operacje admina)
-- Uruchamiana w Supabase SQL Editor lub przez CLI jako część migracji.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'car_models' AND policyname = 'car_models_admin_insert') THEN
    CREATE POLICY "car_models_admin_insert" ON public.car_models
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
            AND p.is_blocked = FALSE
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'car_models' AND policyname = 'car_models_admin_update') THEN
    CREATE POLICY "car_models_admin_update" ON public.car_models
      FOR UPDATE USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
            AND p.is_blocked = FALSE
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'car_models' AND policyname = 'car_models_admin_delete') THEN
    CREATE POLICY "car_models_admin_delete" ON public.car_models
      FOR DELETE USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'superadmin')
            AND p.is_blocked = FALSE
        )
      );
  END IF;
END $$;

