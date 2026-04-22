import OpenAI from 'openai'
import type { OcrResult } from './types'

// ─── OCR system prompt ────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are a specialist in extracting structured data from restaurant receipts and bills.
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

// ─── Provider definitions ─────────────────────────────────────────────────────

interface Provider {
  name: string
  model: string
  baseURL?: string
  apiKey: string | undefined
}

function getProviders(): Provider[] {
  return [
    {
      name: 'Groq',
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      baseURL: 'https://api.groq.com/openai/v1',
      apiKey: process.env.GROQ_API_KEY,
    },
    {
      name: 'Gemini',
      model: 'gemini-2.5-flash-preview-04-17',
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      apiKey: process.env.GEMINI_API_KEY,
    },
    {
      name: 'OpenAI',
      model: 'gpt-4o',
      baseURL: undefined, // uses default OpenAI base URL
      apiKey: process.env.OPENAI_API_KEY,
    },
  ]
}

// ─── Core call ────────────────────────────────────────────────────────────────

async function callProvider(provider: Provider, image: string): Promise<OcrResult> {
  const client = new OpenAI({
    apiKey: provider.apiKey!,
    ...(provider.baseURL ? { baseURL: provider.baseURL } : {}),
  })

  const response = await client.chat.completions.create({
    model: provider.model,
    max_tokens: 2000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: image, detail: 'auto' } },
          { type: 'text', text: 'Extract all items and totals from this receipt. Return only valid JSON.' },
        ],
      },
    ],
  })

  const raw = response.choices[0]?.message?.content ?? ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`${provider.name}: no JSON found in response`)

  const result: OcrResult = JSON.parse(jsonMatch[0])
  if (!Array.isArray(result.items)) throw new Error(`${provider.name}: missing items array`)

  return result
}

// ─── Cascade ──────────────────────────────────────────────────────────────────

/**
 * Tries each provider in order (Groq → Gemini → OpenAI).
 * Skips providers with no API key configured.
 * Throws if all available providers fail.
 */
export async function analyzeReceipt(image: string): Promise<OcrResult> {
  const providers = getProviders().filter((p) => !!p.apiKey)

  if (providers.length === 0) {
    throw new Error('No OCR provider configured. Set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.')
  }

  const errors: string[] = []

  for (const provider of providers) {
    try {
      console.log(`[OCR] Trying ${provider.name} (${provider.model})`)
      const result = await callProvider(provider, image)
      console.log(`[OCR] Success with ${provider.name}`)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[OCR] ${provider.name} failed: ${msg}`)
      errors.push(`${provider.name}: ${msg}`)
    }
  }

  throw new Error(`All OCR providers failed.\n${errors.join('\n')}`)
}
