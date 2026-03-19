import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../hooks/useAuth'
import { ListingFilters } from '../components/ListingFilters'
import { ListingCard } from '../components/ListingCard'
import { useListingsPreview } from '../hooks/useListingsPreview'
import { useFavoriteIds, toggleFavorite } from '../hooks/useFavorites'
import { supabase } from '../lib/supabase'

export function HomePage() {
  const { user } = useAuth()
  const { listings, loading } = useListingsPreview(12)
  const { favoriteIds, refetch: refetchFavorites } = useFavoriteIds(user?.id)
  const [searchParams] = useSearchParams()
  const showSuccess = searchParams.get('sprzedaj') === 'ok'

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <div className="layout">
      <Helmet>
        <title>Neu.Place – Ogłoszenia motoryzacyjne | Samochody używane i nowe</title>
        <meta name="description" content="Ogłoszenia motoryzacyjne – samochody używane i nowe. Przeglądaj oferty, porównuj ceny, dodawaj ogłoszenia za darmo." />
        <link rel="canonical" href="https://neu.place/" />
      </Helmet>
      {showSuccess && (
        <div className="alert alert--success" role="status">
          Ogłoszenie dodane. Pojawiło się w ostatnich ofertach poniżej.
        </div>
      )}
      {!supabase && (
        <>
          {console.log(
            '[HomePage] Supabase client is not initialized. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env or Vercel project settings.'
          )}
        </>
      )}
      <header className="page-header">
        <h1>Portal ogłoszeń motoryzacyjnych</h1>
        <nav>
          {user ? (
            <>
              <Link to="/sprzedaj">Sprzedaj</Link>
              <Link to="/ulubione">Ulubione</Link>
              <Link to="/dashboard">Moje konto</Link>
              <button type="button" className="btn-link" onClick={handleSignOut}>Wyloguj</button>
            </>
          ) : (
            <>
              <Link to="/auth">Zaloguj</Link>
              <Link to="/auth?rejestracja=1">Zarejestruj się</Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <h2>Znajdź swój wymarzony pojazd</h2>
        <p>Bezpieczne ogłoszenia, sprawdzeni sprzedawcy, zaawansowane filtry.</p>
        {user ? (
          <Link to="/sprzedaj" className="btn btn--secondary">
            Wystaw ogłoszenie
          </Link>
        ) : (
          <Link to="/auth?rejestracja=1" className="btn btn--secondary">
            Zarejestruj się i dodawaj ogłoszenia
          </Link>
        )}
      </section>

      <section className="search-box section">
        <h3 className="section__title">Wyszukiwarka</h3>
        <ListingFilters redirectTo="/szukaj" />
        <p className="search-box__more">
          <Link to="/szukaj">Więcej filtrów (kategoria, marka, cena, rok…)</Link>
        </p>
      </section>

      <section className="section">
        <h3 className="section__title">Ostatnie oferty</h3>
        {loading ? (
          <p className="loading">Ładowanie…</p>
        ) : listings?.length > 0 ? (
          <div className="grid-listings">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                showFavorite={!!user}
                isFavorited={user ? favoriteIds.has(l.id) : false}
                onFavoriteToggle={() => user && toggleFavorite(user.id, l.id).then(refetchFavorites)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>Brak ofert do wyświetlenia. Dodaj pierwszą po rejestracji.</p>
          </div>
        )}
      </section>

      <section className="about-block section">
        <h3 className="section__title">O portalu</h3>
        <p>Bezpieczne transakcje, weryfikacja wieku, ochrona danych. Filtruj po lokalizacji, marce, cenie i wielu innych parametrach.</p>
      </section>
    </div>
  )
}
