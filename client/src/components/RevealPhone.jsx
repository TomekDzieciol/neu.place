import { useState } from 'react'
import { Phone } from 'lucide-react'
import { supabase } from '../lib/supabase'

/**
 * Pokazuje przycisk „Pokaż numer telefonu”. Po kliknięciu wywołuje RPC
 * i wyświetla numer (wymaga akcji użytkownika, ogranicza scrapowanie).
 */
export function RevealPhone({ listingId, className = '' }) {
  const [revealed, setRevealed] = useState(false)
  const [phone, setPhone] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleReveal(e) {
    e.preventDefault()
    e.stopPropagation()
    if (revealed || loading || !listingId || !supabase) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('get_listing_owner_phone', {
        p_listing_id: listingId,
      })
      if (rpcError) {
        console.error('[RevealPhone] RPC error:', rpcError)
        setError('Nie udało się pobrać numeru.')
        return
      }
      const value = typeof data === 'string' ? data : data?.phone ?? null
      setPhone(value?.trim() || null)
      setRevealed(true)
    } catch (err) {
      console.error('[RevealPhone] Error fetching phone.', err)
      setError('Wystąpił błąd.')
    } finally {
      setLoading(false)
    }
  }

  if (!listingId) return null

  if (loading) {
    return (
      <p className={`detail-phone detail-phone--loading ${className}`.trim()}>
        <span className="detail-phone__label">Numer telefonu:</span>{' '}
        <span className="detail-phone__value">Ładowanie…</span>
      </p>
    )
  }

  if (error) {
    return (
      <p className={`detail-phone detail-phone--error ${className}`.trim()}>
        <span className="detail-phone__label">Numer telefonu:</span>{' '}
        <span className="detail-phone__value">{error}</span>
      </p>
    )
  }

  if (revealed) {
    return (
      <p className={`detail-phone detail-phone--revealed ${className}`.trim()}>
        <span className="detail-phone__label">Numer telefonu:</span>{' '}
        {phone ? (
          <a href={`tel:${phone}`} className="detail-phone__link">
            <Phone size={16} aria-hidden />
            {phone}
          </a>
        ) : (
          <span className="detail-phone__value">Brak numeru</span>
        )}
      </p>
    )
  }

  return (
    <p className={`detail-phone ${className}`.trim()}>
      <span className="detail-phone__label">Numer telefonu:</span>{' '}
      <button
        type="button"
        className="detail-phone__reveal-btn"
        onClick={handleReveal}
      >
        <Phone size={16} aria-hidden />
        Pokaż numer telefonu
      </button>
    </p>
  )
}
