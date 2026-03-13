import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Missing env variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env or Vercel project settings.',
    { hasUrl: !!supabaseUrl, hasAnonKey: !!supabaseAnonKey }
  )
}

let supabase
try {
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} catch (e) {
  console.error('[Supabase] Init error while creating client.', e)
  supabase = null
}

export { supabase }
