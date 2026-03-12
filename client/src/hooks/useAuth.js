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
        // #region agent log
        const uid = session?.user?.id; if (uid) fetch('http://127.0.0.1:7273/ingest/65417a7f-0a10-4c8c-9baa-f3ced7ad1ff3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69178f'},body:JSON.stringify({sessionId:'69178f',location:'useAuth.js:getSession',message:'session user id',data:{userId:uid,email:session?.user?.email},timestamp:Date.now(),hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        if (session?.user) ensureProfileThenFetch(session.user).then(setProfile).catch(() => setProfile(null))
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
      if (session?.user) ensureProfileThenFetch(session.user).then(setProfile).catch(() => setProfile(null))
      else setProfile(null)
    })
    return () => subscription?.unsubscribe?.()
  }, [])

  return { user, profile, loading }
}

async function ensureProfileThenFetch(user) {
  if (!supabase || !user?.id) return null
  const { data: existing, error: fetchError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  // #region agent log
  fetch('http://127.0.0.1:7273/ingest/65417a7f-0a10-4c8c-9baa-f3ced7ad1ff3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'69178f'},body:JSON.stringify({sessionId:'69178f',location:'useAuth.js:ensureProfileThenFetch',message:'profile fetch result',data:{userId:user.id,role:existing?.role,hasData:!!existing,error:fetchError?.message},timestamp:Date.now(),hypothesisId:'H1,H2,H3,H5'})}).catch(()=>{});
  // #endregion
  if (fetchError) throw fetchError
  if (existing) return existing
  const { error: insertError } = await supabase.from('profiles').insert({ id: user.id, email: user.email ?? null, role: 'user' })
  if (insertError) throw insertError
  const { data: created, error: refetchError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (refetchError) throw refetchError
  return created
}
