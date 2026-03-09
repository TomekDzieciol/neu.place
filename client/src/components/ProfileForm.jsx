import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MIN_AGE = 18

function isAtLeast18(dateOfBirth) {
  if (!dateOfBirth) return true
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= MIN_AGE
}

export function ProfileForm({ profile, userId }) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [dateOfBirth, setDateOfBirth] = useState(profile?.date_of_birth ?? '')
  const [regionId, setRegionId] = useState(profile?.region_id ?? '')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '')
    setPhone(profile?.phone ?? '')
    setDateOfBirth(profile?.date_of_birth ?? '')
    setRegionId(profile?.region_id ?? '')
  }, [profile])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (dateOfBirth && !isAtLeast18(dateOfBirth)) {
      setError(`Wymagany wiek: minimum ${MIN_AGE} lat.`)
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
        date_of_birth: dateOfBirth || null,
        region_id: regionId || null,
      })
      .eq('id', userId)
    if (err) {
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
        Data urodzenia (wymagane 18+)
        <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
        {dateOfBirth && !isAtLeast18(dateOfBirth) && <span style={{ color: 'var(--color-magenta)', marginLeft: 8, fontWeight: 600 }}>Min. 18 lat</span>}
      </label>
      <label>
        Region (ID – słownik w kolejnym kroku)
        <input type="number" value={regionId} onChange={(e) => setRegionId(e.target.value)} />
      </label>
      <button type="submit" className="btn btn--primary">Zapisz profil</button>
    </form>
  )
}
