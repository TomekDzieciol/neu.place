import { Link } from 'react-router-dom'
import { FavoriteHeart } from './FavoriteHeart'
import { LISTING_CATEGORIES } from '../constants/categories'

export function ListingCard({ listing, showFavorite = false, isFavorited = false, onFavoriteToggle }) {
  const { id, title, price, year, city, region_name, county_name, category, photo_url } = listing
  const location = [region_name, county_name, city].filter(Boolean).join(', ') || '—'
  const categoryLabel = category
    ? (LISTING_CATEGORIES.find((c) => c.value === category)?.label || 'Inna kategoria')
    : null

  return (
    <Link to={`/ogloszenia/${id}`} className="card card--listing card--clickable">
      <div className="card__thumb">
        {photo_url && (
          <img src={photo_url} alt={title} className="card__thumb-image" />
        )}
        {showFavorite && (
          <FavoriteHeart
            isFavorited={isFavorited}
            onToggle={onFavoriteToggle}
          />
        )}
      </div>
      <div className="card__body">
        <h4 className="card__title">{title}</h4>
        <p className="card__meta">
          {price != null ? `${Number(price).toLocaleString('pl-PL')} PLN` : '—'} · {year ?? '—'}
        </p>
        <p className="card__location">{location}</p>
        {categoryLabel && (
          <p className="card__badge">{categoryLabel}</p>
        )}
      </div>
    </Link>
  )
}
