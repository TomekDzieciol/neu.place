import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'

const app = express()
const PORT = process.env.PORT || 3000

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }))
app.use(express.json())

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.' },
})
app.use('/api/auth', authLimiter)

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Brak tokenu.' })
  const token = authHeader.slice(7)
  supabase.auth.getUser(token).then(({ data: { user }, error }) => {
    if (error || !user) return res.status(401).json({ error: 'Nieprawidłowy token.' })
    req.user = user
    next()
  }).catch(() => res.status(401).json({ error: 'Błąd autoryzacji.' }))
}

async function requireAdmin(req, res, next) {
  const { data: profile } = await supabase.from('profiles').select('role, is_blocked').eq('id', req.user.id).single()
  if (!profile || profile.is_blocked || !['admin', 'superadmin'].includes(profile.role)) return res.status(403).json({ error: 'Brak uprawnień.' })
  next()
}

const MIN_AGE = 18
function isAtLeast18(dateOfBirth) {
  if (!dateOfBirth) return true
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= MIN_AGE
}

app.get('/api/health', (req, res) => res.json({ ok: true }))

app.patch('/api/profile', requireAuth, async (req, res) => {
  const { display_name, phone, date_of_birth, region_id } = req.body
  if (date_of_birth && !isAtLeast18(date_of_birth)) return res.status(400).json({ error: 'Wymagany wiek: minimum 18 lat.' })
  const updates = {}
  if (display_name !== undefined) updates.display_name = display_name
  if (phone !== undefined) updates.phone = phone
  if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth
  if (region_id !== undefined) updates.region_id = region_id
  const { data, error } = await supabase.from('profiles').update(updates).eq('id', req.user.id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('id, email, display_name, role, is_blocked, created_at').order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

app.patch('/api/admin/users/:id/block', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { is_blocked } = req.body
  if (typeof is_blocked !== 'boolean') return res.status(400).json({ error: 'is_blocked musi być boolean.' })
  const { data, error } = await supabase.from('profiles').update({ is_blocked }).eq('id', id).select().single()
  if (error) return res.status(400).json({ error: error.message })
  res.json(data)
})

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  if (id === req.user.id) return res.status(400).json({ error: 'Nie możesz usunąć własnego konta.' })
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) {
    if (error.message?.includes('User not found') || error.status === 404) return res.status(404).json({ error: 'Użytkownik nie istnieje.' })
    return res.status(400).json({ error: error.message || 'Nie udało się usunąć konta.' })
  }
  res.status(204).send()
})

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`))
