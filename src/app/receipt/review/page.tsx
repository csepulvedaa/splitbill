'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle, Plus, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
    // Validar que no haya ítems sin precio
    const missing = items.filter((i) => i.precio_total == null || i.precio_total === 0)
    if (missing.length > 0 && !confirm(`Hay ${missing.length} ítem(s) sin precio. ¿Continuar de todas formas?`)) {
      return
    }
    draft.items = items
    draft.restaurantName = restaurantName.trim() || undefined
    saveDraft(draft)
    router.push('/receipt/participants')
  }

  const sumItems = round2(
    items.reduce((sum, i) => sum + (i.precio_total ?? 0), 0),
  )
  const diff = subtotalDeclared != null ? round2(Math.abs(sumItems - subtotalDeclared)) : 0
  const showDiffWarning = subtotalDeclared != null && diff > 0.5

  const lowConfidenceItems = items.filter((i) => i.confianza_item === 'baja')

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      <header className="safe-top text-white px-4 pt-4 pb-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">✏️ Revisa los ítems</h1>
          <p className="text-white/70 text-xs mt-0.5">Toca cualquier campo para editar</p>
        </div>
      </header>

      {/* Banners de advertencia OCR */}
      {ocrConfidence !== 'alta' && (
        <div
          className={`mx-4 mt-4 flex items-start gap-3 rounded-2xl p-3.5 text-sm ${
            ocrConfidence === 'baja'
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-amber-50 border border-amber-200 text-amber-700'
          }`}
        >
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {ocrConfidence === 'baja' ? 'Lectura difícil' : 'Revisa con atención'}
            </p>
            {ocrNotes.map((note, i) => (
              <p key={i} className="mt-0.5 opacity-80">{note}</p>
            ))}
          </div>
        </div>
      )}

      {tipIncluded && tipAmount != null && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-blue-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Propina incluida en la cuenta: <strong>${tipAmount.toLocaleString('es-CL')}</strong></span>
        </div>
      )}

      {/* Nombre del restaurante */}
      <div className="mx-4 mt-4">
        <label className="text-xs text-slate-400 mb-1 block">Nombre del restaurante (opcional)</label>
        <input
          type="text"
          value={restaurantName}
          onChange={(e) => setRestaurantName(e.target.value)}
          placeholder="Ej: La Pizzería"
          maxLength={60}
          className="w-full h-11 px-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 text-sm"
        />
      </div>

      {/* Lista de ítems */}
      <div className="flex-1 px-4 mt-4 space-y-2 pb-4">
        {items.map((item) => (
          <div
            key={item.id}
            className={`bg-white rounded-2xl border shadow-sm p-4 ${
              item.confianza_item === 'baja'
                ? 'border-amber-300'
                : 'border-slate-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-2">
                {/* Nombre */}
                <input
                  type="text"
                  value={item.nombre}
                  onChange={(e) => updateItem(item.id, 'nombre', e.target.value)}
                  placeholder="Nombre del ítem"
                  className="w-full text-slate-900 font-medium bg-transparent focus:outline-none border-b border-transparent focus:border-slate-200 pb-0.5"
                />
                <div className="flex gap-3">
                  {/* Cantidad */}
                  <div className="flex-none">
                    <label className="text-xs text-slate-400">Cantidad</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.cantidad}
                      min={1}
                      onChange={(e) => updateItem(item.id, 'cantidad', e.target.value)}
                      className="w-16 text-slate-700 bg-transparent focus:outline-none border-b border-transparent focus:border-slate-200 text-sm"
                    />
                  </div>
                  {/* Precio unitario */}
                  <div className="flex-1">
                    <label className="text-xs text-slate-400">Precio unitario</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.precio_unitario ?? ''}
                      placeholder="0"
                      onChange={(e) => updateItem(item.id, 'precio_unitario', e.target.value)}
                      className="w-full text-slate-700 bg-transparent focus:outline-none border-b border-transparent focus:border-slate-200 text-sm"
                    />
                  </div>
                  {/* Precio total */}
                  <div className="flex-1">
                    <label className="text-xs text-slate-400">Total</label>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.precio_total != null
                        ? `$${item.precio_total.toLocaleString('es-CL')}`
                        : '—'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => removeItem(item.id)}
                className="p-2 text-slate-300 hover:text-red-400 transition-colors mt-1"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            {item.confianza_item === 'baja' && (
              <Badge variant="outline" className="mt-2 text-amber-600 border-amber-300 text-xs">
                Lectura dudosa — verifica
              </Badge>
            )}
          </div>
        ))}

        {/* Agregar ítem */}
        <button
          onClick={addItem}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Agregar ítem manualmente</span>
        </button>

        {/* Validación de totales */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-1 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Suma de ítems</span>
            <span className="font-semibold">${sumItems.toLocaleString('es-CL')}</span>
          </div>
          {subtotalDeclared != null && (
            <div className="flex justify-between text-slate-600">
              <span>Subtotal en cuenta</span>
              <span>${subtotalDeclared.toLocaleString('es-CL')}</span>
            </div>
          )}
          {showDiffWarning && (
            <div className="flex items-center gap-1.5 text-amber-600 mt-2 pt-2 border-t border-amber-200">
              <AlertTriangle className="w-4 h-4" />
              <span>Diferencia de ${diff.toLocaleString('es-CL')} — revisa si falta algún ítem</span>
            </div>
          )}
        </div>

        {lowConfidenceItems.length > 0 && (
          <p className="text-xs text-center text-amber-600">
            {lowConfidenceItems.length} ítem(s) marcado(s) como dudosos — verifica antes de continuar
          </p>
        )}
      </div>

      {/* CTA fijo */}
      <div className="sticky bottom-0 px-4 py-3 safe-bottom" style={{ background: '#FFF7F7', borderTop: '1px solid #FFE4E6' }}>
        <Button
          onClick={handleContinue}
          size="lg"
          className="w-full h-14 text-base rounded-2xl text-white"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
          disabled={items.length === 0}
        >
          Continuar — Participantes
        </Button>
      </div>
    </div>
  )
}
