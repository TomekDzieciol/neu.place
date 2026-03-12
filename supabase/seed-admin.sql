-- Jednorazowe nadanie uprawnień admin użytkownikowi.
-- Uruchom w Supabase SQL Editor (lub psql) po tym, jak użytkownik się zarejestruje.
-- Użytkownik musi mieć już wpis w public.profiles (email z rejestracji).

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'tomek.dzieciol@gmail.com';
