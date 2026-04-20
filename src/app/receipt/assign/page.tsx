'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react'
import { getDraft, saveDraft } from '@/lib/store'
import type { EditableItem, ParticipantDraft, AssignmentDraft } from '@/lib/types'

const AVATAR_PALETTE = [
  { bg: '#FEE2E2', text: '#991B1B' },
  { bg: '#FEF3C7', text: '#92400E' },
  { bg: '#D1FAE5', text: '#065F46' },
  { bg: '#DBEAFE', text: '#1E40AF' },
  { bg: '#EDE9FE', text: '#5B21B6' },
  { bg: '#FCE7F3', text: '#9D174D' },
  { bg: '#CFFAFE', text: '#155E75' },
  { bg: '#FEF9C3', text: '#713F12' },
]

function avatarColor(idx: number) {
  return AVATAR_PALETTE[idx % AVATAR_PALETTE.length]
}

export default function AssignPage() {
  const router = useRouter()
  const [items, setItems] = useState<EditableItem[]>([])
  const [participants, setParticipants] = useState<ParticipantDraft[]>([])
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})
  const [quantities, setQuantities] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    const draft = getDraft()
    if (!draft || !draft.items.length || draft.participants.length < 2) {
      router.replace('/new')
      return
    }
    setItems(draft.items)
    setParticipants(draft.participants)

    const map: Record<string, string[]> = {}
    const qtyMap: Record<string, Record<string, number>> = {}
    for (const a of draft.assignments) {
      if (a.quantities) {
        qtyMap[a.item_id] = a.quantities
      } else {
        map[a.item_id] = a.participant_ids
      }
    }
    setAssignments(map)
    setQuantities(qtyMap)
  }, [router])

  function toggleParticipant(itemId: string, participantId: string) {
    setAssignments((prev) => {
      const current = prev[itemId] ?? []
      const exists = current.includes(participantId)
      return {
        ...prev,
        [itemId]: exists
          ? current.filter((id) => id !== participantId)
          : [...current, participantId],
      }
    })
  }

  function assignAll(itemId: string) {
    setAssignments((prev) => ({
      ...prev,
      [itemId]: participants.map((p) => p.id),
    }))
  }

  function adjustQuantity(itemId: string, participantId: string, delta: number, maxQty: number) {
    setQuantities((prev) => {
      const itemQty = { ...(prev[itemId] ?? {}) }
      const current = itemQty[participantId] ?? 0
      const totalOthers = Object.entries(itemQty)
        .filter(([pid]) => pid !== participantId)
        .reduce((s, [, q]) => s + q, 0)
      const maxForThis = maxQty - totalOthers
      const newVal = Math.max(0, Math.min(maxForThis, current + delta))
      itemQty[participantId] = newVal
      return { ...prev, [itemId]: itemQty }
    })
  }

  function isItemAssigned(item: EditableItem): boolean {
    if (item.cantidad > 1) {
      return Object.values(quantities[item.id] ?? {}).some((q) => q > 0)
    }
    return (assignments[item.id] ?? []).length > 0
  }

  const unassigned = items.filter((item) => !isItemAssigned(item))
  const assignedCount = items.length - unassigned.length
  const progress = items.length > 0 ? (assignedCount / items.length) * 100 : 0
  const allDone = unassigned.length === 0

  function handleContinue() {
    if (unassigned.length > 0) {
      if (
        !confirm(
          `${unassigned.length} ítem(s) sin asignar no se incluirán en los totales. ¿Continuar?`,
        )
      )
        return
    }
    const draft = getDraft()
    if (!draft) return

    const assignmentDrafts: AssignmentDraft[] = []
    for (const item of items) {
      if (item.cantidad > 1) {
        const itemQty = quantities[item.id] ?? {}
        const hasAny = Object.values(itemQty).some((q) => q > 0)
        if (hasAny) {
          assignmentDrafts.push({
            item_id: item.id,
            participant_ids: Object.entries(itemQty)
              .filter(([, q]) => q > 0)
              .map(([pid]) => pid),
            quantities: itemQty,
          })
        }
      } else {
        const pids = assignments[item.id] ?? []
        if (pids.length > 0) {
          assignmentDrafts.push({ item_id: item.id, participant_ids: pids })
        }
      }
    }

    draft.assignments = assignmentDrafts
    saveDraft(draft)
    router.push('/receipt/summary')
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      {/* Header con gradiente */}
      <header
        className="safe-top px-5 pt-5 pb-5"
        style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight">
              🧾 Asigna los ítems
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {allDone ? '🎉 ¡Todo listo!' : `⏳ ${unassigned.length} pendiente${unassigned.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}
          >
            {assignedCount}/{items.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.25)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: allDone
                ? '#86efac'
                : 'rgba(255,255,255,0.9)',
            }}
          />
        </div>
      </header>

      {/* Lista de ítems */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-28">
        {items.map((item) => {
          const isAssigned = isItemAssigned(item)
          const isMultiUnit = item.cantidad > 1
          const assignedIds = !isMultiUnit ? (assignments[item.id] ?? []) : []
          const itemQty = isMultiUnit ? (quantities[item.id] ?? {}) : {}
          const assignedQtyTotal = Object.values(itemQty).reduce((s, q) => s + q, 0)

          const shareAmount =
            !isMultiUnit && isAssigned && item.precio_total != null && assignedIds.length > 1
              ? Math.round(item.precio_total / assignedIds.length).toLocaleString('es-CL')
              : null

          const unitPrice =
            isMultiUnit && item.precio_total != null && item.cantidad > 0
              ? Math.round(item.precio_total / item.cantidad)
              : null

          return (
            <div
              key={item.id}
              className="bg-white rounded-3xl overflow-hidden"
              style={{
                boxShadow: isAssigned
                  ? '0 2px 16px rgba(34,197,94,0.10), 0 1px 4px rgba(0,0,0,0.06)'
                  : '0 2px 16px rgba(244,63,94,0.08), 0 1px 4px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${isAssigned ? '#4ade80' : '#fda4af'}`,
              }}
            >
              {/* Info del ítem */}
              <div className="px-5 pt-4 pb-3 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-base leading-snug">
                    🍽️ {item.nombre || 'Sin nombre'}
                  </p>
                  {isMultiUnit && (
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{ background: '#FFF3E0', color: '#E65100' }}
                      >
                        ×{item.cantidad} unidades
                      </span>
                      {assignedQtyTotal > 0 && (
                        <span className="text-xs text-slate-400">
                          {assignedQtyTotal}/{item.cantidad} asignadas
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-black text-slate-900">
                    {item.precio_total != null
                      ? `$${item.precio_total.toLocaleString('es-CL')}`
                      : '—'}
                  </p>
                  {unitPrice != null && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      ${unitPrice.toLocaleString('es-CL')} c/u
                    </p>
                  )}
                  {shareAmount && (
                    <p className="text-xs font-bold mt-0.5" style={{ color: '#f43f5e' }}>
                      ÷{assignedIds.length} = ${shareAmount}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px mx-5" style={{ background: '#F1F5F9' }} />

              {/* Participantes */}
              <div className="px-5 py-3.5">
                {isMultiUnit ? (
                  <div className="space-y-2.5">
                    {participants.map((p, idx) => {
                      const color = avatarColor(idx)
                      const qty = itemQty[p.id] ?? 0
                      const remaining = item.cantidad - assignedQtyTotal
                      const canIncrease = remaining > 0
                      const personAmount =
                        qty > 0 && item.precio_total != null
                          ? Math.round((item.precio_total * qty) / item.cantidad).toLocaleString('es-CL')
                          : null

                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                            style={{ background: color.bg, color: color.text }}
                          >
                            {p.nombre.charAt(0).toUpperCase()}
                          </div>
                          <span className="flex-1 text-sm font-semibold text-slate-700 truncate">
                            {p.nombre}
                          </span>
                          <div className="flex items-center gap-2.5">
                            <button
                              onClick={() => adjustQuantity(item.id, p.id, -1, item.cantidad)}
                              disabled={qty === 0}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
                              style={{
                                background: qty > 0 ? '#FFF1F2' : '#F8FAFC',
                                color: qty > 0 ? '#f43f5e' : '#94A3B8',
                                border: `1px solid ${qty > 0 ? '#FECDD3' : '#E2E8F0'}`,
                              }}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span
                              className="w-5 text-center text-sm font-black tabular-nums"
                              style={{ color: qty > 0 ? '#f43f5e' : '#CBD5E1' }}
                            >
                              {qty}
                            </span>
                            <button
                              onClick={() => adjustQuantity(item.id, p.id, 1, item.cantidad)}
                              disabled={!canIncrease}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-20"
                              style={{
                                background: canIncrease ? '#FFF1F2' : '#F8FAFC',
                                color: canIncrease ? '#f43f5e' : '#94A3B8',
                                border: `1px solid ${canIncrease ? '#FECDD3' : '#E2E8F0'}`,
                              }}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {personAmount && (
                            <span
                              className="text-xs font-bold w-16 text-right shrink-0"
                              style={{ color: '#16a34a' }}
                            >
                              ${personAmount}
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {assignedQtyTotal < item.cantidad && assignedQtyTotal > 0 && (
                      <p className="text-xs font-semibold pt-1" style={{ color: '#f59e0b' }}>
                        ⚠️ {item.cantidad - assignedQtyTotal} unidad{item.cantidad - assignedQtyTotal !== 1 ? 'es' : ''} sin asignar
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {participants.map((p, idx) => {
                      const selected = assignedIds.includes(p.id)
                      const color = avatarColor(idx)
                      return (
                        <button
                          key={p.id}
                          onClick={() => toggleParticipant(item.id, p.id)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[40px]"
                          style={
                            selected
                              ? {
                                  background: 'linear-gradient(135deg, #f43f5e, #fb923c)',
                                  color: '#fff',
                                  boxShadow: '0 2px 8px rgba(244,63,94,0.35)',
                                }
                              : {
                                  background: color.bg,
                                  color: color.text,
                                }
                          }
                        >
                          {selected && <Check className="w-3.5 h-3.5" />}
                          {p.nombre}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => assignAll(item.id)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all min-h-[40px]"
                      style={{
                        background: '#FFF7F7',
                        color: '#f43f5e',
                        border: '2px dashed #FECDD3',
                      }}
                    >
                      👥 Todos
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA fijo */}
      <div className="sticky bottom-0 px-4 py-3 safe-bottom" style={{ background: '#FFF7F7', borderTop: '1px solid #FFE4E6' }}>
        <button
          onClick={handleContinue}
          className="w-full h-14 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98]"
          style={{
            background: allDone
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'linear-gradient(135deg, #f43f5e, #fb923c)',
            boxShadow: allDone
              ? '0 4px 20px rgba(34,197,94,0.35)'
              : '0 4px 20px rgba(244,63,94,0.35)',
          }}
        >
          {allDone ? '✅ Ver resumen' : `Ver resumen · ${unassigned.length} sin asignar`}
        </button>
      </div>
    </div>
  )
}
