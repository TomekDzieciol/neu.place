// Edge Function: masowy import ogłoszeń (bulk import).
// Wywołanie: POST z body { listings: BulkListingItem[] }.
// Wymaga: token użytkownika (z `user.id`) lub klucz `service_role` (admin).
// Wszystkie ogłoszenia są przypisywane do: user.id albo do stałego admin ID gdy rola = service_role.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CATEGORIES = ['cars', 'construction', 'motorcycles_scooters', 'trailers', 'vans', 'trucks', 'other'] as const
const TECHNICAL_CONDITIONS = ['Nieuszkodzony', 'Uszkodzony'] as const
const GEARBOXES = ['Manualna', 'Automatyczna'] as const
const STATUSES = ['active', 'hidden', 'closed'] as const
const MAX_LISTINGS_PER_REQUEST = 100
const BATCH_SIZE = 50
const SERVICE_ROLE_ADMIN_USER_ID = '06b66064-715b-4445-906a-2406f97186d0'

interface BulkListingItem {
  brand_id: number
  model_id: number
  title: string
  description?: string | null
  price: number
  year: number
  mileage_km?: number | null
  region_id?: number | null
  county_id?: number | null
  city?: string | null
  category?: string | null
  fuel_id?: number | null
  body_type_id?: number | null
  color_id?: number | null
  engine_capacity_cc?: number | null
  technical_condition?: string | null
  gearbox?: string | null
  status?: string | null
  photos?: string[] | null
}

interface ReqBody {
  listings?: BulkListingItem[]
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function validateItem(item: unknown, index: number): { row: BulkListingItem; error?: string } {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    return { row: null!, error: `[${index}] listings[] musi być obiektem` }
  }
  const o = item as Record<string, unknown>
  const brandId = o.brand_id != null ? Number(o.brand_id) : NaN
  const modelId = o.model_id != null ? Number(o.model_id) : NaN
  const price = o.price != null ? Number(o.price) : NaN
  const year = o.year != null ? Number(o.year) : NaN
  if (Number.isNaN(brandId) || brandId < 1) return { row: null!, error: `[${index}] brand_id wymagane (liczba > 0)` }
  if (Number.isNaN(modelId) || modelId < 1) return { row: null!, error: `[${index}] model_id wymagane (liczba > 0)` }
  const title = typeof o.title === 'string' ? o.title.trim() : ''
  if (!title) return { row: null!, error: `[${index}] title wymagane` }
  if (Number.isNaN(price) || price < 0) return { row: null!, error: `[${index}] price wymagane (liczba >= 0)` }
  const currentYear = new Date().getFullYear()
  if (Number.isNaN(year) || year < 1900 || year > currentYear + 1) {
    return { row: null!, error: `[${index}] year wymagane (1900–${currentYear + 1})` }
  }
  const category = typeof o.category === 'string' && CATEGORIES.includes(o.category as any)
    ? o.category
    : 'cars'
  if (o.technical_condition != null && !TECHNICAL_CONDITIONS.includes(o.technical_condition as any)) {
    return { row: null!, error: `[${index}] technical_condition: Nieuszkodzony lub Uszkodzony` }
  }
  if (o.gearbox != null && !GEARBOXES.includes(o.gearbox as any)) {
    return { row: null!, error: `[${index}] gearbox: Manualna lub Automatyczna` }
  }
  if (o.status != null && !STATUSES.includes(o.status as any)) {
    return { row: null!, error: `[${index}] status: active, hidden lub closed` }
  }
  const mileageKm = o.mileage_km != null && o.mileage_km !== '' ? Number(o.mileage_km) : null
  if (mileageKm != null && (Number.isNaN(mileageKm) || mileageKm < 0)) {
    return { row: null!, error: `[${index}] mileage_km musi być liczbą >= 0` }
  }
  const engineCapacityCc = o.engine_capacity_cc != null && o.engine_capacity_cc !== '' ? Number(o.engine_capacity_cc) : null
  if (engineCapacityCc != null && (Number.isNaN(engineCapacityCc) || engineCapacityCc <= 0)) {
    return { row: null!, error: `[${index}] engine_capacity_cc musi być liczbą > 0` }
  }
  let photos: string[] | null = null
  if (Array.isArray(o.photos)) {
    photos = o.photos.filter((u): u is string => typeof u === 'string' && u.length > 0)
  }
  const row: BulkListingItem = {
    brand_id: brandId,
    model_id: modelId,
    title,
    description: typeof o.description === 'string' ? o.description.trim() || null : null,
    price,
    year,
    mileage_km: mileageKm ?? null,
    region_id: o.region_id != null && o.region_id !== '' ? Number(o.region_id) : null,
    county_id: o.county_id != null && o.county_id !== '' ? Number(o.county_id) : null,
    city: typeof o.city === 'string' ? o.city.trim() || null : null,
    category,
    fuel_id: o.fuel_id != null && o.fuel_id !== '' ? Number(o.fuel_id) : null,
    body_type_id: o.body_type_id != null && o.body_type_id !== '' ? Number(o.body_type_id) : null,
    color_id: o.color_id != null && o.color_id !== '' ? Number(o.color_id) : null,
    engine_capacity_cc: engineCapacityCc,
    technical_condition: o.technical_condition != null ? (o.technical_condition as string) : null,
    gearbox: o.gearbox != null ? (o.gearbox as string) : null,
    status: o.status != null ? (o.status as string) : 'active',
    photos: photos && photos.length > 0 ? photos : null,
  }
  return { row }
}

