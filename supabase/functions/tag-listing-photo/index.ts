// Edge Function: tagowanie zdjęcia ogłoszenia przez OpenAI Vision (gpt-4o-mini).
// Wywołanie: POST z body { listing_photo_id: string }.
// Wymaga: OPENAI_API_KEY w sekretach projektu.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENAI_MODEL = 'gpt-4o-mini'
const PROMPT = `Opisz krótko to zdjęcie w kontekście ogłoszenia motoryzacyjnego (pojazd, maszyna, przyczepa itd.).
Zwróć wyłącznie listę tagów po polsku, oddzielonych przecinkami, np: wnętrze, deska rozdzielcza, fotel, tapicerka.
Maksymalnie 10 tagów. Tylko tagi, bez numeracji i bez innych słów.`

interface ReqBody {
  listing_photo_id?: string
}

function parseTags(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() })
  }

  const cors = corsHeaders()
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    })

    const body = (await req.json()) as ReqBody
    const photoId = body?.listing_photo_id
    if (!photoId || typeof photoId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'listing_photo_id required' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const { data: photo, error: fetchErr } = await client
      .from('listing_photos')
      .select('id, url')
      .eq('id', photoId)
      .single()

    if (fetchErr || !photo?.url) {
      return new Response(
        JSON.stringify({ error: 'Photo not found or access denied', details: fetchErr?.message }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              {
                type: 'image_url',
                image_url: { url: photo.url, detail: 'low' },
              },
            ],
          },
        ],
      }),
    })

    if (!openaiRes.ok) {
      const errText = await openaiRes.text()
      console.error('[tag-listing-photo] OpenAI error:', openaiRes.status, errText)
      return new Response(
        JSON.stringify({ error: 'OpenAI request failed', details: errText }),
        { status: 502, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const openaiJson = await openaiRes.json()
    const choice = openaiJson?.choices?.[0]
    const content = choice?.message?.content?.trim() || ''
    const tags = parseTags(content)
    const caption = content || null

    const { error: updateErr } = await client
      .from('listing_photos')
      .update({ ai_tags: tags.length ? tags : null, ai_caption: caption })
      .eq('id', photoId)

    if (updateErr) {
      console.error('[tag-listing-photo] Supabase update error:', updateErr)
      return new Response(
        JSON.stringify({ error: 'Failed to save tags', details: updateErr.message }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, listing_photo_id: photoId, tags }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('[tag-listing-photo] Unexpected error:', e)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: String(e) }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
