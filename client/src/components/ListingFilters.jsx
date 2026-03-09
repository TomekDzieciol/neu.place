import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function ListingFilters({ redirectTo = '/ogloszenia' }) {
  const navigate = useNavigate()
  const [region, setRegion] = useState('')
  const [brand, setBrand] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [yearMin, setYearMin] = useState('')
  const [yearMax, setYearMax] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (region) params.set('region', region)
    if (brand) params.set('brand', brand)
    if (priceMin) params.set('priceMin', priceMin)
    if (priceMax) params.set('priceMax', priceMax)
    if (yearMin) params.set('yearMin', yearMin)
    if (yearMax) params.set('yearMax', yearMax)
    navigate(`${redirectTo}?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <label>
        Lokalizacja (region)
        <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="np. mazowieckie" />
      </label>
      <label>
        Marka
        <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="np. BMW" />
      </label>
      <label>
        Cena od
        <input type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} placeholder="0" min={0} />
      </label>
      <label>
        Cena do
        <input type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} placeholder="500000" min={0} />
      </label>
      <label>
        Rok od
        <input type="number" value={yearMin} onChange={(e) => setYearMin(e.target.value)} placeholder="2000" min={1900} />
      </label>
      <label>
        Rok do
        <input type="number" value={yearMax} onChange={(e) => setYearMax(e.target.value)} placeholder="2024" min={1900} />
      </label>
      <button type="submit">Szukaj</button>
    </form>
  )
}
