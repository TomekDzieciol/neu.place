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
            regions ( name )
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(limit)
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
  }, [limit])

  return { listings, loading }
}
