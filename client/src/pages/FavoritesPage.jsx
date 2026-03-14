import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useFavorites, toggleFavorite } from '../hooks/useFavorites'
import { ListingCard } from '../components/ListingCard'

export function FavoritesPage() {
  const { user } = useAuth()
  const { favoritesListings, loading, error, refetch } = useFavorites(user?.id)

  async function handleToggle(listingId) {
    if (!user?.id) return
    await toggleFavorite(user.id, listingId)
    refetch()
  }

  return (
    <div className="layout">
      <header className="page-header">
        <h1>Ulubione</h1>
        <nav>
          <Link to="/">Strona główna</Link>
          <Link to="/ogloszenia">Ogłoszenia</Link>
          <Link to="/dashboard">Moje konto</Link>
        </nav>
      </header>

      <section className="section">
        <h2 className="section__title">Twoje ulubione ogłoszenia</h2>
        {loading ? (
          <p className="loading">Ładowanie…</p>
        ) : error ? (
          <p className="msg--error">{error}</p>
        ) : favoritesListings.length === 0 ? (
          <div className="empty-state">
            <p>Brak ogłoszeń w ulubionych.</p>
            <p>
              <Link to="/ogloszenia">Przejdź do ogłoszeń</Link>, aby dodać oferty do ulubionych.
            </p>
          </div>
        ) : (
          <div className="grid-listings">
            {favoritesListings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                showFavorite
                isFavorited
                onFavoriteToggle={() => handleToggle(l.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
