import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { LISTING_CATEGORIES } from '../constants/categories'

export function BrandsManager() {
  const [selectedCategory, setSelectedCategory] = useState('')
  const [brands, setBrands] = useState([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (!supabase || !selectedCategory) {
      setBrands([])
      return
    }
    let cancelled = false
    async function fetchBrands() {
      setLoading(true)
      setError('')
      const { data, error: err } = await supabase
        .from('car_brands')
        .select('id, name, category')
        .eq('category', selectedCategory)
        .order('name')
      if (!cancelled) {
        if (err) {
          setError(err.message)
          setBrands([])
        } else {
          setBrands(data ?? [])
        }
        setLoading(false)
      }
    }
    fetchBrands()
    return () => { cancelled = true }
  }, [selectedCategory])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    const name = newName?.trim()
    if (!name) {
      setError('Podaj nazwę marki.')
      return
    }
    if (!selectedCategory) {
      setError('Wybierz kategorię.')
      return
    }
    if (!supabase) return
    const { error: err } = await supabase.from('car_brands').insert({ name, category: selectedCategory })
    if (err) {
      setError(err.message || 'Nie udało się dodać marki.')
      return
    }
    setNewName('')
    const { data } = await supabase.from('car_brands').select('id, name, category').eq('category', selectedCategory).order('name')
    if (data) setBrands(data)
  }

  async function handleDelete(brand) {
    setError('')
    setDeletingId(brand.id)
    const { data: listings } = await supabase.from('listings').select('id').eq('brand_id', brand.id).limit(1)
    if (listings?.length) {
      setError('Nie można usunąć – istnieją ogłoszenia z tą marką.')
      setDeletingId(null)
      return
    }
    const { error: err } = await supabase.from('car_brands').delete().eq('id', brand.id)
    setDeletingId(null)
    if (err) {
      setError(err.message || 'Nie udało się usunąć marki.')
      return
    }
    setBrands((prev) => prev.filter((b) => b.id !== brand.id))
  }

  const categoryLabel = LISTING_CATEGORIES.find((c) => c.value === selectedCategory)?.label || selectedCategory

  return (
    <div className="brands-manager">
      {error && <p className="msg--error" style={{ marginBottom: 16 }}>{error}</p>}
      <label>
        Kategoria
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          <option value="">Wybierz kategorię</option>
          {LISTING_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </label>

      {selectedCategory && (
        <>
          <form onSubmit={handleAdd} className="search-form" style={{ marginTop: 16, marginBottom: 16 }}>
            <label>
              Nowa marka ({categoryLabel})
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nazwa marki"
              />
            </label>
            <button type="submit" className="btn btn-sm">Dodaj markę</button>
          </form>

          {loading ? (
            <p className="loading">Ładowanie marek…</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Marka</th>
                    <th>Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((b) => (
                    <tr key={b.id}>
                      <td>{b.name}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-sm btn--danger"
                          onClick={() => handleDelete(b)}
                          disabled={deletingId === b.id}
                        >
                          {deletingId === b.id ? '…' : 'Usuń'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {brands.length === 0 && <p className="form-hint">Brak marek w tej kategorii. Dodaj pierwszą powyżej.</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
