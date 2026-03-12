-- ============================================================
-- Portal ogłoszeń motoryzacyjnych – schemat bazy (Supabase/PostgreSQL)
-- Bezpieczeństwo: RLS, walidacja wieku, brak surowego SQL od użytkownika
-- ============================================================

-- Rozszerzenia (jeśli potrzebne)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SŁOWNIKI (lokalizacje, marki, modele)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.regions (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.car_brands (
  id       SERIAL PRIMARY KEY,
  name     TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'cars' CHECK (category IN (
    'cars', 'construction', 'motorcycles_scooters', 'trailers', 'vans', 'trucks', 'other'
  )),
  UNIQUE(category, name)
);
-- Dla istniejącej bazy bez kolumny category: odkomentuj i uruchom poniższą migrację w SQL Editor.
-- ALTER TABLE public.car_brands ADD COLUMN IF NOT EXISTS category TEXT;
-- UPDATE public.car_brands SET category = 'cars' WHERE category IS NULL;
-- ALTER TABLE public.car_brands ALTER COLUMN category SET NOT NULL;
-- ALTER TABLE public.car_brands ADD CONSTRAINT car_brands_category_check CHECK (category IN (
--   'cars', 'construction', 'motorcycles_scooters', 'trailers', 'vans', 'trucks', 'other'));
-- ALTER TABLE public.car_brands DROP CONSTRAINT IF EXISTS car_brands_name_key;
-- CREATE UNIQUE INDEX IF NOT EXISTS car_brands_category_name_key ON public.car_brands(category, name);

CREATE TABLE IF NOT EXISTS public.car_models (
  id         SERIAL PRIMARY KEY,
  brand_id   INT NOT NULL REFERENCES public.car_brands(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  UNIQUE(brand_id, name)
);

-- ============================================================
-- PROFILE UŻYTKOWNIKÓW (rozszerzenie auth.users)
-- auth.users jest zarządzane przez Supabase Auth (hasła hashowane po stronie Supabase)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  display_name  TEXT,
  phone         TEXT,
  region_id     INT REFERENCES public.regions(id),
  date_of_birth DATE,
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  is_blocked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Walidacja wieku 18+ (trigger)
CREATE OR REPLACE FUNCTION public.check_age_18()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL AND (
    EXTRACT(YEAR FROM AGE(NEW.date_of_birth)) < 18
  ) THEN
    RAISE EXCEPTION 'Użytkownik musi mieć ukończone 18 lat.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_age_check
  BEFORE INSERT OR UPDATE OF date_of_birth ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_age_18();

-- Aktualizacja updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Uwaga: W PostgreSQL < 11 użyj EXECUTE PROCEDURE zamiast EXECUTE FUNCTION

-- ============================================================
-- OGŁOSZENIA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id    INT NOT NULL REFERENCES public.car_brands(id),
  model_id    INT NOT NULL REFERENCES public.car_models(id),
  title       TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  year        INT NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  mileage_km  INT CHECK (mileage_km >= 0),
  region_id   INT REFERENCES public.regions(id),
  city        TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'closed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_listings_user_id ON public.listings(user_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_listings_created_at ON public.listings(created_at DESC);
CREATE INDEX idx_listings_price ON public.listings(price);
CREATE INDEX idx_listings_region ON public.listings(region_id);
CREATE INDEX idx_listings_brand_model ON public.listings(brand_id, model_id);

-- Kategorie ogłoszeń (samochody osobowe, maszyny budowlane itd.)
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

CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);

-- ============================================================
-- ZDJĘCIA OGŁOSZEŃ (1:N do listing)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.listing_photos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_listing_photos_listing ON public.listing_photos(listing_id);

-- ============================================================
-- ULUBIONE (opcjonalnie w MVP)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.favorites (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, listing_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Ochrona przed nieautoryzowanym dostępem; SQL injection
-- unikamy przez używanie Supabase client (parametryzowane zapytania)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Helper: czy zalogowany użytkownik jest adminem (SECURITY DEFINER = bez RLS, unika rekurencji)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND is_blocked = FALSE);
$$;

-- Profiles: użytkownik widzi/edytuje tylko swój profil; admin widzi wszystkich
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Tylko admin może aktualizować innych (role, is_blocked)
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- Listings: wszyscy widzą aktywne; właściciel widzi swoje wszystkie; admin widzi wszystkie
CREATE POLICY "listings_select_public" ON public.listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "listings_select_own" ON public.listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "listings_select_admin" ON public.listings
  FOR SELECT USING (public.is_admin());

CREATE POLICY "listings_insert_own" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "listings_update_own" ON public.listings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "listings_delete_own" ON public.listings
  FOR DELETE USING (auth.uid() = user_id);

-- Listing photos
CREATE POLICY "listing_photos_select" ON public.listing_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.status = 'active' OR l.user_id = auth.uid()))
    OR public.is_admin()
  );
CREATE POLICY "listing_photos_insert" ON public.listing_photos
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );
CREATE POLICY "listing_photos_update" ON public.listing_photos
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );
CREATE POLICY "listing_photos_delete" ON public.listing_photos
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND l.user_id = auth.uid())
  );

-- Favorites
CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- Słowniki: odczyt publiczny (dla filtrów)
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regions_select_all" ON public.regions FOR SELECT USING (true);
CREATE POLICY "car_brands_select_all" ON public.car_brands FOR SELECT USING (true);
CREATE POLICY "car_brands_admin_insert" ON public.car_brands
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "car_brands_admin_update" ON public.car_brands
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "car_brands_admin_delete" ON public.car_brands
  FOR DELETE USING (public.is_admin());
CREATE POLICY "car_models_select_all" ON public.car_models FOR SELECT USING (true);

-- ============================================================
-- AUTOMATYCZNE UTWORZENIE PROFILU PO REJESTRACJI (Supabase Auth)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: automatyczne utworzenie profilu przy rejestracji (Supabase Auth)
-- W Supabase Dashboard: SQL Editor – uruchom tylko jeśli masz uprawnienia do auth.users
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Alternatywa: w aplikacji po pierwszym logowaniu wstawiamy profil, jeśli nie istnieje.
COMMENT ON TABLE public.profiles IS 'Profil tworzony po rejestracji (handle_new_user lub z aplikacji).';
