import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

let supabase = null

if (!supabaseUrl || !supabaseAnonKey) {
  // Nie blokujemy całej aplikacji – tylko ostrzegamy w konsoli,
  // a reszta UI działa dalej (hooki sprawdzają !supabase).
  console.warn(
    '[Supabase] Missing env variables – Supabase client will not be initialized. ' +
      'Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env and your Vercel project settings.',
    { hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseAnonKey }
  )
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
  } catch (e) {
    console.error('[Supabase] Init error while creating client.', e)
    supabase = null
  }
}

export { supabase, supabaseUrl, supabaseAnonKey }
