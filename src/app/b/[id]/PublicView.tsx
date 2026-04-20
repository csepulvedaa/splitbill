'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, CheckCheck, Share2, Camera, Pencil, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/calculations'
import type { Bill, PersonSummary } from '@/lib/types'

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

interface Props {
  bill: Bill
  billId: string
  summaries: PersonSummary[]
  highlightName?: string
  justSaved?: boolean
  justEdited?: boolean
}

export default function PublicView({ bill, billId, summaries, highlightName, justSaved, justEdited }: Props) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [settling, setSettling] = useState(false)
  const [isSettled, setIsSettled] = useState(bill.status === 'liquidada')
  const currency = bill.currency

  useEffect(() => {
    if (justSaved) toast.success('🎉 ¡Cuenta guardada! Comparte el link.')
    if (justEdited) toast.success('✅ Cuenta actualizada correctamente.')
  }, [justSaved, justEdited])

  function buildShareText(): string {
    const lines = ['🧾 SplitBill\n']
    summaries.forEach((s) => {
      lines.push(`👤 ${s.participant.nombre}`)
      s.items.forEach((pi) => {
        const share = pi.fraccion < 1 ? ` (÷${Math.round(1 / pi.fraccion)})` : ''
        lines.push(`   • ${pi.item.nombre}${share}: ${formatCurrency(pi.monto, currency)}`)
      })
      if (bill.tip_manual_enabled && s.propina > 0)
        lines.push(`   • Propina (10%): ${formatCurrency(s.propina, currency)}`)
      lines.push(`   TOTAL: ${formatCurrency(s.total, currency)}\n`)
    })
    if (typeof window !== 'undefined') lines.push(`Ver detalle: ${window.location.href}`)
    return lines.join('\n')
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(buildShareText())
      setCopied(true)
      toast.success('Texto copiado')
      setTimeout(() => setCopied(false), 2000)
    } catch { toast.error('No se pudo copiar') }
  }

  async function handleShare() {
    if (navigator.share) {
      try { await navigator.share({ title: 'SplitBill', text: buildShareText(), url: window.location.href }) }
      catch { /* cancelado */ }
    } else { handleCopyText() }
  }

  async function handleSettle() {
    setSettling(true)
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'settle' }),
      })
      if (!res.ok) throw new Error()
      setIsSettled(true)
      toast.success('🎊 ¡Cuenta marcada como liquidada!')
      router.refresh()
    } catch { toast.error('Error al liquidar la cuenta.') }
    finally { setSettling(false) }
  }

  const grandTotal = summaries.reduce((s, p) => s + p.total, 0)

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      <header className="safe-top px-5 pt-5 pb-5" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">🧾 SplitBill</h1>
              {isSettled && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                  ✅ Liquidada
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {bill.restaurant ?? 'División de cuenta'} · {new Date(bill.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Total</p>
            <p className="font-black text-xl text-white">{formatCurrency(grandTotal, currency)}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3 pb-56">
        {summaries.map((s, idx) => {
          const color = avatarColor(idx)
          const isHighlighted = highlightName && s.participant.nombre.toLowerCase() === highlightName.toLowerCase()

          return (
            <div key={s.participant.id} className="bg-white rounded-3xl overflow-hidden"
              style={{
                boxShadow: isHighlighted ? '0 4px 20px rgba(244,63,94,0.18)' : '0 2px 12px rgba(0,0,0,0.07)',
                border: isHighlighted ? '2px solid #f43f5e' : '1px solid #F1F5F9',
              }}>
              <div className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  background: isHighlighted ? 'linear-gradient(135deg, #f43f5e, #fb923c)' : '#FAFAFA',
                  borderBottom: '1px solid #F1F5F9',
                }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black shrink-0"
                  style={isHighlighted ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: color.bg, color: color.text }}>
                  {s.participant.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base" style={{ color: isHighlighted ? '#fff' : '#0F172A' }}>{s.participant.nombre}</p>
                  {isHighlighted && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>💸 Debes transferir</p>}
                </div>
                <p className="text-xl font-black shrink-0" style={{ color: isHighlighted ? '#fff' : '#f43f5e' }}>
                  {formatCurrency(s.total, currency)}
                </p>
              </div>

              <div className="px-4 py-3.5 space-y-2.5">
                {s.items.map((pi) => (
                  <div key={pi.item.id} className="flex justify-between items-baseline gap-2 text-sm">
                    <span className="text-slate-600 flex-1 leading-snug">
                      {pi.item.nombre}
                      {pi.fraccion < 1 && <span className="text-slate-400 text-xs ml-1.5">÷{Math.round(1 / pi.fraccion)}</span>}
                    </span>
                    <span className="font-semibold text-slate-800 shrink-0 tabular-nums">{formatCurrency(pi.monto, currency)}</span>
                  </div>
                ))}
                {bill.tip_manual_enabled && s.propina > 0 && (
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Propina (10%)</span>
                    <span className="tabular-nums">{formatCurrency(s.propina, currency)}</span>
                  </div>
                )}
                <div className="h-px" style={{ background: '#F1F5F9' }} />
                <div className="flex justify-between items-center pt-0.5">
                  <span className="text-sm font-semibold text-slate-600">Total</span>
                  <span className="text-xl font-black" style={{ color: '#f43f5e' }}>{formatCurrency(s.total, currency)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-3 safe-bottom space-y-2" style={{ background: '#FFF7F7', borderTop: '1px solid #FFE4E6' }}>
        <button onClick={handleShare}
          className="w-full h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}>
          <Share2 className="w-5 h-5" /> Compartir
        </button>

        <div className="flex gap-2">
          <button onClick={handleCopyText}
            className="flex-1 h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 bg-white transition-all active:scale-[0.98]"
            style={{ color: '#64748B', border: '1px solid #E2E8F0' }}>
            {copied ? <><CheckCheck className="w-4 h-4" style={{ color: '#22c55e' }} />Copiado</> : <><Copy className="w-4 h-4" />Copiar texto</>}
          </button>

          {!isSettled && (
            <Link href={`/b/${billId}/edit`} className="flex-1">
              <button className="w-full h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 bg-white transition-all active:scale-[0.98]"
                style={{ color: '#6366F1', border: '1px solid #C7D2FE' }}>
                <Pencil className="w-4 h-4" /> Editar
              </button>
            </Link>
          )}

          {isSettled && (
            <Link href="/" className="flex-1">
              <button className="w-full h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-1.5 bg-white transition-all active:scale-[0.98]"
                style={{ color: '#64748B', border: '1px solid #E2E8F0' }}>
                <Camera className="w-4 h-4" /> Nueva cuenta
              </button>
            </Link>
          )}
        </div>

        {!isSettled ? (
          <button onClick={handleSettle} disabled={settling}
            className="w-full h-11 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ color: '#16a34a', border: '1px solid #BBF7D0', background: '#F0FDF4' }}>
            <CheckCircle2 className="w-4 h-4" />
            {settling ? 'Guardando...' : '¡Ya pagamos todos! Marcar como liquidada'}
          </button>
        ) : (
          <div className="w-full h-11 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ color: '#16a34a', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <CheckCircle2 className="w-4 h-4" /> Cuenta liquidada 🎊
          </div>
        )}
      </div>
    </div>
  )
}
