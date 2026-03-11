import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useListingDictionaries } from '../hooks/useListingDictionaries'
import { supabase } from '../lib/supabase'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function SellListingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [brandId, setBrandId] = useState('')
  const [modelId, setModelId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [year, setYear] = useState('')
  const [mileageKm, setMileageKm] = useState('')
  const [regionId, setRegionId] = useState('')
  const [city, setCity] = useState('')
  const [files, setFiles] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { regions, brands, models, loading: dictLoading } = useListingDictionaries(brandId)

  useEffect(() => {
    setModelId('')
  }, [brandId])

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
    if (!title?.trim()) {
      setError('Podaj tytuł ogłoszenia.')
      return
    }
    if (!brandId || !modelId) {
      setError('Wybierz markę i model.')
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
          brand_id: Number(brandId),
          model_id: Number(modelId),
          title: title.trim(),
          description: description.trim() || null,
          price: priceNum,
          year: yearNum,
          mileage_km: mileageKm === '' ? null : Number(mileageKm),
          region_id: regionId === '' ? null : Number(regionId),
          city: city.trim() || null,
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

  if (dictLoading) {
    return (
      <div className="layout layout--narrow">
        <header className="page-header">
          <h1>Wystaw ogłoszenie</h1>
          <Link to="/">Strona główna</Link>
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
        </nav>
      </header>

      <section className="form-block section">
        <form onSubmit={handleSubmit} className="search-form">
          {error && <p className="msg--error">{error}</p>}

          <label>
            Marka *
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              required
            >
              <option value="">Wybierz markę</option>
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
            Region
            <select
              value={regionId}
              onChange={(e) => setRegionId(e.target.value)}
            >
              <option value="">Wybierz region</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Miasto
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="opcjonalnie"
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
