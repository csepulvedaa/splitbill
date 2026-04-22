import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Item, Participant, Assignment } from '@/lib/types'

export async function POST(request: NextRequest) {
  let body: {
    bill: {
      restaurant: string | null
      currency: string
      subtotal_declared: number | null
      tip_included: boolean
      tip_included_amount: number | null
      total_declared: number | null
      tip_manual_enabled: boolean
      ocr_confidence: string
      ocr_notes: string[]
    }
    items: Omit<Item, 'bill_id'>[]
    participants: Omit<Participant, 'bill_id'>[]
    assignments: Assignment[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request inválido.' }, { status: 400 })
  }

  const { bill, items, participants, assignments } = body
  const deviceId = request.headers.get('X-Device-Id') ?? null

  // Insertar bill
  const { data: billData, error: billError } = await supabaseAdmin
    .from('bills')
    .insert({ ...bill, device_id: deviceId })
    .select()
    .single()

  if (billError || !billData) {
    console.error('Error creando bill:', billError)
    return NextResponse.json({ error: 'Error al guardar la cuenta.' }, { status: 500 })
  }

  const billId = billData.id

  // Reasignar IDs de ítems a UUIDs válidos (el OCR devuelve "1", "2", etc.)
  const itemIdMap = new Map<string, string>()
  const itemsWithBillId = items.map((item) => {
    const newId = crypto.randomUUID()
    itemIdMap.set(item.id, newId)
    return { ...item, id: newId, bill_id: billId }
  })
  const { error: itemsError } = await supabaseAdmin.from('items').insert(itemsWithBillId)
  if (itemsError) {
    console.error('Error insertando items:', itemsError)
    return NextResponse.json({ error: 'Error al guardar los ítems.' }, { status: 500 })
  }

  // Insertar participantes
  const participantsWithBillId = participants.map((p) => ({ ...p, bill_id: billId }))
  const { error: partsError } = await supabaseAdmin
    .from('participants')
    .insert(participantsWithBillId)
  if (partsError) {
    console.error('Error insertando participantes:', partsError)
    return NextResponse.json({ error: 'Error al guardar los participantes.' }, { status: 500 })
  }

  // Actualizar item_id en asignaciones con los nuevos UUIDs
  const assignmentsRemapped = assignments.map((a) => ({
    ...a,
    item_id: itemIdMap.get(a.item_id) ?? a.item_id,
  }))
  const { error: assignError } = await supabaseAdmin.from('assignments').insert(assignmentsRemapped)
  if (assignError) {
    console.error('Error insertando asignaciones:', assignError)
    return NextResponse.json({ error: 'Error al guardar las asignaciones.' }, { status: 500 })
  }

  return NextResponse.json({ id: billId })
}

// Historial: últimas 20 cuentas
export async function GET(request: NextRequest) {
  const deviceId = request.headers.get('X-Device-Id')

  let query = supabaseAdmin
    .from('bills')
    .select('id, created_at, restaurant, currency, total_declared, status')
    .order('created_at', { ascending: false })
    .limit(20)

  if (deviceId) {
    query = query.eq('device_id', deviceId)
  }

  const { data: bills, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Error al obtener el historial.' }, { status: 500 })
  }

  // Para cuentas sin total_declared, calcular la suma de ítems
  const nullIds = (bills ?? []).filter((b) => b.total_declared == null).map((b) => b.id)
  if (nullIds.length > 0) {
    const { data: items } = await supabaseAdmin
      .from('items')
      .select('bill_id, precio_total')
      .in('bill_id', nullIds)

    if (items && items.length > 0) {
      const totals = new Map<string, number>()
      for (const item of items) {
        totals.set(item.bill_id, (totals.get(item.bill_id) ?? 0) + (item.precio_total ?? 0))
      }
      return NextResponse.json(
        (bills ?? []).map((b) => ({
          ...b,
          total_declared: b.total_declared ?? totals.get(b.id) ?? null,
        })),
      )
    }
  }

  return NextResponse.json(bills)
}
