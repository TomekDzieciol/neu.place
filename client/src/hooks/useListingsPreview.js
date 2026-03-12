import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useListingsPreview(limit = 12) {
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
        const { data, error } = await supabase
          .from('listings')
          .select(`
            id, title, price, year, city, category,
            regions ( name ),
            counties ( name ),
            listing_photos ( url, sort_order )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(limit)
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
  }, [limit])

  return { listings, loading }
}
