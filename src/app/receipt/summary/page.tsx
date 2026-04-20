'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Share2, Copy, CheckCheck, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getDraft, clearDraft } from '@/lib/store'
import { buildAssignments, calculateSummary, formatCurrency, round2 } from '@/lib/calculations'
import type { Item, Participant, PersonSummary } from '@/lib/types'

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

export default function SummaryPage() {
  const router = useRouter()
  const [summaries, setSummaries] = useState<PersonSummary[]>([])
  const [tipEnabled, setTipEnabled] = useState(true)
  const [tipIncluded, setTipIncluded] = useState(false)
  const [currency, setCurrency] = useState('CLP')
  const [totalDeclared, setTotalDeclared] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  const [items, setItems] = useState<Item[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [assignments, setAssignments] = useState<ReturnType<typeof buildAssignments>>([])
  const [editingBillId, setEditingBillId] = useState<string | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)

  useEffect(() => {
    const draft = getDraft()
    if (!draft || !draft.items.length || draft.participants.length < 2) {
      router.replace('/new')
      return
    }
    setEditingBillId(draft.editingBillId ?? null)
    setRestaurantName(draft.restaurantName ?? null)

    const builtItems = draft.items.map((i, idx) => ({
      ...i,
      bill_id: '',
      orden: idx,
    })) as Item[]

    const builtParticipants = draft.participants.map((p) => ({
      ...p,
      bill_id: '',
    })) as Participant[]

    const builtAssignments = buildAssignments(builtItems, draft.assignments)

    setItems(builtItems)
    setParticipants(builtParticipants)
    setAssignments(builtAssignments)
    setTipEnabled(draft.tipManualEnabled)
    setTipIncluded(draft.ocrResult?.propina_detectada.incluida ?? false)
    setCurrency(draft.ocrResult?.moneda ?? 'CLP')
    setTotalDeclared(draft.ocrResult?.total ?? null)
  }, [router])

  useEffect(() => {
    if (!items.length || !participants.length) return
    setSummaries(calculateSummary(items, participants, assignments, tipEnabled))
  }, [items, participants, assignments, tipEnabled])

  const grandTotal = round2(summaries.reduce((s, p) => s + p.total, 0))
  const diff = totalDeclared != null ? round2(Math.abs(grandTotal - totalDeclared)) : 0
  const showDiffWarning = totalDeclared != null && diff > 1

  function buildShareText(): string {
    const lines = ['🧾 SplitBill\n']
    summaries.forEach((s) => {
      lines.push(`👤 ${s.participant.nombre}`)
      s.items.forEach((pi) => {
        const share = pi.fraccion < 1 ? ` (÷${Math.round(1 / pi.fraccion)})` : ''
        lines.push(`   • ${pi.item.nombre}${share}: ${formatCurrency(pi.monto, currency)}`)
      })
      if (tipEnabled && s.propina > 0) {
        lines.push(`   • Propina (10%): ${formatCurrency(s.propina, currency)}`)
      }
      lines.push(`   TOTAL: ${formatCurrency(s.total, currency)}\n`)
    })
    return lines.join('\n')
  }

  async function handleSave() {
    setSaving(true)
    const draft = getDraft()
    if (!draft) return

    const url = editingBillId ? `/api/bills/${editingBillId}` : '/api/bills'
    const method = editingBillId ? 'PATCH' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill: {
            restaurant: restaurantName || null,
            currency,
            subtotal_declared: draft.ocrResult?.subtotal ?? null,
            tip_included: tipIncluded,
            tip_included_amount: draft.ocrResult?.propina_detectada.monto ?? null,
            total_declared: totalDeclared,
            tip_manual_enabled: tipEnabled,
            ocr_confidence: draft.ocrResult?.confianza_general ?? 'alta',
            ocr_notes: draft.ocrResult?.notas_ocr ?? [],
          },
          items: items.map((i) => ({ ...i, bill_id: undefined })),
          participants: participants.map((p) => ({ ...p, bill_id: undefined })),
          assignments,
        }),
      })

      if (!res.ok) throw new Error('Error guardando')

      const { id } = await res.json()
      clearDraft()
      router.push(`/b/${id}?saved=1&edited=${editingBillId ? '1' : '0'}`)
    } catch {
      toast.error('Error al guardar la cuenta. Intenta de nuevo.')
      setSaving(false)
    }
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(buildShareText())
      setCopied(true)
      toast.success('Texto copiado al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      {/* Header */}
      <header
        className="safe-top px-5 pt-5 pb-5"
        style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white tracking-tight">💰 Resumen</h1>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {summaries.length} persona{summaries.length !== 1 ? 's' : ''}
            </p>
          </div>
          {grandTotal > 0 && (
            <div
              className="px-3 py-1 rounded-full text-sm font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              {formatCurrency(grandTotal, currency)}
            </div>
          )}
        </div>
      </header>

      {/* Toggle propina */}
      <div className="mx-4 mt-4 bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      >
        <div>
          <p className="font-bold text-slate-900 text-sm">🤌 Propina 10%</p>
          {tipIncluded && (
            <p className="text-xs text-slate-400 mt-0.5">La cuenta ya incluye propina</p>
          )}
        </div>
        <button
          onClick={() => setTipEnabled((v) => !v)}
          className="relative w-12 h-6 rounded-full transition-colors duration-200"
          style={{ background: tipEnabled ? '#f43f5e' : '#E2E8F0' }}
        >
          <span
            className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200"
            style={{ transform: tipEnabled ? 'translateX(24px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      {/* Cards por persona */}
      <div className="flex-1 px-4 py-3 space-y-3 pb-44">
        {summaries.map((s, idx) => {
          const color = avatarColor(idx)
          return (
            <div
              key={s.participant.id}
              className="bg-white rounded-3xl overflow-hidden"
              style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}
            >
              {/* Header persona */}
              <div
                className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: '1px solid #F8FAFC' }}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black shrink-0"
                  style={{ background: color.bg, color: color.text }}
                >
                  {s.participant.nombre.charAt(0).toUpperCase()}
                </div>
                <p className="font-bold text-slate-900 flex-1 text-base">
                  {s.participant.nombre}
                </p>
                <p className="text-xl font-black" style={{ color: '#f43f5e' }}>
                  {formatCurrency(s.total, currency)}
                </p>
              </div>

              {/* Ítems */}
              <div className="px-4 py-3.5 space-y-2.5">
                {s.items.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Sin ítems asignados</p>
                ) : (
                  s.items.map((pi) => (
                    <div key={pi.item.id} className="flex justify-between items-baseline gap-2 text-sm">
                      <span className="text-slate-600 flex-1 leading-snug">
                        {pi.item.nombre}
                        {pi.fraccion < 1 && (
                          <span className="text-slate-400 text-xs ml-1.5">
                            ÷{Math.round(1 / pi.fraccion)} de {formatCurrency(pi.item.precio_total ?? 0, currency)}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold text-slate-800 shrink-0 tabular-nums">
                        {formatCurrency(pi.monto, currency)}
                      </span>
                    </div>
                  ))
                )}

                {tipEnabled && s.propina > 0 && (
                  <div className="flex justify-between text-sm" style={{ color: '#94A3B8' }}>
                    <span>Propina (10%)</span>
                    <span className="tabular-nums">{formatCurrency(s.propina, currency)}</span>
                  </div>
                )}

                {s.items.length > 0 && (
                  <>
                    <div className="h-px" style={{ background: '#F1F5F9' }} />
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-sm font-bold text-slate-700">Total</span>
                      <span className="text-2xl font-black" style={{ color: '#f43f5e' }}>
                        {formatCurrency(s.total, currency)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}

        {/* Validación */}
        <div
          className={`rounded-2xl p-4 text-sm ${showDiffWarning ? '' : 'bg-white'}`}
          style={
            showDiffWarning
              ? { background: '#FFFBEB', border: '1px solid #FDE68A' }
              : { boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #F1F5F9' }
          }
        >
          <div className="flex justify-between text-slate-700">
            <span className="font-semibold">📊 Total asignado</span>
            <span className="font-black tabular-nums">{formatCurrency(grandTotal, currency)}</span>
          </div>
          {totalDeclared != null && (
            <div className="flex justify-between text-slate-400 mt-1.5">
              <span>Total de la cuenta</span>
              <span className="tabular-nums">{formatCurrency(totalDeclared, currency)}</span>
            </div>
          )}
          {showDiffWarning && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-2.5" style={{ color: '#B45309', borderTop: '1px solid #FDE68A' }}>
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Diferencia de {formatCurrency(diff, currency)} — revisa ítems sin asignar</span>
            </div>
          )}
          {!showDiffWarning && diff > 0 && diff <= 1 && (
            <p className="text-xs text-slate-400 mt-1.5">
              Diferencia de {formatCurrency(diff, currency)} por redondeo — normal al dividir
            </p>
          )}
        </div>
      </div>

      {/* CTAs fijos */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-3 safe-bottom space-y-2"
        style={{ background: '#FFF7F7', borderTop: '1px solid #FFE4E6' }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #f43f5e, #fb923c)',
            boxShadow: '0 4px 20px rgba(244,63,94,0.35)',
          }}
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              Guardar y compartir link
            </>
          )}
        </button>
        <button
          onClick={handleCopyText}
          className="w-full h-12 rounded-2xl text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-white"
          style={{ color: '#64748B', border: '1px solid #E2E8F0' }}
        >
          {copied
            ? <><CheckCheck className="w-4 h-4" style={{ color: '#22c55e' }} /> Copiado</>
            : <><Copy className="w-4 h-4" /> Copiar como texto</>
          }
        </button>
      </div>
    </div>
  )
}
