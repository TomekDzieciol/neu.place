import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useListingsSearch(filters = {}) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    async function fetch_() {
      try {
        let q = supabase
          .from('listings')
          .select(`
            id, title, price, year, city, category,
            regions ( name )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (filters.region) q = q.eq('region_id', filters.region)
        if (filters.brand) q = q.eq('brand_id', filters.brand)
        if (filters.priceMin) q = q.gte('price', Number(filters.priceMin))
        if (filters.priceMax) q = q.lte('price', Number(filters.priceMax))
        if (filters.yearMin) q = q.gte('year', Number(filters.yearMin))
        if (filters.yearMax) q = q.lte('year', Number(filters.yearMax))
        if (filters.category) q = q.eq('category', filters.category)

        const { data, error } = await q.limit(100)
        if (!cancelled) {
          if (error) setListings([])
          else setListings((data || []).map((r) => ({ ...r, region_name: r.regions?.name })))
        }
      } catch (_) {
        if (!cancelled) setListings([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch_()
    return () => { cancelled = true }
  }, [JSON.stringify(filters)])

  return { listings, loading }
}
