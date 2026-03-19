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
    const searchQ = (filters.q && filters.q.trim()) ? filters.q.trim() : null

    async function fetch_() {
      try {
        let listingIds = null
        if (searchQ) {
          const { data: idRows, error: rpcError } = await supabase.rpc('search_listings', {
            p_search: searchQ,
            p_region_id: filters.region || null,
            p_county_id: filters.county || null,
            p_city: (filters.city && filters.city.trim()) || null,
            p_brand_id: filters.brand || null,
            p_fuel_id: filters.fuel ? Number(filters.fuel) : null,
            p_gearbox: (filters.gearbox && ['Manualna', 'Automatyczna'].includes(filters.gearbox)) ? filters.gearbox : null,
            p_price_min: filters.priceMin ? Number(filters.priceMin) : null,
            p_price_max: filters.priceMax ? Number(filters.priceMax) : null,
            p_year_min: filters.yearMin ? Number(filters.yearMin) : null,
            p_year_max: filters.yearMax ? Number(filters.yearMax) : null,
            p_engine_min: filters.engineCapacityMin ? Number(filters.engineCapacityMin) : null,
            p_engine_max: filters.engineCapacityMax ? Number(filters.engineCapacityMax) : null,
            p_category: (filters.category && filters.category.trim()) || null,
          })
          if (rpcError) {
            console.error('[useListingsSearch] RPC search_listings error.', { filters, error: rpcError })
            if (!cancelled) setListings([])
            return
          }
          listingIds = (idRows || []).map((r) => r.listing_id)
          if (listingIds.length === 0) {
            if (!cancelled) setListings([])
            return
          }
        }

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

        if (listingIds) {
          q = q.in('id', listingIds)
        } else {
          if (filters.region) q = q.eq('region_id', filters.region)
          if (filters.county) q = q.eq('county_id', filters.county)
          if (filters.city?.trim()) q = q.ilike('city', `%${filters.city.trim()}%`)
          if (filters.brand) q = q.eq('brand_id', filters.brand)
          if (filters.fuel) q = q.eq('fuel_id', Number(filters.fuel))
          if (filters.gearbox && ['Manualna', 'Automatyczna'].includes(filters.gearbox)) {
            q = q.eq('gearbox', filters.gearbox)
          }
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
        }

        const { data, error } = await q.limit(100)
        if (!cancelled) {
          if (error) {
            console.error('[useListingsSearch] Supabase query error while searching listings.', {
              filters,
              error,
            })
            setListings([])
          } else {
            let list = data || []
            if (listingIds && listingIds.length > 0) {
              const orderMap = new Map(listingIds.map((id, i) => [id, i]))
              list = [...list].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0))
            }
            const mapped = list.map((r) => {
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
      } catch (e) {
        console.error('[useListingsSearch] Unexpected error while searching listings.', {
          filters,
          error: e,
        })
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
