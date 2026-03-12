import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LISTING_CATEGORIES } from '../constants/categories'

export function ListingFilters({ redirectTo = '/ogloszenia' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [region, setRegion] = useState(searchParams.get('region') || '')
  const [brand, setBrand] = useState(searchParams.get('brand') || '')
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '')
  const [yearMin, setYearMin] = useState(searchParams.get('yearMin') || '')
  const [yearMax, setYearMax] = useState(searchParams.get('yearMax') || '')
  const [brands, setBrands] = useState([])

  useEffect(() => {
    if (!supabase || !category) {
      setBrands([])
      return
    }
    let cancelled = false
    supabase.from('car_brands').select('id, name').eq('category', category).order('name').then(({ data }) => {
      if (!cancelled) setBrands(data ?? [])
    })
    return () => { cancelled = true }
  }, [category])

  function handleSubmit(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (category) params.set('category', category)
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
        Kategoria
        <select value={category} onChange={(e) => { setCategory(e.target.value); setBrand('') }}>
          <option value="">Wszystkie</option>
          {LISTING_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Lokalizacja (region)
        <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="np. mazowieckie" />
      </label>
      <label>
        Marka
        <select value={brand} onChange={(e) => setBrand(e.target.value)} disabled={!category}>
          <option value="">{category ? 'Wszystkie' : 'Wybierz najpierw kategorię'}</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
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
