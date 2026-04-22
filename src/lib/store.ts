'use client'

/**
 * Global state for the bill creation flow.
 * Lives in sessionStorage so it survives page reloads within the same session.
 */

import type { EditableItem, ParticipantDraft, AssignmentDraft, OcrResult } from './types'

export interface BillDraft {
  ocrResult: OcrResult | null
  items: EditableItem[]
  participants: ParticipantDraft[]
  assignments: AssignmentDraft[]   // { item_id, participant_ids[] }
  tipManualEnabled: boolean
  restaurantName?: string          // Restaurant name (user-editable)
  totalDeclared?: number | null    // Declared total (preserved during editing)
  editingBillId?: string           // Present when editing an existing bill
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
