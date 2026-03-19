import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useListingDictionaries } from '../hooks/useListingDictionaries'
import { useCounties } from '../hooks/useCounties'
import { LISTING_CATEGORIES } from '../constants/categories'

export function ListingFiltersExtended({ redirectTo = '/szukaj' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [q, setQ] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('category') || '')
  const [region, setRegion] = useState(searchParams.get('region') || '')
  const [county, setCounty] = useState(searchParams.get('county') || '')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [fuel, setFuel] = useState(searchParams.get('fuel') || '')
  const [brand, setBrand] = useState(searchParams.get('brand') || '')
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') || '')
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') || '')
  const [yearMin, setYearMin] = useState(searchParams.get('yearMin') || '')
  const [yearMax, setYearMax] = useState(searchParams.get('yearMax') || '')
  const [engineCapacityMin, setEngineCapacityMin] = useState(searchParams.get('engineCapacityMin') || '')
  const [engineCapacityMax, setEngineCapacityMax] = useState(searchParams.get('engineCapacityMax') || '')
  const [gearbox, setGearbox] = useState(searchParams.get('gearbox') || '')
  const [brands, setBrands] = useState([])

  const { regions, fuels } = useListingDictionaries(null, undefined)
  const { counties } = useCounties(region || null)

  useEffect(() => {
    if (!supabase || !category) {
      setBrands([])
      return
    }
    let cancelled = false
    supabase
      .from('car_brands')
      .select('id, name')
      .eq('category', category)
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('[ListingFiltersExtended] Supabase query error while loading brands.', {
            category,
            error,
          })
        }
        if (!cancelled) setBrands(data ?? [])
      })
    return () => { cancelled = true }
  }, [category])

  function handleSubmit(e) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (category) params.set('category', category)
    if (region) params.set('region', region)
    if (county) params.set('county', county)
    if (city.trim()) params.set('city', city.trim())
    if (fuel) params.set('fuel', fuel)
    if (brand) params.set('brand', brand)
    if (priceMin) params.set('priceMin', priceMin)
    if (priceMax) params.set('priceMax', priceMax)
    if (yearMin) params.set('yearMin', yearMin)
    if (yearMax) params.set('yearMax', yearMax)
    if (engineCapacityMin) params.set('engineCapacityMin', engineCapacityMin)
    if (engineCapacityMax) params.set('engineCapacityMax', engineCapacityMax)
    if (gearbox) params.set('gearbox', gearbox)
    navigate(`${redirectTo}?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="search-form search-form--extended">
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
        Województwo
        <select value={region} onChange={(e) => { setRegion(e.target.value); setCounty('') }}>
          <option value="">Wszystkie</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>
      <label>
        Powiat
        <select value={county} onChange={(e) => setCounty(e.target.value)} disabled={!region}>
          <option value="">Wszystkie</option>
          {counties.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label>
        Miasto
        <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="np. Warszawa" />
      </label>
      <label>
        Paliwo
        <select value={fuel} onChange={(e) => setFuel(e.target.value)}>
          <option value="">Wszystkie</option>
          {fuels.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      </label>
      <label>
        Skrzynia biegów
        <select value={gearbox} onChange={(e) => setGearbox(e.target.value)}>
          <option value="">Wszystkie</option>
          <option value="Manualna">Manualna</option>
          <option value="Automatyczna">Automatyczna</option>
        </select>
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
      <label>
        Pojemność silnika od (cm³)
        <input
          type="number"
          value={engineCapacityMin}
          onChange={(e) => setEngineCapacityMin(e.target.value)}
          placeholder="1000"
          min={0}
        />
      </label>
      <label>
        Pojemność silnika do (cm³)
        <input
          type="number"
          value={engineCapacityMax}
          onChange={(e) => setEngineCapacityMax(e.target.value)}
          placeholder="3000"
          min={0}
        />
      </label>
      <button type="submit">Szukaj</button>
    </form>
  )
}
