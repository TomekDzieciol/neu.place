import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useFavoriteIds(userId) {
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const refetch = useCallback(() => setRefetchTrigger((t) => t + 1), [])

  useEffect(() => {
    if (!supabase || !userId) {
      setFavoriteIds(new Set())
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('favorites')
      .select('listing_id')
      .eq('user_id', userId)
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setFavoriteIds(new Set())
        } else {
          setFavoriteIds(new Set((data || []).map((r) => r.listing_id)))
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Błąd ładowania ulubionych')
          setFavoriteIds(new Set())
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, refetchTrigger])

  return { favoriteIds, loading, error, refetch }
}

function mapListingRow(r) {
  const photos = Array.isArray(r.listing_photos)
    ? [...r.listing_photos].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : []
  return {
    ...r,
    region_name: r.regions?.name,
    county_name: r.counties?.name,
    photo_url: photos[0]?.url || null,
  }
}

export function useFavorites(userId) {
  const [favoritesListings, setFavoritesListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refetchTrigger, setRefetchTrigger] = useState(0)

  const refetch = useCallback(() => setRefetchTrigger((t) => t + 1), [])

  useEffect(() => {
    if (!supabase || !userId) {
      setFavoritesListings([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    supabase
      .from('favorites')
      .select(`
        listing_id,
        created_at,
        listings (
          id, title, price, year, city, category, status,
          regions ( name ),
          counties ( name ),
          listing_photos ( url, sort_order )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) {
          setError(err.message)
          setFavoritesListings([])
        } else {
          const mapped = (data || [])
            .filter((row) => row.listings && row.listings.status === 'active')
            .map((row) => mapListingRow(row.listings))
          setFavoritesListings(mapped)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message || 'Błąd ładowania ulubionych')
          setFavoritesListings([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [userId, refetchTrigger])

  return { favoritesListings, loading, error, refetch }
}

export async function toggleFavorite(userId, listingId) {
  if (!supabase || !userId || !listingId) return
  const { data: existing } = await supabase
    .from('favorites')
    .select('listing_id')
    .eq('user_id', userId)
    .eq('listing_id', listingId)
    .maybeSingle()
  if (existing) {
    await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId)
  } else {
    await supabase
      .from('favorites')
      .insert({ user_id: userId, listing_id: listingId })
  }
}
