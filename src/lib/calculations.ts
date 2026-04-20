import type { Item, Participant, Assignment, PersonSummary } from './types'

/**
 * Calcula el resumen por persona dado el estado actual de la cuenta.
 */
export function calculateSummary(
  items: Item[],
  participants: Participant[],
  assignments: Assignment[],
  tipEnabled: boolean,
): PersonSummary[] {
  return participants.map((participant) => {
    const personItems: PersonSummary['items'] = []

    for (const item of items) {
      const itemAssignments = assignments.filter(
        (a) => a.item_id === item.id && a.participant_id === participant.id,
      )
      if (itemAssignments.length === 0) continue
      // Solo debe haber una asignación por (item, participant)
      const a = itemAssignments[0]
      personItems.push({
        item,
        fraccion: a.fraccion,
        monto: a.monto_asignado,
      })
    }

    const subtotal = personItems.reduce((sum, pi) => sum + pi.monto, 0)
    const propina = tipEnabled ? round2(subtotal * 0.1) : 0
    const total = round2(subtotal + propina)

    return { participant, items: personItems, subtotal: round2(subtotal), propina, total }
  })
}

/**
 * Genera assignments a partir de los drafts del cliente.
 * - Si el draft tiene `quantities`: reparto proporcional por unidades (ítems con cantidad > 1)
 * - Si no: reparto equitativo entre participant_ids
 */
export function buildAssignments(
  items: Item[],
  assignmentDrafts: { item_id: string; participant_ids: string[]; quantities?: Record<string, number> }[],
): Assignment[] {
  const assignments: Assignment[] = []

  for (const draft of assignmentDrafts) {
    const item = items.find((i) => i.id === draft.item_id)
    if (!item || !item.precio_total) continue

    if (draft.quantities) {
      // Reparto proporcional por unidades
      const entries = Object.entries(draft.quantities).filter(([, q]) => q > 0)
      if (entries.length === 0) continue

      const totalQty = entries.reduce((s, [, q]) => s + q, 0)
      const baseAmounts = entries.map(([pid, qty]) => ({
        pid,
        fraccion: qty / totalQty,
        monto: Math.floor((item.precio_total! * qty / totalQty) * 100) / 100,
      }))

      const sumBase = baseAmounts.reduce((s, e) => s + e.monto, 0)
      const remainder = round2(item.precio_total - sumBase)

      baseAmounts.forEach((entry, idx) => {
        assignments.push({
          id: crypto.randomUUID(),
          item_id: item.id,
          participant_id: entry.pid,
          fraccion: entry.fraccion,
          monto_asignado: idx === 0 ? round2(entry.monto + remainder) : entry.monto,
        })
      })
    } else {
      // Reparto equitativo entre los participantes seleccionados
      if (draft.participant_ids.length === 0) continue

      const n = draft.participant_ids.length
      const fraccion = 1 / n
      const baseAmount = Math.floor((item.precio_total / n) * 100) / 100
      const remainder = round2(item.precio_total - baseAmount * n)

      draft.participant_ids.forEach((pid, idx) => {
        const monto = idx === 0 ? round2(baseAmount + remainder) : baseAmount
        assignments.push({
          id: crypto.randomUUID(),
          item_id: item.id,
          participant_id: pid,
          fraccion,
          monto_asignado: monto,
        })
      })
    }
  }

  return assignments
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatCurrency(amount: number, currency = 'CLP'): string {
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === 'CLP' ? 0 : 2,
      maximumFractionDigits: currency === 'CLP' ? 0 : 2,
    }).format(amount)
  } catch {
    return `$${amount.toLocaleString('es-CL')}`
  }
}
