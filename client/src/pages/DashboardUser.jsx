import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ProfileForm } from '../components/ProfileForm'
import { supabase } from '../lib/supabase'
import { LISTING_CATEGORIES } from '../constants/categories'

export function DashboardUser() {
  const { user, profile } = useAuth()
  const [myListings, setMyListings] = useState([])
  const [myLoading, setMyLoading] = useState(true)
  const [myError, setMyError] = useState('')
  // #region agent log
  if (typeof fetch !== 'undefined') fetch('http://127.0.0.1:7273/ingest/65417a7f-0a10-4c8c-9baa-f3ced7ad1ff3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69178f'},body:JSON.stringify({sessionId:'69178f',location:'DashboardUser.jsx:render',message:'profile on dashboard',data:{profileRole:profile?.role,hasProfile:!!profile,showAdminLink:!(profile?.role !== 'admin' && profile?.role !== 'superadmin')},timestamp:Date.now(),hypothesisId:'H3,H4'})}).catch(()=>{});
  // #endregion

  useEffect(() => {
    let cancelled = false
    async function loadMyListings() {
      if (!supabase || !user?.id) {
        setMyLoading(false)
        return
      }
      setMyLoading(true)
      setMyError('')
      try {
        const { data, error } = await supabase
          .from('listings')
          .select(`
            id, title, price, year, city, status, category, created_at,
            regions ( name ),
            counties ( name ),
            listing_photos ( url, sort_order )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (cancelled) return

        if (error) {
          setMyError(error.message || 'Nie udało się wczytać ogłoszeń.')
          setMyListings([])
        } else {
          const mapped = (data || []).map((r) => {
            const photos = Array.isArray(r.listing_photos)
              ? [...r.listing_photos].sort(
                  (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
                )
              : []
            return {
              ...r,
              region_name: r.regions?.name,
              county_name: r.counties?.name,
              photo_url: photos[0]?.url || null,
            }
          })
          setMyListings(mapped)
        }
      } catch (e) {
        if (!cancelled) {
          setMyError(e.message || 'Nie udało się wczytać ogłoszeń.')
          setMyListings([])
        }
      } finally {
        if (!cancelled) setMyLoading(false)
      }
    }

    loadMyListings()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <div className="layout layout--narrow">
      <header className="page-header">
        <h1>Moje konto</h1>
        <nav>
          <Link to="/">Strona główna</Link>
          <Link to="/sprzedaj">Sprzedaj</Link>
          {(profile?.role === 'admin' || profile?.role === 'superadmin') && <Link to="/admin">Panel zarządzania</Link>}
          <button type="button" className="btn-link" onClick={handleSignOut}>Wyloguj</button>
        </nav>
      </header>

      <section className="form-block section">
        <h2 className="section__title">Mój profil</h2>
        <ProfileForm profile={profile} userId={user?.id} />
      </section>

      <section className="section">
        <h2 className="section__title">Moje ogłoszenia</h2>
        {myLoading ? (
          <p className="loading">Ładowanie moich ogłoszeń…</p>
        ) : myError ? (
          <p className="msg--error" style={{ marginBottom: 12 }}>
            {myError}
          </p>
        ) : myListings.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Nie masz jeszcze żadnych ogłoszeń.
          </p>
        ) : (
          <div className="grid-listings" style={{ marginTop: 8 }}>
            {myListings.map((l) => (
              <Link
                key={l.id}
                to={`/ogloszenia/${l.id}`}
                className="card card--listing card--clickable"
              >
                <div className="card__thumb">
                  {l.photo_url && (
                    <img
                      src={l.photo_url}
                      alt={l.title}
                      className="card__thumb-image"
                    />
                  )}
                </div>
                <div className="card__body">
                  <h4 className="card__title">{l.title}</h4>
                  <p className="card__meta">
                    {l.price != null
                      ? `${Number(l.price).toLocaleString('pl-PL')} zł`
                      : '—'}{' '}
                    · {l.year ?? '—'} ·{' '}
                    {l.status === 'active'
                      ? 'Aktywne'
                      : l.status === 'hidden'
                      ? 'Ukryte'
                      : l.status === 'closed'
                      ? 'Zamknięte'
                      : l.status || '—'}
                  </p>
                  <p className="card__location">
                    {[l.region_name, l.county_name, l.city]
                      .filter(Boolean)
                      .join(', ') || '—'}
                  </p>
                  {l.category && (
                    <p className="card__badge">
                      {LISTING_CATEGORIES.find(
                        (c) => c.value === l.category,
                      )?.label || 'Inna kategoria'}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
        <p style={{ marginTop: 16 }}>
          <Link to="/sprzedaj" className="btn btn--secondary">
            Wystaw nowe ogłoszenie
          </Link>
        </p>
      </section>
    </div>
  )
}
