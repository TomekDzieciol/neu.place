import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id).then(setProfile).catch(() => setProfile(null))
        else setProfile(null)
        setLoading(false)
      })
      .catch(() => {
        setUser(null)
        setProfile(null)
        setLoading(false)
      })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id).then(setProfile).catch(() => setProfile(null))
      else setProfile(null)
    })
    return () => subscription?.unsubscribe?.()
  }, [])

  return { user, profile, loading }
}

async function fetchProfile(userId) {
  if (!supabase) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) throw error
  return data
}
