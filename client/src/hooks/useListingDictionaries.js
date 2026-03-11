import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useListingDictionaries(brandId) {
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
        const [rRes, bRes] = await Promise.all([
          supabase.from('regions').select('id, name').order('name'),
          supabase.from('car_brands').select('id, name').order('name'),
        ])
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
  }, [])

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
