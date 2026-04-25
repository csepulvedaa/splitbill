'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, AlertTriangle, Plus, Trash2, AlertCircle, Receipt } from 'lucide-react'
import { getDraft, saveDraft } from '@/lib/store'
import { round2 } from '@/lib/calculations'
import type { EditableItem } from '@/lib/types'

export default function ReviewPage() {
  const router = useRouter()
  const [items, setItems] = useState<EditableItem[]>([])
  const [restaurantName, setRestaurantName] = useState('')
  const [ocrConfidence, setOcrConfidence] = useState<string>('alta')
  const [ocrNotes, setOcrNotes] = useState<string[]>([])
  const [subtotalDeclared, setSubtotalDeclared] = useState<number | null>(null)
  const [tipIncluded, setTipIncluded] = useState(false)
  const [tipAmount, setTipAmount] = useState<number | null>(null)

  useEffect(() => {
    const draft = getDraft()
    if (!draft || !draft.items.length) {
      router.replace('/new')
      return
    }
    setItems(draft.items)
    setRestaurantName(draft.restaurantName ?? '')
    setOcrConfidence(draft.ocrResult?.confianza_general ?? 'alta')
    setOcrNotes(draft.ocrResult?.notas_ocr ?? [])
    setSubtotalDeclared(draft.ocrResult?.subtotal ?? null)
    setTipIncluded(draft.ocrResult?.propina_detectada.incluida ?? false)
    setTipAmount(draft.ocrResult?.propina_detectada.monto ?? null)
  }, [router])

  function updateItem(id: string, field: keyof EditableItem, value: string) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === 'cantidad' || field === 'precio_unitario') {
          const qty = parseFloat(field === 'cantidad' ? value : String(item.cantidad)) || 0
          const price =
            parseFloat(field === 'precio_unitario' ? value : String(item.precio_unitario)) || 0
          updated.precio_total = qty && price ? round2(qty * price) : item.precio_total
        }
        return updated
      }),
    )
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  function addItem() {
    const newItem: EditableItem = {
      id: crypto.randomUUID(),
      nombre: '',
      cantidad: 1,
      precio_unitario: null,
      precio_total: null,
      confianza_item: 'alta',
      nota_item: null,
      is_manually_added: true,
    }
    setItems((prev) => [...prev, newItem])
  }

  function handleContinue() {
    const draft = getDraft()
    if (!draft) return
    const missing = items.filter((i) => i.precio_total == null || i.precio_total === 0)
    if (missing.length > 0 && !confirm(`Hay ${missing.length} ítem(s) sin precio. ¿Continuar de todas formas?`)) {
      return
    }
    draft.items = items
    draft.restaurantName = restaurantName.trim() || undefined
    saveDraft(draft)
    router.push('/receipt/participants')
  }

  const sumItems = round2(items.reduce((sum, i) => sum + (i.precio_total ?? 0), 0))
  const diff = subtotalDeclared != null ? round2(Math.abs(sumItems - subtotalDeclared)) : 0
  const showDiffWarning = subtotalDeclared != null && diff > 0.5
  const lowConfidenceItems = items.filter((i) => i.confianza_item === 'baja')

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>

      {/* Header */}
      <header
        className="safe-top px-5 pt-5 pb-5 text-white"
        style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold tracking-tight">🧾 Revisa los ítems</h1>
            {restaurantName
              ? <p className="text-white/75 text-xs mt-0.5">{restaurantName} · {items.length} ítems</p>
              : <p className="text-white/75 text-xs mt-0.5">Toca cualquier campo para editar</p>
            }
          </div>
          <div
            className="h-8 px-3 rounded-full flex items-center gap-1.5 text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.25)' }}
          >
            <Receipt className="w-3.5 h-3.5" />
            {items.length}
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }}>
          <div className="h-full rounded-full" style={{ background: 'rgba(255,255,255,0.9)', width: '25%' }} />
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3 pb-32">

        {/* Banners */}
        {ocrConfidence !== 'alta' && (
          <div
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              background: ocrConfidence === 'baja' ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${ocrConfidence === 'baja' ? '#FECACA' : '#FDE68A'}`,
            }}
          >
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: ocrConfidence === 'baja' ? '#ef4444' : '#d97706' }} />
            <div>
              <p className="text-sm font-bold" style={{ color: ocrConfidence === 'baja' ? '#b91c1c' : '#b45309' }}>
                {ocrConfidence === 'baja' ? 'Lectura difícil' : 'Revisa con atención'}
              </p>
              {ocrNotes.map((note, i) => (
                <p key={i} className="text-xs mt-1 leading-relaxed" style={{ color: ocrConfidence === 'baja' ? '#ef4444' : '#d97706' }}>{note}</p>
              ))}
            </div>
          </div>
        )}

        {tipIncluded && tipAmount != null && (
          <div
            className="flex items-center gap-3 rounded-2xl px-4 py-3"
            style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
          >
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#2563eb' }} />
            <p className="text-sm" style={{ color: '#1d4ed8' }}>
              Propina ya incluida en la cuenta: <strong>${tipAmount.toLocaleString('es-CL')}</strong>
            </p>
          </div>
        )}

        {/* Totals summary card */}
        <div
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
        >
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: '#FFF1F2', color: '#f43f5e' }}
          >
            <Receipt className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Total leído</p>
            <p className="text-2xl font-black tabular-nums tracking-tight" style={{ color: '#0f172a' }}>
              ${sumItems.toLocaleString('es-CL')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#94a3b8' }}>Ítems</p>
            <p className="text-2xl font-black tabular-nums" style={{ color: '#0f172a' }}>{items.length}</p>
          </div>
        </div>

        {/* Restaurant name */}
        <div className="rounded-2xl p-4" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#94a3b8' }}>
            Restaurante (opcional)
          </p>
          <input
            type="text"
            value={restaurantName}
            onChange={(e) => setRestaurantName(e.target.value)}
            placeholder="Ej: La Pizzería"
            maxLength={60}
            className="w-full h-11 px-4 rounded-xl text-sm font-semibold placeholder:font-normal"
            style={{
              background: '#FFF7F7',
              border: '1.5px solid #e2e8f0',
              color: '#0f172a',
              outline: 'none',
            }}
          />
        </div>

        {/* Item list */}
        {items.map((item, idx) => (
          <div
            key={item.id}
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'white',
              boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
              borderLeft: item.confianza_item === 'baja' ? '4px solid #f59e0b' : '4px solid transparent',
            }}
          >
            <div className="flex items-start gap-3 p-4">
              {/* Index badge */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 mt-0.5"
                style={{ background: '#FFF1F2', color: '#f43f5e' }}
              >
                {idx + 1}
              </div>

              <div className="flex-1 space-y-2.5">
                <input
                  type="text"
                  value={item.nombre}
                  onChange={(e) => updateItem(item.id, 'nombre', e.target.value)}
                  placeholder="Nombre del ítem"
                  className="w-full text-sm font-bold bg-transparent focus:outline-none"
                  style={{ color: item.confianza_item === 'baja' ? '#b45309' : '#0f172a' }}
                />
                <div className="flex gap-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>Cantidad</p>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.cantidad}
                      min={1}
                      onChange={(e) => updateItem(item.id, 'cantidad', e.target.value)}
                      className="w-16 text-sm font-semibold bg-transparent focus:outline-none"
                      style={{ color: '#475569' }}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>Precio unitario</p>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.precio_unitario ?? ''}
                      placeholder="0"
                      onChange={(e) => updateItem(item.id, 'precio_unitario', e.target.value)}
                      className="w-full text-sm font-semibold bg-transparent focus:outline-none"
                      style={{ color: '#475569' }}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>Total</p>
                    <p className="text-sm font-bold tabular-nums" style={{ color: '#0f172a' }}>
                      {item.precio_total != null ? `$${item.precio_total.toLocaleString('es-CL')}` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                className="p-2 rounded-xl transition-colors active:scale-90 shrink-0"
                style={{ color: '#cbd5e1' }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {item.confianza_item === 'baja' && (
              <div
                className="mx-4 mb-3 flex items-center gap-2 rounded-xl px-3 py-2"
                style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: '#d97706' }} />
                <span className="text-xs font-semibold" style={{ color: '#b45309' }}>Lectura dudosa — verifica</span>
              </div>
            )}
          </div>
        ))}

        {/* Add item */}
        <button
          onClick={addItem}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition-colors"
          style={{ border: '1.5px dashed #FECDD3', color: '#f43f5e', background: 'transparent' }}
        >
          <Plus className="w-4 h-4" />
          Agregar ítem faltante
        </button>

        {/* Totals breakdown */}
        <div className="rounded-2xl p-4 space-y-2" style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#94a3b8' }}>Resumen</p>
          <div className="flex justify-between text-sm" style={{ color: '#475569' }}>
            <span>Suma de ítems ({items.length})</span>
            <span className="font-semibold tabular-nums" style={{ color: '#0f172a' }}>
              ${sumItems.toLocaleString('es-CL')}
            </span>
          </div>
          {subtotalDeclared != null && (
            <div className="flex justify-between text-sm" style={{ color: '#475569' }}>
              <span>Subtotal en la cuenta</span>
              <span className="tabular-nums">${subtotalDeclared.toLocaleString('es-CL')}</span>
            </div>
          )}
          {showDiffWarning && (
            <div
              className="flex items-center gap-2 mt-2 pt-3 rounded-xl px-3 py-2"
              style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#d97706' }} />
              <span className="text-xs font-semibold" style={{ color: '#b45309' }}>
                Diferencia de ${diff.toLocaleString('es-CL')} — ¿falta algún ítem?
              </span>
            </div>
          )}
        </div>

        {lowConfidenceItems.length > 0 && (
          <p className="text-xs text-center" style={{ color: '#d97706' }}>
            {lowConfidenceItems.length} ítem(s) marcado(s) como dudosos — verifica antes de continuar
          </p>
        )}
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 safe-bottom"
        style={{ background: 'linear-gradient(to top, #FFF7F7 60%, transparent)', borderTop: '1px solid #FFE4E6' }}
      >
        <button
          onClick={handleContinue}
          disabled={items.length === 0}
          className="w-full h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
        >
          Continuar — Participantes
        </button>
      </div>
    </div>
  )
}
