import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useCounties(regionId) {
  const [counties, setCounties] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!supabase || !regionId) {
      setCounties([])
      return
    }
    let cancelled = false
    setLoading(true)
    supabase
      .from('counties')
      .select('id, name')
      .eq('region_id', regionId)
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('[useCounties] Supabase query error while loading counties.', {
            regionId,
            error,
          })
        }
        if (!cancelled) {
          setCounties(data ?? [])
          setLoading(false)
        }
      })
      .catch((e) => {
        console.error('[useCounties] Unexpected error while loading counties.', {
          regionId,
          error: e,
        })
        if (!cancelled) {
          setCounties([])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [regionId])

  return { counties, loading }
}
