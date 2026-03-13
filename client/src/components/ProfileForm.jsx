import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useListingDictionaries } from '../hooks/useListingDictionaries'
import { useCounties } from '../hooks/useCounties'

export function ProfileForm({ profile, userId }) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [regionId, setRegionId] = useState(profile?.region_id ?? '')
  const [countyId, setCountyId] = useState(profile?.county_id ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const { regions } = useListingDictionaries(null, undefined)
  const { counties } = useCounties(regionId || null)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setPhone(profile?.phone ?? '')
    setRegionId(profile?.region_id ?? '')
    setCountyId(profile?.county_id ?? '')
    setCity(profile?.city ?? '')
  }, [profile])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!regionId || !countyId) {
      setError('Wybierz województwo i powiat.')
      return
    }
    if (!supabase) {
      setError('Brak połączenia z bazą. Skonfiguruj client/.env.')
      return
    }
    const { error: err } = await supabase
      .from('profiles')
      .update({
        display_name: displayName || null,
        phone: phone || null,
        region_id: regionId || null,
        county_id: countyId || null,
        city: city.trim() || null,
      })
      .eq('id', userId)
    if (err) {
      console.error('[ProfileForm] Supabase update error while saving profile.', {
        userId,
        error: err,
      })
      setError(err.message)
      return
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="msg--error">{error}</p>}
      {saved && <p className="msg--success">Profil zapisany.</p>}
      <label>
        Nazwa wyświetlana
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </label>
      <label>
        Telefon
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <label>
        Województwo *
        <select value={regionId} onChange={(e) => { setRegionId(e.target.value); setCountyId(''); }} required>
          <option value="">Wybierz województwo</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>
      <label>
        Powiat *
        <select value={countyId} onChange={(e) => setCountyId(e.target.value)} required disabled={!regionId}>
          <option value="">Wybierz powiat</option>
          {counties.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label>
        Miasto
        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="opcjonalnie" />
      </label>
      <button type="submit" className="btn btn--primary">Zapisz profil</button>
    </form>
  )
}
