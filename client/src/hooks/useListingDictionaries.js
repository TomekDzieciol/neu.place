import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useListingDictionaries(brandId, category) {
  const [regions, setRegions] = useState([])
  const [brands, setBrands] = useState([])
  const [models, setModels] = useState([])
  const [fuels, setFuels] = useState([])
  const [bodyTypes, setBodyTypes] = useState([])
  const [colors, setColors] = useState([])
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
        const fuelsQuery = supabase.from('fuels').select('id, name').order('name')
        const bodyTypesQuery = supabase.from('body_types').select('id, name').order('name')
        const colorsQuery = supabase.from('colors').select('id, name').order('name')
        const brandsQuery = category
          ? supabase.from('car_brands').select('id, name').eq('category', category).order('name')
          : supabase.from('car_brands').select('id, name').order('name')
        const [rRes, fRes, btRes, cRes, bRes] = await Promise.all([regionsQuery, fuelsQuery, bodyTypesQuery, colorsQuery, brandsQuery])
        if (!cancelled) {
          setRegions(rRes.data ?? [])
          setFuels(fRes.data ?? [])
          setBodyTypes(btRes.data ?? [])
          setColors(cRes.data ?? [])
          setBrands(bRes.data ?? [])
        }
      } catch (_) {
        if (!cancelled) {
          setRegions([])
          setFuels([])
          setBodyTypes([])
          setColors([])
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

  return { regions, brands, models, fuels, bodyTypes, colors, loading }
}
