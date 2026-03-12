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
      .then(({ data }) => {
        if (!cancelled) {
          setCounties(data ?? [])
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCounties([])
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [regionId])

  return { counties, loading }
}
