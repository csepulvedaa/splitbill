'use client'

/**
 * Estado global del flujo de creación de una cuenta.
 * Vive en sessionStorage para sobrevivir recargas dentro de la misma sesión.
 */

import type { EditableItem, ParticipantDraft, AssignmentDraft, OcrResult } from './types'

export interface BillDraft {
  ocrResult: OcrResult | null
  items: EditableItem[]
  participants: ParticipantDraft[]
  assignments: AssignmentDraft[]   // { item_id, participant_ids[] }
  tipManualEnabled: boolean
  restaurantName?: string          // Nombre del restaurante (editable por el usuario)
  totalDeclared?: number | null    // Total declarado (preservado al editar)
  editingBillId?: string           // Presente cuando se edita una cuenta existente
}

const KEY = 'splitbill_draft'

export function getDraft(): BillDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveDraft(draft: BillDraft): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY, JSON.stringify(draft))
}

export function clearDraft(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(KEY)
}

export function emptyDraft(): BillDraft {
  return {
    ocrResult: null,
    items: [],
    participants: [],
    assignments: [],
    tipManualEnabled: true,
  }
}
