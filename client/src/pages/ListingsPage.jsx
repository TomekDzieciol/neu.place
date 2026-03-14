import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ListingFilters } from '../components/ListingFilters'
import { ListingCard } from '../components/ListingCard'
import { useListingsSearch } from '../hooks/useListingsSearch'
import { useFavoriteIds, toggleFavorite } from '../hooks/useFavorites'

export function ListingsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const { listings, loading } = useListingsSearch(Object.fromEntries(searchParams))
  const { favoriteIds, refetch: refetchFavorites } = useFavoriteIds(user?.id)

  return (
    <div className="layout">
      <header className="page-header">
        <h1>Ogłoszenia</h1>
        <Link to="/">Strona główna</Link>
      </header>

      <section className="search-box section">
        <h3 className="section__title">Filtry</h3>
        <ListingFilters redirectTo="/ogloszenia" />
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
