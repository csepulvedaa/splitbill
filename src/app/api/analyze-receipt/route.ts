import { NextRequest, NextResponse } from 'next/server'
import { analyzeReceipt } from '@/lib/vision-client'

// Simple in-memory rate limiting (MVP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

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

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes and try again.' },
      { status: 429 },
    )
  }

  let body: { image: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { image } = body
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    return NextResponse.json({ error: 'Invalid or missing image.' }, { status: 400 })
  }

  // Approximate size check (base64 ≈ 4/3 of original bytes)
  const approxBytes = (image.length * 3) / 4
  if (approxBytes > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Image too large. Maximum 5 MB.' },
      { status: 400 },
    )
  }

  try {
    const result = await analyzeReceipt(image)
    return NextResponse.json(result)
  } catch (err: unknown) {
    console.error('[OCR] All providers failed:', err)
    return NextResponse.json(
      { error: 'Could not read the receipt. Try with a clearer photo.' },
      { status: 422 },
    )
  }
}

export const maxDuration = 60
