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

Output the following JSON structure exactly (replace example values with real extracted data):
{
  "items": [
    {
      "id": "1",
      "nombre": "Hamburguesa",
      "cantidad": 1,
      "precio_unitario": 5900,
      "precio_total": 5900,
      "confianza_item": "alta",
      "nota_item": null
    }
  ],
  "subtotal": 5900,
  "impuestos": { "detectados": false, "monto": null, "descripcion": null },
  "propina_detectada": { "incluida": false, "monto": null, "porcentaje": null, "descripcion": null },
  "total": 5900,
  "moneda": "CLP",
  "confianza_general": "alta",
  "notas_ocr": [],
  "idioma_cuenta": "es"
}
- For prices use numbers (e.g. 1500) or null if illegible, never strings.
- For confianza_item and confianza_general use only: "alta", "media", or "baja".`

// ─── Gemini native API ────────────────────────────────────────────────────────

async function callGemini(apiKey: string, image: string): Promise<OcrResult> {
  // Parse data URL: "data:image/jpeg;base64,<data>"
  const commaIdx = image.indexOf(',')
  const mimeType = image.slice(5, image.indexOf(';'))
  const b64data = image.slice(commaIdx + 1)

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: b64data } },
          { text: 'Extract all items and totals from this receipt. Return only valid JSON.' },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 8192 },
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini HTTP ${res.status}: ${text}`)
  }

  const data = await res.json()
  const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Gemini: no JSON found in response')

  const result: OcrResult = JSON.parse(jsonMatch[0])
  if (!Array.isArray(result.items)) throw new Error('Gemini: missing items array')

  return result
}

// ─── OpenAI call ─────────────────────────────────────────────────────────────

async function callOpenAI(apiKey: string, image: string): Promise<OcrResult> {
  const client = new OpenAI({ apiKey })

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
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
  if (!jsonMatch) throw new Error('OpenAI: no JSON found in response')

  const result: OcrResult = JSON.parse(jsonMatch[0])
  if (!Array.isArray(result.items)) throw new Error('OpenAI: missing items array')

  return result
}

// ─── Cascade ──────────────────────────────────────────────────────────────────

/**
 * Tries Gemini first, falls back to OpenAI.
 * Skips providers with no API key configured.
 * Throws if all available providers fail.
 */
export async function analyzeReceipt(image: string): Promise<OcrResult> {
  const providers: Array<{ name: string; apiKey: string | undefined; call: (key: string) => Promise<OcrResult> }> = [
    { name: 'Gemini', apiKey: process.env.GEMINI_API_KEY, call: (k) => callGemini(k, image) },
    { name: 'OpenAI', apiKey: process.env.OPENAI_API_KEY, call: (k) => callOpenAI(k, image) },
  ]

  const available = providers.filter((p) => !!p.apiKey)

  if (available.length === 0) {
    throw new Error('No OCR provider configured. Set GEMINI_API_KEY or OPENAI_API_KEY.')
  }

  const errors: string[] = []

  for (const provider of available) {
    try {
      console.log(`[OCR] Trying ${provider.name}`)
      const result = await provider.call(provider.apiKey!)
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