function decodeJwtRole(token: string): string | null {
  // Supabase JWT: header.payload.signature (payload jest base64url)
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payloadB64Url = parts[1]

    // atob() obsługuje base64, nie base64url, więc normalizujemy.
    const payloadB64 = payloadB64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4)

    const jsonStr = atob(padded)
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>
    const role = parsed?.role
    return typeof role === 'string' ? role : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const cors = corsHeaders()
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Wymagana autoryzacja (Bearer JWT)' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    const { data: { user }, error: userErr } = await client.auth.getUser(token)
    let userIdToAssign: string | null = user?.id ?? null

    // `getUser()` dla `service_role` może zwrócić błąd / brak usera,
    // więc nie traktujemy tego jako blokady — weryfikujemy rolę z JWT.
    if (!userIdToAssign) {
      if (userErr) console.warn('[bulk-import-listings] getUser() failed, falling back to JWT role:', userErr.message)

      const role = decodeJwtRole(token)
      if (role === 'service_role') {
        userIdToAssign = SERVICE_ROLE_ADMIN_USER_ID
      } else {
        return new Response(
          JSON.stringify({ error: 'Nieprawidłowy lub wygasły token' }),
          { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
        )
      }
    }

    const body = (await req.json()) as ReqBody
    const rawListings = body?.listings
    if (!Array.isArray(rawListings) || rawListings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Body musi zawierać niepustą tablicę listings' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }
    if (rawListings.length > MAX_LISTINGS_PER_REQUEST) {
      return new Response(
        JSON.stringify({ error: `Maksymalnie ${MAX_LISTINGS_PER_REQUEST} ogłoszeń na jedno żądanie` }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const validated: BulkListingItem[] = []
    const validationErrors: string[] = []
    for (let i = 0; i < rawListings.length; i++) {
      const { row, error } = validateItem(rawListings[i], i)
      if (error) validationErrors.push(error)
      else validated.push(row)
    }
    if (validationErrors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Błędy walidacji', details: validationErrors }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const listingIds: string[] = []
    const reportErrors: string[] = []

    for (let offset = 0; offset < validated.length; offset += BATCH_SIZE) {
      const batch = validated.slice(offset, offset + BATCH_SIZE)
      const rows = batch.map((r) => ({
        user_id: userIdToAssign!,
        brand_id: r.brand_id,
        model_id: r.model_id,
        title: r.title,
        description: r.description ?? null,
        price: r.price,
        year: r.year,
        mileage_km: r.mileage_km ?? null,
        region_id: r.region_id ?? null,
        county_id: r.county_id ?? null,
        city: r.city ?? null,
        category: r.category ?? 'cars',
        fuel_id: r.fuel_id ?? null,
        body_type_id: r.body_type_id ?? null,
        color_id: r.color_id ?? null,
        engine_capacity_cc: r.engine_capacity_cc ?? null,
        technical_condition: r.technical_condition ?? 'Nieuszkodzony',
        gearbox: r.gearbox ?? null,
        status: r.status ?? 'active',
      }))

      const { data: inserted, error: insertErr } = await client
        .from('listings')
        .insert(rows)
        .select('id')

      if (insertErr) {
        console.error('[bulk-import-listings] insert error:', insertErr)
        reportErrors.push(`Batch ${offset / BATCH_SIZE + 1}: ${insertErr.message}`)
        continue
      }

      const ids = (inserted || []).map((r: { id: string }) => r.id)
      listingIds.push(...ids)

      for (let i = 0; i < batch.length; i++) {
        const listingId = ids[i]
        const photos = batch[i].photos
        if (!listingId || !photos?.length) continue
        const photoRows = photos.map((url, sortOrder) => ({
          listing_id: listingId,
          url,
          sort_order: sortOrder,
        }))
        const { error: photoErr } = await client.from('listing_photos').insert(photoRows)
        if (photoErr) {
          console.error('[bulk-import-listings] listing_photos insert error:', photoErr)
          reportErrors.push(`Zdjęcia dla ogłoszenia ${listingId}: ${photoErr.message}`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: reportErrors.length === 0,
        imported: listingIds.length,
        listing_ids: listingIds,
        errors: reportErrors.length > 0 ? reportErrors : undefined,
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[bulk-import-listings] Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: 'Błąd wewnętrzny', details: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
