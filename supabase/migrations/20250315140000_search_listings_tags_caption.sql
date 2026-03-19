-- Wyszukiwarka tekstowa: doprecyzowanie wyszukiwania po tagach AI i opisach zdjęć (ai_caption).
-- Fraza p_search dopasowuje: tytuł, opis, tagi AI (ai_tags) oraz opisy zdjęć (ai_caption).

CREATE OR REPLACE FUNCTION public.search_listings(
  p_search          TEXT DEFAULT NULL,
  p_region_id       INT DEFAULT NULL,
  p_county_id       INT DEFAULT NULL,
  p_city            TEXT DEFAULT NULL,
  p_brand_id        INT DEFAULT NULL,
  p_fuel_id         INT DEFAULT NULL,
  p_gearbox         TEXT DEFAULT NULL,
  p_price_min       NUMERIC DEFAULT NULL,
  p_price_max       NUMERIC DEFAULT NULL,
  p_year_min        INT DEFAULT NULL,
  p_year_max        INT DEFAULT NULL,
  p_engine_min      INT DEFAULT NULL,
  p_engine_max      INT DEFAULT NULL,
  p_category        TEXT DEFAULT NULL
)
RETURNS TABLE (listing_id UUID)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  search_escaped TEXT;
BEGIN
  IF p_gearbox IS NOT NULL AND p_gearbox <> '' AND p_gearbox NOT IN ('Manualna', 'Automatyczna') THEN
    RAISE EXCEPTION 'Nieprawidłowa wartość skrzyni biegów: %', p_gearbox;
  END IF;

  IF p_search IS NOT NULL AND trim(p_search) <> '' THEN
    search_escaped := replace(replace(replace(trim(p_search), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_');
  END IF;

  RETURN QUERY
  SELECT l.id
  FROM public.listings l
  WHERE l.status = 'active'
    AND (p_region_id IS NULL OR l.region_id = p_region_id)
    AND (p_county_id IS NULL OR l.county_id = p_county_id)
    AND (p_city IS NULL OR p_city = '' OR l.city ILIKE '%' || replace(replace(replace(trim(p_city), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%')
    AND (p_brand_id IS NULL OR l.brand_id = p_brand_id)
    AND (p_fuel_id IS NULL OR l.fuel_id = p_fuel_id)
    AND (p_gearbox IS NULL OR p_gearbox = '' OR l.gearbox = p_gearbox)
    AND (p_price_min IS NULL OR l.price >= p_price_min)
    AND (p_price_max IS NULL OR l.price <= p_price_max)
    AND (p_year_min IS NULL OR l.year >= p_year_min)
    AND (p_year_max IS NULL OR l.year <= p_year_max)
    AND (p_engine_min IS NULL OR l.engine_capacity_cc IS NULL OR l.engine_capacity_cc >= p_engine_min)
    AND (p_engine_max IS NULL OR l.engine_capacity_cc IS NULL OR l.engine_capacity_cc <= p_engine_max)
    AND (p_category IS NULL OR p_category = '' OR l.category = p_category)
    AND (
      search_escaped IS NULL
      OR l.title ILIKE '%' || search_escaped || '%' ESCAPE E'\\'
      OR (l.description IS NOT NULL AND l.description ILIKE '%' || search_escaped || '%' ESCAPE E'\\')
      OR EXISTS (
        SELECT 1
        FROM public.listing_photos lp
        WHERE lp.listing_id = l.id
          AND (
            (lp.ai_caption IS NOT NULL AND lp.ai_caption ILIKE '%' || search_escaped || '%' ESCAPE E'\\')
            OR EXISTS (
              SELECT 1
              FROM unnest(COALESCE(lp.ai_tags, ARRAY[]::text[])) AS t(tag)
              WHERE t.tag ILIKE '%' || search_escaped || '%' ESCAPE E'\\'
            )
          )
      )
    )
  ORDER BY l.created_at DESC
  LIMIT 100;
END;
$$;

COMMENT ON FUNCTION public.search_listings IS 'Zwraca id ogłoszeń aktywnych pasujących do frazy (tytuł, opis, tagi AI ze zdjęć, opisy AI zdjęć) i opcjonalnych filtrów (w tym skrzynia biegów).';
