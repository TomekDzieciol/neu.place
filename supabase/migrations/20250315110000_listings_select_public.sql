-- Odczyt aktywnych ogłoszeń dla wszystkich (anon i zalogowani).
-- Bez polityki listings_select_public wyszukiwarka RPC search_listings zwraca 0 wierszy dla anon (RLS blokuje SELECT).
-- Tytuły są przeszukiwane w search_listings przez l.title ILIKE '%' || search_escaped || '%'.

DROP POLICY IF EXISTS "listings_select_public" ON public.listings;
CREATE POLICY "listings_select_public" ON public.listings
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "listings_select_own" ON public.listings;
CREATE POLICY "listings_select_own" ON public.listings
  FOR SELECT USING (auth.uid() = user_id);
