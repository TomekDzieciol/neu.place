# Portal ogłoszeń motoryzacyjnych (neu.place)

Stos: **React** (Vite) + **Node.js** (Express) + **Supabase** (PostgreSQL, Auth).

## Struktura

- `client/` – frontend React (strona główna, wyszukiwarka, dashboard użytkownika i admina)
- `server/` – API Node.js (profil z walidacją wieku, endpointy admina, rate limiting)
- `supabase/schema.sql` – schemat bazy (tabele, RLS, walidacja wieku 18+)
- `docs/ARCHITEKTURA-MVP.md` – architektura i MVP (widoki, bezpieczeństwo)

## Bezpieczeństwo

- **Hasła:** Supabase Auth (bcrypt) – nie przechowujemy haseł w plain text
- **Wiek 18+:** walidacja w formularzu (frontend), w API (backend) i w bazie (trigger `check_age_18`)
- **SQL Injection:** tylko Supabase client (parametryzowane zapytania); RLS na tabelach
- **Rate limiting:** na `/api/auth` (np. 20 req/15 min)

## Uruchomienie

1. **Supabase:** załóż projekt na [supabase.com](https://supabase.com), skopiuj URL i klucze. Wykonaj `supabase/schema.sql` w SQL Editor.
2. **Zmienne środowiskowe:** skopiuj `client/.env.example` → `client/.env` oraz `server/.env.example` → `server/.env` i uzupełnij klucze Supabase.
3. **Z katalogu głównego (client + server naraz):**
   ```bash
   npm run install:all
   npm run dev
   ```
   Strona główna: http://localhost:5173 | API: http://localhost:3000

4. **Albo osobno:** `npm run dev:client` lub `npm run dev:server` (w katalogu głównym), albo `cd client` / `cd server` i tam `npm install` + `npm run dev`.

## Widoki MVP

- **Strona główna:** landing, zajawki ofert, wyszukiwarka (lokalizacja, marka, cena, rok), CTA do rejestracji
- **Dashboard użytkownika:** profil (z walidacją wieku), moje ogłoszenia
- **Dashboard admina:** lista użytkowników, blokowanie kont
