import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ListingFilters } from '../components/ListingFilters'
import { useListingsPreview } from '../hooks/useListingsPreview'
import { supabase } from '../lib/supabase'

export function HomePage() {
  const { user } = useAuth()
  const { listings, loading } = useListingsPreview(12)
  const [searchParams] = useSearchParams()
  const showSuccess = searchParams.get('sprzedaj') === 'ok'

  return (
    <div className="layout">
      {showSuccess && (
        <div className="alert alert--success" role="status">
          Ogłoszenie dodane. Pojawiło się w ostatnich ofertach poniżej.
        </div>
      )}
      {!supabase && (
        <div className="alert alert--warning">
          Brak konfiguracji Supabase. Skopiuj <code>client/.env.example</code> do <code>client/.env</code> i uzupełnij VITE_SUPABASE_URL oraz VITE_SUPABASE_ANON_KEY.
        </div>
      )}
      <header className="page-header">
        <h1>Portal ogłoszeń motoryzacyjnych</h1>
        <nav>
          {user ? (
            <>
              <Link to="/sprzedaj">Sprzedaj</Link>
              <Link to="/dashboard">Moje konto</Link>
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
        <ListingFilters redirectTo="/ogloszenia" />
      </section>

      <section className="section">
        <h3 className="section__title">Ostatnie oferty</h3>
        {loading ? (
          <p className="loading">Ładowanie…</p>
        ) : listings?.length > 0 ? (
          <div className="grid-listings">
            {listings.map((l) => (
              <Link key={l.id} to={`/ogloszenia/${l.id}`} className="card card--listing card--clickable">
                <div className="card__thumb" />
                <div className="card__body">
                  <h4 className="card__title">{l.title}</h4>
                  <p className="card__meta">{l.price} PLN · {l.year}</p>
                  <p className="card__location">{l.region_name || l.city || '—'}</p>
                </div>
              </Link>
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
