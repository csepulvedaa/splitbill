import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { OcrResult } from '@/lib/types'

// Rate limiting simple en memoria (MVP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 5 * 60 * 1000 // 5 minutos

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_LIMIT) return false
  entry.count++
  return true
}

const SYSTEM_PROMPT = `You are a specialist in extracting structured data from restaurant receipts and bills.
Analyze the provided image and extract all consumed items with their prices.

Rules:
- Extract each line item as a separate element, preserving the name exactly as it appears in the original language.
- If an item has an implicit quantity (e.g., "3x Beer"), separate quantity and unit price.
- If the unit price is not visible but the line total and quantity are, calculate the unit price.
- If a price is illegible, use null for that field and mark confianza_item as "baja".
- If a field is ambiguous, prefer to include it with low confidence rather than omitting it.
- For tips/gratuity: if the bill includes any charge labeled "service charge", "propina", "tip", "servicio", or similar, extract it separately in propina_detectada and do NOT include it in the items list.
- Always use period as decimal separator and no thousands separator in JSON numbers.
- Respond ONLY with valid JSON, no additional text.

Output the following JSON structure exactly:
{
  "items": [
    {
      "id": "1",
      "nombre": "string",
      "cantidad": 1,
      "precio_unitario": number | null,
      "precio_total": number | null,
      "confianza_item": "alta" | "media" | "baja",
      "nota_item": null
    }
  ],
  "subtotal": number | null,
  "impuestos": { "detectados": false, "monto": null, "descripcion": null },
  "propina_detectada": { "incluida": false, "monto": null, "porcentaje": null, "descripcion": null },
  "total": number | null,
  "moneda": "CLP",
  "confianza_general": "alta" | "media" | "baja",
  "notas_ocr": [],
  "idioma_cuenta": "es"
}`

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Espera unos minutos y vuelve a intentar.' },
      { status: 429 },
    )
  }

  // Validar API key
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key no configurada en el servidor.' }, { status: 500 })
  }

  let body: { image: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request inválido.' }, { status: 400 })
  }

  const { image } = body
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Imagen inválida o faltante.' }, { status: 400 })
  }

  // Validar tamaño aproximado (base64 ~= 4/3 del tamaño original)
  const approxBytes = (image.length * 3) / 4
  if (approxBytes > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'La imagen es demasiado grande. Máximo 5MB.' },
      { status: 400 },
    )
  }

  const client = new OpenAI({ apiKey })

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: image, detail: 'auto' },
            },
            {
              type: 'text',
              text: 'Extract all items and totals from this receipt. Return only valid JSON.',
            },
          ],
        },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''

    // Extraer JSON aunque el modelo agregue texto extra
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'No se pudo leer la cuenta. Intenta con una foto más nítida.' },
        { status: 422 },
      )
    }

    const result: OcrResult = JSON.parse(jsonMatch[0])

    // Validaciones básicas
    if (!Array.isArray(result.items)) {
      return NextResponse.json(
        { error: 'No se encontraron ítems en la cuenta.' },
        { status: 422 },
      )
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string }
    if (error?.status === 401) {
      return NextResponse.json({ error: 'API Key de OpenAI inválida.' }, { status: 401 })
    }
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'Límite de OpenAI alcanzado. Intenta en unos minutos.' },
        { status: 429 },
      )
    }
    console.error('OpenAI error:', error)
    return NextResponse.json(
      { error: 'Error al procesar la imagen. Intenta de nuevo.' },
      { status: 500 },
    )
  }
}

export const maxDuration = 60
