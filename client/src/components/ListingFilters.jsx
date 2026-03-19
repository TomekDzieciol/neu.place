import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useListingDictionaries } from '../hooks/useListingDictionaries'

export function ListingFilters({ redirectTo = '/ogloszenia' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [region, setRegion] = useState(searchParams.get('region') || '')

  const { regions } = useListingDictionaries(null, undefined)

  function handleSubmit(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (region) params.set('region', region)
    navigate(`${redirectTo}?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <label>
        Szukaj (tytuł, tagi)
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="np. BMW 320d, wnętrze, diesel"
        />
      </label>
      <label>
        Województwo
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">Wszystkie</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>
      <button type="submit">Szukaj</button>
    </form>
  )
}
