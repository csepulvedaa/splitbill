'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { saveDraft } from '@/lib/store'
import type { Bill, Item, Participant, Assignment, EditableItem, AssignmentDraft } from '@/lib/types'

interface Props {
  billId: string
  bill: Bill
  items: Item[]
  participants: Participant[]
  assignments: Assignment[]
}

export default function EditLoader({ billId, bill, items, participants, assignments }: Props) {
  const router = useRouter()

  useEffect(() => {
    // Convertir ítems de DB a EditableItem
    const editableItems: EditableItem[] = items.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      precio_total: item.precio_total,
      confianza_item: item.confianza_item,
      nota_item: item.nota_item,
      is_manually_added: item.is_manually_added,
    }))

    // Convertir participantes de DB a ParticipantDraft
    const participantDrafts = participants.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      orden: p.orden,
    }))

    // Reconstruir AssignmentDraft desde las asignaciones de DB
    const byItemId = new Map<string, Assignment[]>()
    for (const a of assignments) {
      const list = byItemId.get(a.item_id) ?? []
      list.push(a)
      byItemId.set(a.item_id, list)
    }

    const assignmentDrafts: AssignmentDraft[] = []
    for (const [item_id, asgns] of byItemId) {
      const item = items.find((i) => i.id === item_id)
      const participant_ids = asgns.map((a) => a.participant_id)

      // Para ítems con cantidad>1, intentar reconstruir cantidades por persona
      if (item && item.cantidad > 1) {
        const allEqual = asgns.every(
          (a) => Math.abs(a.fraccion - asgns[0].fraccion) < 0.001,
        )
        if (!allEqual) {
          const quantities: Record<string, number> = {}
          for (const a of asgns) {
            quantities[a.participant_id] = Math.round(a.fraccion * item.cantidad)
          }
          assignmentDrafts.push({ item_id, participant_ids, quantities })
          continue
        }
      }
      assignmentDrafts.push({ item_id, participant_ids })
    }

    saveDraft({
      ocrResult: null,
      items: editableItems,
      participants: participantDrafts,
      assignments: assignmentDrafts,
      tipManualEnabled: bill.tip_manual_enabled,
      editingBillId: billId,
    })

    router.replace('/receipt/review')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh" style={{ background: '#FFF7F7' }}>
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full" style={{ border: '4px solid #FFE4E6' }} />
        <div className="absolute inset-0 rounded-full border-4 border-t-rose-500 animate-spin" />
      </div>
      <p className="text-base font-semibold text-slate-700">Cargando cuenta...</p>
    </div>
  )
}
