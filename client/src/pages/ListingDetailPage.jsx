import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LISTING_CATEGORIES } from '../constants/categories'
import { ListingGallery } from '../components/ListingGallery'
import { RevealPhone } from '../components/RevealPhone'
import { useAuth } from '../hooks/useAuth'

export function ListingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setError('Brak połączenia z bazą danych.')
      setLoading(false)
      return
    }
    let cancelled = false

    async function fetch_() {
      try {
        const { data, error: qError } = await supabase
          .from('listings')
          .select(`
            id, title, description, price, year, mileage_km, city, category, technical_condition, user_id,
            regions ( name ),
            counties ( name ),
            car_brands ( name ),
            car_models ( name ),
            fuels ( name ),
            listing_photos ( url, sort_order )
          `)
          .eq('id', id)
          .single()

        if (cancelled) return

        if (qError || !data) {
          console.error('[ListingDetailPage] Failed to load listing details from Supabase.', {
            listingId: id,
            error: qError,
            hasData: !!data,
          })
          setError('Nie znaleziono ogłoszenia.')
          setListing(null)
        } else {
          const photos = Array.isArray(data.listing_photos)
            ? [...data.listing_photos].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            : []
          const mapped = {
            ...data,
            owner_id: data.user_id,
            brand_name: data.car_brands?.name,
            model_name: data.car_models?.name,
            region_name: data.regions?.name,
            county_name: data.counties?.name,
            fuel_name: data.fuels?.name,
            photos,
            main_photo_url: photos[0]?.url || null,
          }
          setListing(mapped)
        }
      } catch (e) {
        console.error('[ListingDetailPage] Unexpected error while loading listing details.', {
          listingId: id,
          error: e,
        })
        if (!cancelled) {
          setError('Wystąpił błąd podczas ładowania ogłoszenia.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetch_()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="layout">
        <header className="page-header">
          <h1>Szczegóły ogłoszenia</h1>
          <Link to="/">Strona główna</Link>
        </header>
        <p className="loading">Ładowanie ogłoszenia…</p>
      </div>
    )
  }

  if (error || !listing) {
    return (
      <div className="layout">
        <header className="page-header">
          <h1>Szczegóły ogłoszenia</h1>
          <Link to="/">Strona główna</Link>
        </header>
        <div className="empty-state">
          <p>{error || 'Ogłoszenie nie istnieje.'}</p>
          <button type="button" className="btn btn--secondary" onClick={() => navigate(-1)}>
            Wróć
          </button>
        </div>
      </div>
    )
  }

  const categoryLabel =
    listing.category &&
    (LISTING_CATEGORIES.find((c) => c.value === listing.category)?.label || 'Inna kategoria')

  const locationText =
    [listing.region_name, listing.county_name, listing.city].filter(Boolean).join(', ') || '—'

  async function handleStartConversation() {
    if (!supabase) return
    if (!user) {
      navigate('/auth')
      return
    }
    if (!listing?.owner_id || listing.owner_id === user.id) return

    const [userA, userB] =
      user.id < listing.owner_id ? [user.id, listing.owner_id] : [listing.owner_id, user.id]

    try {
      const { data: existing, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('listing_id', listing.id)
        .eq('user_a', userA)
        .eq('user_b', userB)
        .maybeSingle()

      if (findError && findError.code !== 'PGRST116') {
        console.error('[ListingDetailPage] Supabase query error while finding conversation.', {
          error: findError,
          listingId: listing.id,
        })
      }

      let conversationId = existing?.id

      if (!conversationId) {
        const previewBase = `Zapytanie dotyczące ogłoszenia: ${listing.title}`.slice(0, 200)
        const { data: created, error: insertError } = await supabase
          .from('conversations')
          .insert({
            listing_id: listing.id,
            user_a: userA,
            user_b: userB,
            last_message_at: new Date().toISOString(),
            last_message_preview: previewBase,
          })
          .select('id')
          .maybeSingle()

        if (insertError) {
          console.error('[ListingDetailPage] Supabase insert error while creating conversation.', {
            error: insertError,
            listingId: listing.id,
          })
          return
        }
        conversationId = created?.id
      }

      if (conversationId) {
        navigate(`/wiadomosci/${conversationId}`)
      }
    } catch (e) {
      console.error('[ListingDetailPage] Unexpected error while starting conversation.', {
        error: e,
        listingId: listing.id,
      })
    }
  }

  return (
    <div className="layout layout--narrow">
      <header className="page-header">
        <h1>{listing.title}</h1>
        <nav>
          <Link to="/">Strona główna</Link>
          <Link to="/ogloszenia">Wszystkie ogłoszenia</Link>
        </nav>
      </header>

      <section className="section">
        {listing.photos?.length > 0 && (
          <div className="mb-8">
            <ListingGallery photos={listing.photos} title={listing.title} />
          </div>
        )}

        <div className="detail-info">
          <p className="detail-price">
            <strong>{listing.price} PLN</strong>
          </p>
          <p>
            <strong>Rok produkcji:</strong> {listing.year}
          </p>
          {listing.mileage_km != null && (
            <p>
              <strong>Przebieg:</strong> {listing.mileage_km} km
            </p>
          )}
          <p>
            <strong>Marka / model:</strong> {listing.brand_name} {listing.model_name}
          </p>
          {listing.fuel_name && (
            <p>
              <strong>Paliwo:</strong> {listing.fuel_name}
            </p>
          )}
          <p>
            <strong>Lokalizacja:</strong> {locationText}
          </p>
          <RevealPhone listingId={listing.id} />
          {user && listing.owner_id && listing.owner_id !== user.id && (
            <div className="detail-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleStartConversation}
              >
                Wyślij wiadomość
              </button>
            </div>
          )}
          {categoryLabel && (
            <p>
              <strong>Kategoria:</strong> {categoryLabel}
            </p>
          )}
        </div>

        {listing.description && (
          <div className="detail-description">
            <h3>Opis</h3>
            <p>{listing.description}</p>
          </div>
        )}

      </section>
    </div>
  )
}

