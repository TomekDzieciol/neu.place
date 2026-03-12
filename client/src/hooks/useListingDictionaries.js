import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useListingDictionaries(brandId, category) {
  const [regions, setRegions] = useState([])
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetchRegionsAndBrands() {
      try {
        const regionsQuery = supabase.from('regions').select('id, name').order('name')
        const brandsQuery = category
          ? supabase.from('car_brands').select('id, name').eq('category', category).order('name')
          : supabase.from('car_brands').select('id, name').order('name')
        const [rRes, bRes] = await Promise.all([regionsQuery, brandsQuery])
        if (!cancelled) {
          setRegions(rRes.data ?? [])
          setBrands(bRes.data ?? [])
        }
      } catch (_) {
        if (!cancelled) {
          setRegions([])
          setBrands([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchRegionsAndBrands()
    return () => { cancelled = true }
  }, [category])

  useEffect(() => {
    if (!supabase || !brandId) {
      setModels([])
      return
    }
    let cancelled = false
    async function fetchModels() {
      try {
        const { data } = await supabase
          .from('car_models')
          .select('id, name')
          .eq('brand_id', brandId)
          .order('name')
        if (!cancelled) setModels(data ?? [])
      } catch (_) {
        if (!cancelled) setModels([])
      }
    }
    fetchModels()
    return () => { cancelled = true }
  }, [brandId])

  return { regions, brands, models, loading }
}
