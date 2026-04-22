import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Item, Participant, Assignment } from '@/lib/types'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/bills/[id]
// body: { action: 'settle' }  →  marks bill as settled
// body: { bill, items, participants, assignments }  →  full replacement
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request inválido.' }, { status: 400 })
  }

  // ── Settle bill ────────────────────────────────────────────────────────────
  if (body.action === 'settle') {
    const { error } = await supabaseAdmin
      .from('bills')
      .update({ status: 'liquidada' })
      .eq('id', id)
    if (error) {
      console.error('Error liquidando cuenta:', error)
      return NextResponse.json({ error: 'Error al liquidar la cuenta.' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  // ── Full edit ──────────────────────────────────────────────────────────────
  const { bill, items, participants, assignments } = body as {
    bill: Record<string, unknown>
    items: Omit<Item, 'bill_id'>[]
    participants: Omit<Participant, 'bill_id'>[]
    assignments: Assignment[]
  }

  // Update bill metadata
  const { error: billError } = await supabaseAdmin
    .from('bills')
    .update(bill)
    .eq('id', id)
  if (billError) {
    console.error('Error actualizando bill:', billError)
    return NextResponse.json({ error: 'Error al actualizar la cuenta.' }, { status: 500 })
  }

  // Fetch current item IDs to delete their assignments first
  const { data: oldItems } = await supabaseAdmin
    .from('items')
    .select('id')
    .eq('bill_id', id)
  const oldItemIds = (oldItems ?? []).map((i: { id: string }) => i.id)

  if (oldItemIds.length > 0) {
    await supabaseAdmin.from('assignments').delete().in('item_id', oldItemIds)
  }
  await supabaseAdmin.from('items').delete().eq('bill_id', id)
  await supabaseAdmin.from('participants').delete().eq('bill_id', id)

  // Re-insert with remapped IDs (OCR may return non-UUID ids like "1", "2")
  const itemIdMap = new Map<string, string>()
  const newItems = items.map((item) => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.id)
    const newId = isUuid ? item.id : crypto.randomUUID()
    itemIdMap.set(item.id, newId)
    return { ...item, id: newId, bill_id: id }
  })

  const { error: itemsError } = await supabaseAdmin.from('items').insert(newItems)
  if (itemsError) {
    console.error('Error insertando ítems:', itemsError)
    return NextResponse.json({ error: 'Error al guardar los ítems.' }, { status: 500 })
  }

  const newParticipants = participants.map((p) => ({ ...p, bill_id: id }))
  const { error: partsError } = await supabaseAdmin.from('participants').insert(newParticipants)
  if (partsError) {
    console.error('Error insertando participantes:', partsError)
    return NextResponse.json({ error: 'Error al guardar los participantes.' }, { status: 500 })
  }

  const newAssignments = assignments.map((a) => ({
    ...a,
    item_id: itemIdMap.get(a.item_id) ?? a.item_id,
  }))
  const { error: assignError } = await supabaseAdmin.from('assignments').insert(newAssignments)
  if (assignError) {
    console.error('Error insertando asignaciones:', assignError)
    return NextResponse.json({ error: 'Error al guardar las asignaciones.' }, { status: 500 })
  }

  return NextResponse.json({ id })
}
