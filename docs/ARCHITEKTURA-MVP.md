# Architektura i MVP – Portal ogłoszeń motoryzacyjnych

**Stos:** React + Node.js + Supabase (PostgreSQL)  
**Cel:** Bezpieczny, responsywny i skalowalny portal z ogłoszeniami motoryzacyjnymi.

---

## 1. Przegląd widoków i logiki

### 1.1 Strona główna (publiczna)

| Element | Opis |
|--------|------|
| **Landing** | Hero z nazwą portalu, krótkim opisem, CTA „Zarejestruj się” / „Zaloguj”. |
| **Zajawki ofert** | Lista ostatnich/feature’owych ogłoszeń (np. 6–12 kart): zdjęcie, marka/model, cena, lokalizacja, link do szczegółów. |
| **O portalu** | Sekcja „Dlaczego my” (bezpieczeństwo, filtrowanie, wsparcie). |
| **Wyszukiwarka** | Formularz z filtrami: marka, model, przedział cenowy, lokalizacja (województwo/miasto), rok produkcji, typ nadwozia. Wyniki na osobnej podstronie `/ogloszenia` lub pod sekcją na stronie głównej. |
| **Dostęp** | Bez logowania: przeglądanie ofert i wyszukiwanie. Rejestracja wymagana do dodawania ogłoszeń i kontaktu. |

**Logika:**  
- Oferty pobierane z Supabase (publiczne tabele/views).  
- Filtry → zapytanie z parametrami (parametryzowane zapytania / Supabase client – ochrona przed SQL injection).  
- Strona główna: limit (np. 12) ostatnich aktywnych ogłoszeń.

---

### 1.2 Dashboard użytkownika (po zalogowaniu)

| Funkcja | Opis |
|--------|------|
| **Profil** | Edycja: email (z potwierdzeniem), imię/nazwisko lub nazwa wyświetlana, telefon (opcjonalnie), województwo/miasto, data urodzenia (walidacja wieku 18+). |
| **Moje ogłoszenia** | Lista własnych ofert: status (aktywne/ukryte/zakończone), szybkie akcje: edytuj, ukryj, usuń. |
| **Dodaj ogłoszenie** | Formularz z walidacją (po stronie klienta i serwera). |
| **Ulubione / Historia** | (Opcjonalnie w MVP: zakładka „Ulubione” z zapisanymi ofertami). |

**Logika:**  
- Autoryzacja: JWT (Supabase Auth).  
- Wszystkie mutacje (profil, ogłoszenia) przez API (Node.js) lub Supabase RLS – tylko `auth.uid() = user_id`.  
- Wiek: pole `date_of_birth` – walidacja „wiek >= 18” po stronie API i w bazie (funkcja/constraint).

---

### 1.3 Dashboard administratora

| Funkcja | Opis |
|--------|------|
| **Użytkownicy** | Lista użytkowników: id, email, rola, data rejestracji, status (aktywny/zablokowany). Filtry i wyszukiwanie. |
| **Zarządzanie** | Zmiana roli (user → admin tylko przez superadmina), blokowanie/odblokowanie konta, (opcjonalnie) wymuszenie zmiany hasła. |
| **Moderacja ogłoszeń** | (Opcjonalnie w MVP) Lista ogłoszeń do moderacji, oznaczanie jako zweryfikowane/odrzucone. |
| **Dostęp** | Tylko rola `admin` (lub `superadmin`). Sprawdzenie roli w API i w RLS. |

**Logika:**  
- Endpointy admina w Node.js: np. `GET/PATCH /api/admin/users`, `PATCH /api/admin/users/:id/block`.  
- Supabase RLS: tabele `users`/`profiles` – odczyt/modyfikacja tylko dla `role = 'admin'`.  
- Audit log (opcjonalnie): kto, kiedy, co zmienił w użytkowniku.

---

## 2. Wymagania techniczne – bezpieczeństwo

### 2.1 Hasła

