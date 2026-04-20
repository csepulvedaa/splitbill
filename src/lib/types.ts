// ─── Tipos del dominio ────────────────────────────────────────────────────────

export type OcrConfidence = 'alta' | 'media' | 'baja'

export interface OcrItem {
  id: string
  nombre: string
  cantidad: number
  precio_unitario: number | null
  precio_total: number | null
  confianza_item: OcrConfidence
  nota_item: string | null
}

export interface OcrResult {
  items: OcrItem[]
  subtotal: number | null
  impuestos: {
    detectados: boolean
    monto: number | null
    descripcion: string | null
  }
  propina_detectada: {
    incluida: boolean
    monto: number | null
    porcentaje: number | null
    descripcion: string | null
  }
  total: number | null
  moneda: string
  confianza_general: OcrConfidence
  notas_ocr: string[]
  idioma_cuenta: string
}

// ─── Entidades de base de datos ───────────────────────────────────────────────

export interface Bill {
  id: string
  created_at: string
  restaurant: string | null
  currency: string
  subtotal_declared: number | null
  tip_included: boolean
  tip_included_amount: number | null
  total_declared: number | null
  tip_manual_enabled: boolean
  ocr_confidence: OcrConfidence
  ocr_notes: string[]
  status: string
  expires_at: string
}

export interface Item {
  id: string
  bill_id: string
  nombre: string
  cantidad: number
  precio_unitario: number | null
  precio_total: number | null
  confianza_item: OcrConfidence
  nota_item: string | null
  is_manually_added: boolean
  orden: number
}

export interface Participant {
  id: string
  bill_id: string
  nombre: string
  orden: number
}

export interface Assignment {
  id: string
  item_id: string
  participant_id: string
  fraccion: number
  monto_asignado: number
}

// ─── Tipos del flujo de creación (estado en cliente) ─────────────────────────

export interface EditableItem extends OcrItem {
  is_manually_added: boolean
}

export interface ParticipantDraft {
  id: string      // uuid generado en cliente
  nombre: string
  orden: number
}

export interface AssignmentDraft {
  item_id: string
  participant_ids: string[]       // IDs de participantes asignados a este ítem
  quantities?: Record<string, number>  // Para ítems con cantidad>1: cuántas unidades tuvo cada participante
}

// ─── Tipo para la vista pública ───────────────────────────────────────────────

export interface BillPublicView {
  bill: Bill
  items: Item[]
  participants: Participant[]
  assignments: Assignment[]
}

// ─── Resumen calculado por persona ───────────────────────────────────────────

export interface PersonSummary {
  participant: Participant
  items: Array<{
    item: Item
    fraccion: number
    monto: number
  }>
  subtotal: number
  propina: number
  total: number
}
