-- Fix: infinite recursion in RLS policies that check admin via SELECT on profiles.
-- Solution: SECURITY DEFINER function reads profiles without RLS, so no recursion.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin') AND is_blocked = FALSE
  );
$$;

-- Replace recursive policies on profiles
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- Replace recursive policies on listings
DROP POLICY IF EXISTS "listings_select_admin" ON public.listings;
CREATE POLICY "listings_select_admin" ON public.listings
  FOR SELECT USING (public.is_admin());

-- Replace recursive part in listing_photos_select (admin branch)
DROP POLICY IF EXISTS "listing_photos_select" ON public.listing_photos;
CREATE POLICY "listing_photos_select" ON public.listing_photos
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.listings l WHERE l.id = listing_id AND (l.status = 'active' OR l.user_id = auth.uid()))
    OR public.is_admin()
  );

-- Replace recursive policies on car_brands
DROP POLICY IF EXISTS "car_brands_admin_insert" ON public.car_brands;
CREATE POLICY "car_brands_admin_insert" ON public.car_brands
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "car_brands_admin_update" ON public.car_brands;
CREATE POLICY "car_brands_admin_update" ON public.car_brands
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "car_brands_admin_delete" ON public.car_brands;
CREATE POLICY "car_brands_admin_delete" ON public.car_brands
  FOR DELETE USING (public.is_admin());