- **Hashowanie:** Supabase Auth używa bcrypt (domyślnie). Przy własnym rejestracji przez API – użyć bcrypt (np. `bcryptjs` w Node.js) z odpowiednim cost factor (np. 12).  
- **Nigdy** nie przechowywać ani nie logować haseł w plain text.  
- Polityka haseł: min. 8 znaków, wielka/mała litera, cyfra (wymuszenie w Supabase Auth lub w formularzu + API).

### 2.2 Walidacja wieku (18+)

- W profilu użytkownika: pole `date_of_birth` (DATE).  
- Walidacja:  
  - **Frontend:** sprawdzenie przed wysłaniem formularza.  
  - **Backend (Node.js):** przed zapisem do bazy: `wiek = dzisiaj - date_of_birth >= 18`.  
  - **Baza:** constraint lub trigger odrzucający `date_of_birth` jeśli wiek < 18.  
- Rejestracja może blokować użytkowników < 18 (jeśli regulamin tego wymaga).

### 2.3 Ochrona przed SQL Injection

- **Supabase:** używanie wyłącznie klienta Supabase (JavaScript/Node) z parametrami – zapytania budowane przez SDK, nie surowy SQL z konkatenacją.  
- **Node.js (własne zapytania):** jeśli kiedyś surowy SQL – tylko parametryzowane zapytania (np. `$1, $2` w `pg`).  
- **RLS:** reguły w Supabase opisane w SQL, ale wartości z `auth.uid()` – nie z wejścia użytkownika w treści zapytania.

### 2.4 Dodatkowo

- **HTTPS** wszędzie.  
- **CORS** skonfigurowane tylko na zaufane originy (frontend).  
- **Rate limiting** na logowanie i rejestrację (np. express-rate-limit).  
- **Role i RLS:** domyślnie użytkownik widzi tylko swoje dane; admin – przez osobne polityki.

---

## 3. Schemat bazy danych (podsumowanie)

- **auth.users** – zarządzane przez Supabase Auth (hasła, email).  
- **public.profiles** – rozszerzenie użytkownika: `user_id`, `role`, `date_of_birth`, `display_name`, `phone`, `location`, itd.  
- **public.listings** – ogłoszenia: `id`, `user_id`, marka, model, cena, lokalizacja, rok, opis, status, daty.  
- **public.favorites** – (opcjonalnie) ulubione oferty użytkownika.  
- **Słowniki:** `locations`, `car_brands`, `car_models` – do filtrowania i spójności.

Szczegółowy schemat SQL w pliku `supabase/schema.sql`.

---

## 4. Struktura projektu (propozycja)

```
neu.place/
├── client/                 # React (Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── HomePage.jsx       # Strona główna
│   │   │   ├── ListingsPage.jsx   # Wyszukiwarka + wyniki
│   │   │   ├── DashboardUser/
│   │   │   └── DashboardAdmin/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   └── supabase.js
│   │   └── routes.jsx
│   └── package.json
├── server/                 # Node.js (Express/Fastify)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── listings.js
│   │   │   └── admin/
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── validateAge.js
│   │   └── index.js
│   └── package.json
├── supabase/
│   ├── schema.sql          # Schemat tabel + RLS
│   └── migrations/         # (opcjonalnie) migracje
└── docs/
    └── ARCHITEKTURA-MVP.md # ten dokument
```

---

## 5. Kolejność wdrożenia MVP

1. Założyć projekt Supabase, wdrożyć schemat bazy i RLS.  
2. Backend: rejestracja/logowanie (Supabase Auth), endpointy profilu z walidacją wieku.  
3. Frontend: strona główna (landing + zajawki ofert + wyszukiwarka z filtrami).  
4. Dashboard użytkownika: profil, moje ogłoszenia, dodawanie ogłoszenia.  
5. Dashboard admina: lista użytkowników, blokowanie, zmiana roli.  
6. Testy bezpieczeństwa: hasła, wiek, RLS, brak SQL injection.

Dokument można rozszerzyć o dokładne endpointy API i opis RLS dla każdej tabeli w kolejnych iteracjach.
