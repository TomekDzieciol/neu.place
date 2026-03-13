import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LISTING_CATEGORIES } from '../constants/categories'

export function ModelsManager() {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [brands, setBrands] = useState([])
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [models, setModels] = useState([])
  const [newModelName, setNewModelName] = useState('')
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (!supabase || !selectedCategory) {
      setBrands([])
      setSelectedBrandId('')
      return
    }
    let cancelled = false
    async function fetchBrands() {
      setLoadingBrands(true)
      setError('')
      const { data, error: err } = await supabase
        .from('car_brands')
        .select('id, name')
        .eq('category', selectedCategory)
        .order('name')
      if (!cancelled) {
        if (err) {
          console.error('[ModelsManager] Supabase query error while loading brands.', {
            selectedCategory,
            error: err,
          })
          setError(err.message)
          setBrands([])
          setSelectedBrandId('')
        } else {
          setBrands(data ?? [])
          // jeśli obecnie wybrana marka nie istnieje w nowej liście – zresetuj
          if (data && !data.find((b) => String(b.id) === String(selectedBrandId))) {
            setSelectedBrandId('')
          }
        }
        setLoadingBrands(false)
      }
    }
    fetchBrands()
    return () => { cancelled = true }
  }, [selectedCategory])

  useEffect(() => {
    if (!supabase || !selectedBrandId) {
      setModels([])
      return
    }
    let cancelled = false
    async function fetchModels() {
      setLoadingModels(true)
      setError('')
      const { data, error: err } = await supabase
        .from('car_models')
        .select('id, name')
        .eq('brand_id', selectedBrandId)
        .order('name')
      if (!cancelled) {
        if (err) {
          console.error('[ModelsManager] Supabase query error while loading models.', {
            selectedBrandId,
            error: err,
          })
          setError(err.message)
          setModels([])
        } else {
          setModels(data ?? [])
        }
        setLoadingModels(false)
      }
    }
    fetchModels()
    return () => { cancelled = true }
  }, [selectedBrandId])

  async function handleAddModel(e) {
    e.preventDefault()
    setError('')
    const name = newModelName?.trim()
    if (!selectedCategory) {
      setError('Wybierz kategorię.')
      return
    }
    if (!selectedBrandId) {
      setError('Wybierz markę.')
      return
    }
    if (!name) {
      setError('Podaj nazwę modelu.')
      return
    }
    if (!supabase) return
    const { error: err } = await supabase
      .from('car_models')
      .insert({ name, brand_id: Number(selectedBrandId) })
    if (err) {
      console.error('[ModelsManager] Supabase insert error while adding model.', {
        selectedBrandId,
        name,
        error: err,
      })
      setError(err.message || 'Nie udało się dodać modelu.')
      return
    }
    setNewModelName('')
    const { data } = await supabase
      .from('car_models')
      .select('id, name')
      .eq('brand_id', selectedBrandId)
      .order('name')
    if (data) setModels(data)
  }

  async function handleDelete(model) {
    setError('')
    setDeletingId(model.id)
    const { data: listings } = await supabase
      .from('listings')
      .select('id')
      .eq('model_id', model.id)
      .limit(1)
    if (listings?.length) {
      setError('Nie można usunąć – istnieją ogłoszenia z tym modelem.')
      setDeletingId(null)
      return
    }
    const { error: err } = await supabase
      .from('car_models')
      .delete()
      .eq('id', model.id)
    setDeletingId(null)
    if (err) {
      console.error('[ModelsManager] Supabase delete error while removing model.', {
        modelId: model.id,
        error: err,
      })
      setError(err.message || 'Nie udało się usunąć modelu.')
      return
    }
    setModels((prev) => prev.filter((m) => m.id !== model.id))
  }

  const categoryLabel = LISTING_CATEGORIES.find((c) => c.value === selectedCategory)?.label || selectedCategory
  const selectedBrand = brands.find((b) => String(b.id) === String(selectedBrandId))

  return (
    <div className="brands-manager">
      {error && <p className="msg--error" style={{ marginBottom: 16 }}>{error}</p>}

      <label>
        Kategoria
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value)
          }}
        >
          <option value="">Wybierz kategorię</option>
          {LISTING_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      {selectedCategory && (
        <>
          <label style={{ marginTop: 16, display: 'block' }}>
            Marka ({categoryLabel})
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              disabled={loadingBrands}
            >
              <option value="">Wybierz markę</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          {selectedBrandId && (
            <>
              <form
                onSubmit={handleAddModel}
                className="search-form"
                style={{ marginTop: 16, marginBottom: 16 }}
              >
                <label>
                  Nowy model ({selectedBrand?.name || 'wybrana marka'})
                  <input
                    type="text"
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="Nazwa modelu"
                  />
                </label>
                <button type="submit" className="btn btn-sm">
                  Dodaj model
                </button>
              </form>

              {loadingModels ? (
                <p className="loading">Ładowanie modeli…</p>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Model</th>
                        <th>Akcje</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map((m) => (
                        <tr key={m.id}>
                          <td>{m.name}</td>
                          <td>
                            <button
                              type="button"
                              className="btn-sm btn--danger"
                              onClick={() => handleDelete(m)}
                              disabled={deletingId === m.id}
                            >
                              {deletingId === m.id ? '…' : 'Usuń'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {models.length === 0 && (
                    <p className="form-hint">
                      Brak modeli dla tej marki. Dodaj pierwszy powyżej.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

