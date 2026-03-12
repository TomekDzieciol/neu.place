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
            regions ( name ),
            counties ( name ),
            listing_photos ( url, sort_order )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (filters.region) q = q.eq('region_id', filters.region)
        if (filters.county) q = q.eq('county_id', filters.county)
        if (filters.city?.trim()) q = q.ilike('city', `%${filters.city.trim()}%`)
        if (filters.brand) q = q.eq('brand_id', filters.brand)
        if (filters.fuel) q = q.eq('fuel_id', Number(filters.fuel))
        if (filters.priceMin) q = q.gte('price', Number(filters.priceMin))
        if (filters.priceMax) q = q.lte('price', Number(filters.priceMax))
        if (filters.yearMin) q = q.gte('year', Number(filters.yearMin))
        if (filters.yearMax) q = q.lte('year', Number(filters.yearMax))
        if (filters.engineCapacityMin) {
          q = q.gte('engine_capacity_cc', Number(filters.engineCapacityMin))
        }
        if (filters.engineCapacityMax) {
          q = q.lte('engine_capacity_cc', Number(filters.engineCapacityMax))
        }
        if (filters.category) q = q.eq('category', filters.category)

        const { data, error } = await q.limit(100)
        if (!cancelled) {
          if (error) {
            setListings([])
          } else {
            const mapped = (data || []).map((r) => {
              const photos = Array.isArray(r.listing_photos)
                ? [...r.listing_photos].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                : []
              return {
                ...r,
                region_name: r.regions?.name,
                county_name: r.counties?.name,
                photo_url: photos[0]?.url || null,
              }
            })
            setListings(mapped)
          }
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
