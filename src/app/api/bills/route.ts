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

  // Insertar bill
  const { data: billData, error: billError } = await supabaseAdmin
    .from('bills')
    .insert(bill)
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
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('bills')
    .select('id, created_at, restaurant, currency, total_declared, status')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ error: 'Error al obtener el historial.' }, { status: 500 })
  }

  return NextResponse.json(data)
}
