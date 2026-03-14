-- Funkcja zwracająca numer telefonu właściciela ogłoszenia (tylko dla aktywnych ogłoszeń).
-- Używana do odsłonięcia numeru po kliknięciu, bez łamania RLS na profiles.
CREATE OR REPLACE FUNCTION public.get_listing_owner_phone(p_listing_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.phone
  FROM public.listings l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.id = p_listing_id
    AND l.status = 'active';
$$;

COMMENT ON FUNCTION public.get_listing_owner_phone(UUID) IS
  'Zwraca numer telefonu właściciela ogłoszenia tylko gdy ogłoszenie jest aktywne. Używane do „kliknij, aby zobaczyć numer”.';

-- Klient (anon/authenticated) musi mieć prawo wywołania RPC
GRANT EXECUTE ON FUNCTION public.get_listing_owner_phone(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_listing_owner_phone(UUID) TO authenticated;
