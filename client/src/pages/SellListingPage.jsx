import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useListingDictionaries } from '../hooks/useListingDictionaries'
import { useCounties } from '../hooks/useCounties'
import { supabase } from '../lib/supabase'
import { LISTING_CATEGORIES } from '../constants/categories'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function SellListingPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [fuelId, setFuelId] = useState('')
  const [bodyTypeId, setBodyTypeId] = useState('')
  const [colorId, setColorId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [year, setYear] = useState('')
  const [mileageKm, setMileageKm] = useState('')
  const [engineCapacityCc, setEngineCapacityCc] = useState('')
  const [regionId, setRegionId] = useState('')
  const [countyId, setCountyId] = useState('')
  const [city, setCity] = useState('')
  const [technicalCondition, setTechnicalCondition] = useState('Nieuszkodzony')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { user, profile } = useAuth()
  const { regions, brands, models, fuels, bodyTypes, colors, loading: dictLoading } = useListingDictionaries(brandId, category || undefined)
  const { counties } = useCounties(regionId || null)

  useEffect(() => {
    setModelId('')
  }, [brandId])
  useEffect(() => {
    setBrandId('')
    setModelId('')
  }, [category])
  // Prefill lokalizacji z profilu użytkownika (tylko przy pierwszym wejściu)
  useEffect(() => {
    if (!profile || regionId !== '' || countyId !== '') return
    if (profile.region_id) setRegionId(String(profile.region_id))
    if (profile.county_id) setCountyId(String(profile.county_id))
    if (profile.city) setCity(profile.city)
  }, [profile])

  function handleFileChange(e) {
    const chosen = Array.from(e.target.files || [])
    const invalid = chosen.find(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE
    )
    if (invalid) {
      setError(
        `Plik "${invalid.name}" ma nieprawidłowy typ lub rozmiar (max 5 MB). Dozwolone: JPEG, PNG, WebP, GIF.`
      )
      setFiles([])
      e.target.value = ''
      return
    }
    setError('')
    setFiles(chosen)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const currentYear = new Date().getFullYear()
    if (!category) {
      setError('Wybierz kategorię ogłoszenia.')
      return
    }
    if (!title?.trim()) {
      setError('Podaj tytuł ogłoszenia.')
      return
    }
    if (!brandId || !modelId) {
      setError('Wybierz markę i model.')
      return
    }
    if (!fuelId) {
      setError('Wybierz rodzaj paliwa.')
      return
    }
    if (!bodyTypeId) {
      setError('Wybierz typ nadwozia.')
      return
    }
    if (!colorId) {
      setError('Wybierz kolor.')
      return
    }
    if (!technicalCondition) {
      setError('Wybierz stan techniczny.')
      return
    }
    const priceNum = Number(price)
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setError('Podaj prawidłową cenę (PLN).')
      return
    }
    const yearNum = Number(year)
    if (
      Number.isNaN(yearNum) ||
      yearNum < 1900 ||
      yearNum > currentYear + 1
    ) {
      setError(`Podaj rok produkcji (1900–${currentYear + 1}).`)
      return
    }
    if (mileageKm !== '' && (Number(mileageKm) < 0 || Number.isNaN(Number(mileageKm)))) {
      setError('Przebieg musi być liczbą nieujemną.')
      return
    }
    if (
      engineCapacityCc !== '' &&
      (Number.isNaN(Number(engineCapacityCc)) || Number(engineCapacityCc) <= 0)
    ) {
      setError('Pojemność silnika musi być dodatnią liczbą.')
      return
    }
    if (!regionId || !countyId) {
      setError('Wybierz województwo i powiat.')
      return
    }
    if (!supabase || !user) {
      setError('Brak połączenia lub niezalogowany użytkownik.')
      return
    }

    setSubmitting(true)
    try {
      const { data: inserted, error: insertErr } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          category,
          brand_id: Number(brandId),
          model_id: Number(modelId),
          fuel_id: Number(fuelId),
          body_type_id: Number(bodyTypeId),
          color_id: Number(colorId),
          title: title.trim(),
          description: description.trim() || null,
          price: priceNum,
          year: yearNum,
          mileage_km: mileageKm === '' ? null : Number(mileageKm),
          engine_capacity_cc: engineCapacityCc === '' ? null : Number(engineCapacityCc),
          region_id: Number(regionId),
          county_id: countyId === '' ? null : Number(countyId),
          city: city.trim() || null,
          technical_condition: technicalCondition,
          status: 'active',
        })
        .select('id')
        .single()

      if (insertErr) {
        setError(insertErr.message || 'Błąd zapisu ogłoszenia.')
        setSubmitting(false)
        return
      }

      const listingId = inserted.id

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = file.name.split('.').pop() || 'jpg'
        const safeName = `${i}-${Date.now()}.${ext}`
        const path = `${user.id}/${listingId}/${safeName}`
        const { error: uploadErr } = await supabase.storage
          .from('listing-photos')
          .upload(path, file, { cacheControl: '3600', upsert: false })

        if (uploadErr) {
          setError(`Błąd wgrywania zdjęcia: ${uploadErr.message}`)
          setSubmitting(false)
          return
        }

        const { data: urlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(path)
        const photoUrl = urlData.publicUrl

        const { error: photoErr } = await supabase.from('listing_photos').insert({
          listing_id: listingId,
          url: photoUrl,
          sort_order: i,
        })
        if (photoErr) {
          setError(`Błąd zapisu zdjęcia: ${photoErr.message}`)
          setSubmitting(false)
          return
        }
      }

      navigate('/?sprzedaj=ok', { replace: true })
    } catch (err) {
      setError(err.message || 'Wystąpił błąd.')
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    if (supabase) await supabase.auth.signOut()
  }

  if (dictLoading) {
    return (
      <div className="layout layout--narrow">
        <header className="page-header">
          <h1>Wystaw ogłoszenie</h1>
          <nav>
            <Link to="/">Strona główna</Link>
            {user && (
              <>
                <Link to="/dashboard">Moje konto</Link>
                <button type="button" className="btn-link" onClick={handleSignOut}>Wyloguj</button>
              </>
            )}
          </nav>
        </header>
        <p className="loading">Ładowanie formularza…</p>
      </div>
    )
  }

  return (
    <div className="layout layout--narrow">
      <header className="page-header">
        <h1>Wystaw ogłoszenie</h1>
        <nav>
          <Link to="/">Strona główna</Link>
          {user && (
            <>
              <Link to="/dashboard">Moje konto</Link>
              <button type="button" className="btn-link" onClick={handleSignOut}>Wyloguj</button>
            </>
          )}
        </nav>
      </header>

      <section className="form-block section">
        <form onSubmit={handleSubmit} className="search-form">
          {error && <p className="msg--error">{error}</p>}

          <label>
            Kategoria *
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Wybierz kategorię</option>
              {LISTING_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Marka *
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              required
              disabled={!category}
            >
              <option value="">{category ? 'Wybierz markę' : 'Wybierz najpierw kategorię'}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Model *
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              required
              disabled={!brandId}
            >
              <option value="">Wybierz model</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Paliwo *
            <select
              value={fuelId}
              onChange={(e) => setFuelId(e.target.value)}
              required
            >
              <option value="">Wybierz paliwo</option>
              {fuels.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Kolor *
            <select
              value={colorId}
              onChange={(e) => setColorId(e.target.value)}
              required
            >
              <option value="">Wybierz kolor</option>
              {colors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Stan techniczny *
            <div className="toggle-group">
              <button
                type="button"
                className={
                  technicalCondition === 'Nieuszkodzony'
                    ? 'toggle-btn toggle-btn--active'
                    : 'toggle-btn'
                }
                onClick={() => setTechnicalCondition('Nieuszkodzony')}
              >
                Nieuszkodzony
              </button>
              <button
                type="button"
                className={
                  technicalCondition === 'Uszkodzony'
                    ? 'toggle-btn toggle-btn--active'
                    : 'toggle-btn'
                }
                onClick={() => setTechnicalCondition('Uszkodzony')}
              >
                Uszkodzony
              </button>
            </div>
          </label>

          <label>
            Typ nadwozia *
            <select
              value={bodyTypeId}
              onChange={(e) => setBodyTypeId(e.target.value)}
              required
            >
              <option value="">Wybierz typ nadwozia</option>
              {bodyTypes.map((bt) => (
                <option key={bt.id} value={bt.id}>
                  {bt.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tytuł ogłoszenia *
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. BMW 320d, stan bardzo dobry"
              required
            />
          </label>

          <label>
            Opis
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Opis pojazdu, wyposażenie, historia..."
              rows={4}
            />
          </label>

          <label>
            Cena (PLN) *
            <input
              type="number"
              min={0}
              step={1}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              required
            />
          </label>

          <label>
            Rok produkcji *
            <input
              type="number"
              min={1900}
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="np. 2020"
              required
            />
          </label>

        <label>
          Przebieg (km)
          <input
            type="number"
            min={0}
            value={mileageKm}
            onChange={(e) => setMileageKm(e.target.value)}
            placeholder="opcjonalnie"
          />
        </label>

        <label>
          Pojemność silnika (cm³)
          <input
            type="number"
            min={1}
            step={1}
            value={engineCapacityCc}
            onChange={(e) => setEngineCapacityCc(e.target.value)}
            placeholder="np. 1998"
          />
        </label>

          <label>
            Województwo *
            <select
              value={regionId}
              onChange={(e) => { setRegionId(e.target.value); setCountyId(''); }}
              required
            >
              <option value="">Wybierz województwo</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Powiat *
            <select
              value={countyId}
              onChange={(e) => setCountyId(e.target.value)}
              required
              disabled={!regionId}
            >
              <option value="">Wybierz powiat</option>
              {counties.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Miasto (opcjonalnie)
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="np. Warszawa, dzielnica"
            />
          </label>

          <label>
            Zdjęcia (max 5 MB każde, JPEG/PNG/WebP/GIF)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileChange}
            />
            {files.length > 0 && (
              <span className="form-hint">
                Wybrano {files.length} plików.
              </span>
            )}
          </label>

          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Zapisywanie…' : 'Wystaw ogłoszenie'}
          </button>
        </form>
      </section>
    </div>
  )
}
