import { Link, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../hooks/useAuth'
import { ListingFiltersExtended } from '../components/ListingFiltersExtended'
import { ListingCard } from '../components/ListingCard'
import { useListingsSearch } from '../hooks/useListingsSearch'
import { useFavoriteIds, toggleFavorite } from '../hooks/useFavorites'
import { supabase } from '../lib/supabase'

export function SearchPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const { listings, loading } = useListingsSearch(Object.fromEntries(searchParams))
  const { favoriteIds, refetch: refetchFavorites } = useFavoriteIds(user?.id)

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <div className="layout">
      <Helmet>
        <title>Szukaj – zaawansowane filtry | Neu.Place</title>
        <meta name="description" content="Zaawansowane wyszukiwanie ogłoszeń motoryzacyjnych. Filtruj po kategorii, marce, cenie, roku, paliwie, województwie i powiecie." />
        <link rel="canonical" href="https://neu.place/szukaj" />
      </Helmet>
      <header className="page-header">
        <h1>Szukaj</h1>
        <nav>
          <Link to="/">Strona główna</Link>
          <Link to="/ogloszenia">Ogłoszenia</Link>
          {user ? (
            <>
              <Link to="/ulubione">Ulubione</Link>
              <Link to="/dashboard">Moje konto</Link>
              <Link to="/sprzedaj">Sprzedaj</Link>
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

      <section className="search-box section">
        <h3 className="section__title">Filtry zaawansowane</h3>
        <ListingFiltersExtended redirectTo="/szukaj" />
      </section>

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
          <p>Brak ofert spełniających kryteria. Zmień filtry lub wróć później.</p>
        </div>
      )}
    </div>
  )
}
