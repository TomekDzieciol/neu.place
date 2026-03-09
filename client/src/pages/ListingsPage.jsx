import { Link, useSearchParams } from 'react-router-dom'
import { ListingFilters } from '../components/ListingFilters'
import { useListingsSearch } from '../hooks/useListingsSearch'

export function ListingsPage() {
  const [searchParams] = useSearchParams()
  const { listings, loading } = useListingsSearch(Object.fromEntries(searchParams))

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
          <p>Brak ofert spełniających kryteria. Zmień filtry lub wróć później.</p>
        </div>
      )}
    </div>
  )
}
