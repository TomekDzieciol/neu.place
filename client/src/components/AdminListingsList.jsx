import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = { active: 'Aktywne', hidden: 'Ukryte', closed: 'Zamknięte' }

export function AdminListingsList() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadListings()
  }, [])

  async function loadListings() {
    setLoading(true)
    setError('')
    if (!supabase) {
      setError('Brak połączenia z bazą. Skonfiguruj client/.env.')
      setLoading(false)
      return
    }
    const { data, error: err } = await supabase
      .from('listings')
      .select('id, title, price, year, status, created_at, city, user_id')
      .order('created_at', { ascending: false })
      .limit(500)
    if (err) {
      console.error('[AdminListingsList] Supabase query error while loading listings for admin.', {
        error: err,
      })
      setError(err.message)
      setListings([])
      setLoading(false)
      return
    }
    const list = data || []
    const userIds = [...new Set(list.map((l) => l.user_id).filter(Boolean))]
    let profilesMap = {}
    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds)
      if (profilesError) {
        console.error('[AdminListingsList] Supabase query error while loading listing owners profiles.', {
          error: profilesError,
        })
        profilesMap = {}
      } else {
        profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
      }
    }
    setListings(list.map((r) => {
      const p = profilesMap[r.user_id]
      return {
        ...r,
        owner_email: p?.email,
        owner_name: p?.display_name,
      }
    }))
    setLoading(false)
  }

  if (loading) return <p className="loading">Ładowanie ogłoszeń…</p>
  if (error) return <p className="msg--error" style={{ marginBottom: 16 }}>{error}</p>

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tytuł</th>
            <th>Cena</th>
            <th>Rok</th>
            <th>Miasto</th>
            <th>Status</th>
            <th>Wystawiony przez</th>
            <th>Data</th>
            <th>Akcje</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((l) => (
            <tr key={l.id}>
              <td>{l.title}</td>
              <td>{l.price != null ? `${Number(l.price).toLocaleString('pl-PL')} zł` : '—'}</td>
              <td>{l.year ?? '—'}</td>
              <td>{l.city || '—'}</td>
              <td>{STATUS_LABELS[l.status] || l.status}</td>
              <td>{l.owner_email || l.owner_name || '—'}</td>
              <td>{l.created_at ? new Date(l.created_at).toLocaleDateString('pl') : '—'}</td>
              <td>
                <Link to={`/ogloszenia/${l.id}`} className="btn-sm">Zobacz</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {listings.length === 0 && <p style={{ color: 'var(--color-text-muted)', marginTop: 12 }}>Brak ogłoszeń.</p>}
    </div>
  )
}
