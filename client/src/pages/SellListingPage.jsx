import { useState, useEffect, useRef } from 'react'
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

  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  function processFiles(fileList) {
    const chosen = Array.from(fileList || [])
    const invalid = chosen.find(
      (f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE
    )
    if (invalid) {
      setError(
        `Plik "${invalid.name}" ma nieprawidłowy typ lub rozmiar (max 5 MB). Dozwolone: JPEG, PNG, WebP, GIF.`
      )
      setFiles([])
      return
    }
    setError('')
    setFiles(chosen)
  }

  function handleFileChange(e) {
    processFiles(e.target.files)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
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
        console.error('[SellListingPage] Supabase insert error while creating listing.', {
          userId: user.id,
          payload: {
            category,
            brandId,
            modelId,
            fuelId,
            bodyTypeId,
            colorId,
            regionId,
            countyId,
          },
          error: insertErr,
        })
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
          console.error('[SellListingPage] Supabase storage upload error while saving listing photo.', {
            listingId,
            path,
            error: uploadErr,
          })
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
          console.error('[SellListingPage] Supabase insert error while saving listing photo row.', {
            listingId,
            url: photoUrl,
            sortOrder: i,
            error: photoErr,
          })
          setError(`Błąd zapisu zdjęcia: ${photoErr.message}`)
          setSubmitting(false)
          return
        }
      }

      navigate('/?sprzedaj=ok', { replace: true })
    } catch (err) {
      console.error('[SellListingPage] Unexpected error while submitting listing form.', {
        error: err,
      })
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

      <section className="w-full max-w-full md:max-w-[33vw] mx-auto bg-white rounded-3xl p-8 sell-form-card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm font-medium">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-6 gap-x-6 gap-y-4">
            <div className="md:col-span-6 flex flex-nowrap gap-4 items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Kategoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="field-input w-full"
                >
                  <option value="">Wybierz kategorię</option>
                  {LISTING_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Marka *</label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  required
                  disabled={!category}
                  className="field-input field-input--disabled w-full"
                >
                  <option value="">{category ? 'Wybierz markę' : 'Wybierz najpierw kategorię'}</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Model *</label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  required
                  disabled={!brandId}
                  className="field-input field-input--disabled w-full"
                >
                  <option value="">Wybierz model</option>
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Paliwo *</label>
              <select
                value={fuelId}
                onChange={(e) => setFuelId(e.target.value)}
                required
                className="field-input"
              >
                <option value="">Wybierz paliwo</option>
                {fuels.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Kolor *</label>
              <select
                value={colorId}
                onChange={(e) => setColorId(e.target.value)}
                required
                className="field-input"
              >
                <option value="">Wybierz kolor</option>
                {colors.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Typ nadwozia *</label>
              <select
                value={bodyTypeId}
                onChange={(e) => setBodyTypeId(e.target.value)}
                required
                className="field-input"
              >
                <option value="">Wybierz typ nadwozia</option>
                {bodyTypes.map((bt) => (
                  <option key={bt.id} value={bt.id}>{bt.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6">
              <span className="block text-sm font-bold text-slate-700 mb-1 ml-1">Stan techniczny *</span>
              <div className="inline-flex rounded-xl p-1 sell-form-segmented" role="group">
                {['Nieuszkodzony', 'Uszkodzony'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTechnicalCondition(opt)}
                    className={`
                      px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                      ${technicalCondition === opt
                        ? 'sell-form-segmented-active'
                        : 'text-white/80 hover:text-white'
                      }
                    `}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-6">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Tytuł ogłoszenia *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="np. BMW 320d, stan bardzo dobry"
                required
                className="field-input field-input--full"
              />
            </div>

            <div className="md:col-span-6">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opisz pojazd, wyposażenie, historię serwisową..."
                className="field-input field-input--textarea field-input--full min-h-32 resize-y"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Cena (PLN) *</label>
              <input
                type="number"
                min={0}
                step={1}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                required
                className="field-input"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Rok *</label>
              <input
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2020"
                required
                className="field-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Przebieg (km)</label>
              <input
                type="number"
                min={0}
                value={mileageKm}
                onChange={(e) => setMileageKm(e.target.value)}
                placeholder="Opcjonalnie"
                className="field-input"
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">cm³</label>
              <input
                type="number"
                min={1}
                step={1}
                value={engineCapacityCc}
                onChange={(e) => setEngineCapacityCc(e.target.value)}
                placeholder="1998"
                className="field-input"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Województwo *</label>
              <select
                value={regionId}
                onChange={(e) => { setRegionId(e.target.value); setCountyId(''); }}
                required
                className="field-input"
              >
                <option value="">Wybierz województwo</option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Powiat *</label>
              <select
                value={countyId}
                onChange={(e) => setCountyId(e.target.value)}
                required
                disabled={!regionId}
                className="field-input field-input--disabled"
              >
                <option value="">Wybierz powiat</option>
                {counties.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Miasto (opcjonalnie)</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="np. Warszawa"
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1 ml-1">Zdjęcia</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFileChange}
              className="sr-only"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`sell-form-dropzone ${dragOver ? 'sell-form-dropzone--active' : ''}`}
            >
              <span className="flex w-12 h-12 items-center justify-center rounded-full bg-white/20 text-white text-2xl font-light leading-none">+</span>
              <span className="text-sm font-semibold text-white">Kliknij, aby dodać zdjęcia</span>
              {files.length > 0 && (
                <span className="text-xs text-white/80">Wybrano {files.length} plików</span>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              type="submit"
              disabled={submitting}
              className="sell-form-submit"
            >
              {submitting ? 'Zapisywanie…' : 'Wystaw ogłoszenie'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
