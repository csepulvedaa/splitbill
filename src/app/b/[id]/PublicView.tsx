'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Copy, CheckCheck, Share2, Camera, Pencil, CheckCircle2, UserCheck, MessageCircle } from 'lucide-react'
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
  const [canShare, setCanShare] = useState(false)
  const [paidMap, setPaidMap] = useState<Record<string, boolean>>(
    () => Object.fromEntries(summaries.map((s) => [s.participant.id, s.participant.paid ?? false]))
  )
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const currency = bill.currency
  const highlightRef = useRef<HTMLDivElement>(null)

  const allPaid = summaries.length > 0 && summaries.every((s) => paidMap[s.participant.id])

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  useEffect(() => {
    if (justSaved) toast.success('🎉 ¡Cuenta guardada! Comparte el link.')
    if (justEdited) toast.success('✅ Cuenta actualizada correctamente.')
  }, [justSaved, justEdited])

  // Scroll to highlighted person on load
  useEffect(() => {
    if (highlightName && highlightRef.current) {
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }
  }, [highlightName])

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

  function buildPersonLink(name: string) {
    const base = typeof window !== 'undefined' ? `${window.location.origin}/b/${billId}` : `/b/${billId}`
    return `${base}?para=${encodeURIComponent(name)}`
  }

  function buildPersonText(summary: PersonSummary) {
    const link = buildPersonLink(summary.participant.nombre)
    const lugar = bill.restaurant ? `en ${bill.restaurant}` : 'de la cuenta'
    return { text: `Hola ${summary.participant.nombre} 👋\nTu total ${lugar} es ${formatCurrency(summary.total, currency)}.\nVe el detalle aquí: ${link}`, link }
  }

  function openWhatsApp(text: string) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
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
    if (canShare) {
      try { await navigator.share({ title: 'SplitBill', text: buildShareText(), url: window.location.href }) }
      catch { /* cancelled */ }
    } else {
      openWhatsApp(buildShareText())
    }
  }

  async function handleSharePerson(summary: PersonSummary) {
    const { text, link } = buildPersonText(summary)
    if (canShare) {
      try { await navigator.share({ title: 'SplitBill', text, url: link }); return }
      catch { /* cancelled — fall through */ }
    } else {
      openWhatsApp(text)
    }
  }

  async function handleCopyMyAmount(summary: PersonSummary) {
    const { text } = buildPersonText(summary)
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Monto copiado')
    } catch { toast.error('No se pudo copiar') }
  }

  async function handleTogglePaid(participantId: string) {
    const newVal = !paidMap[participantId]
    setTogglingId(participantId)
    try {
      const res = await fetch(`/api/bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_paid', participant_id: participantId, paid: newVal }),
      })
      if (!res.ok) throw new Error()
      setPaidMap((prev) => ({ ...prev, [participantId]: newVal }))
    } catch { toast.error('Error al actualizar el estado de pago.') }
    finally { setTogglingId(null) }
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
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Image src="/favicon-96x96.png" alt="SplitBill" width={28} height={28} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-white tracking-tight">SplitBill</h1>
                {isSettled && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                    ✅ Liquidada
                  </span>
                )}
              </div>
              <p className="text-sm truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {bill.restaurant ?? 'División de cuenta'} · {new Date(bill.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
              </p>
            </div>
          </Link>
          <div className="text-right shrink-0">
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>Total</p>
            <p className="font-black text-xl text-white">{formatCurrency(grandTotal, currency)}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3 pb-56">
        {summaries.map((s, idx) => {
          const color = avatarColor(idx)
          const isHighlighted = highlightName
            ? s.participant.nombre.toLowerCase() === highlightName.toLowerCase()
            : false
          const isPaid = paidMap[s.participant.id] ?? false
          const isToggling = togglingId === s.participant.id

          return (
            <div key={s.participant.id} ref={isHighlighted ? highlightRef : null}
              className="bg-white rounded-3xl overflow-hidden"
              style={{
                boxShadow: isHighlighted ? '0 4px 20px rgba(244,63,94,0.18)' : '0 2px 12px rgba(0,0,0,0.07)',
                border: isPaid ? '1.5px solid #86efac' : isHighlighted ? '2px solid #f43f5e' : '1px solid #F1F5F9',
                opacity: isPaid ? 0.75 : 1,
              }}>
              <div className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  background: isPaid ? '#F0FDF4' : isHighlighted ? 'linear-gradient(135deg, #f43f5e, #fb923c)' : '#FAFAFA',
                  borderBottom: '1px solid #F1F5F9',
                }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black shrink-0"
                  style={isPaid ? { background: '#DCFCE7', color: '#16a34a' } : isHighlighted ? { background: 'rgba(255,255,255,0.25)', color: '#fff' } : { background: color.bg, color: color.text }}>
                  {isPaid ? '✓' : s.participant.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-base" style={{ color: isPaid ? '#16a34a' : isHighlighted ? '#fff' : '#0F172A' }}>
                      {s.participant.nombre}
                    </p>
                    {isPaid && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: '#DCFCE7', color: '#16a34a' }}>
                        Pagó ✓
                      </span>
                    )}
                  </div>
                  {isHighlighted && !isPaid && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>💸 Debes transferir</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-xl font-black" style={{ color: isPaid ? '#16a34a' : isHighlighted ? '#fff' : '#f43f5e' }}>
                    {formatCurrency(s.total, currency)}
                  </p>
                  {!highlightName && (
                    <button onClick={() => handleSharePerson(s)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                      style={{ background: 'rgba(244,63,94,0.08)', color: '#f43f5e' }}
                      title={`Compartir link de ${s.participant.nombre}`}>
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="px-4 py-3.5 space-y-2.5">
                {s.items.map((pi) => (
                  <div key={pi.item.id} className="flex justify-between items-baseline gap-2 text-sm">
                    <span className="text-slate-600 flex-1 leading-snug">
                      {pi.item.nombre}
                      {pi.fraccion < 1 && <span className="text-slate-400 text-xs ml-1.5">÷{Math.round(1 / pi.fraccion)} de {formatCurrency(pi.item.precio_total ?? 0, currency)}</span>}
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
                  <span className="text-xl font-black" style={{ color: isPaid ? '#16a34a' : '#f43f5e' }}>{formatCurrency(s.total, currency)}</span>
                </div>

                {/* Paid toggle — not shown when viewing a personal link */}
                {!highlightName && !isSettled && (
                  <button onClick={() => handleTogglePaid(s.participant.id)} disabled={isToggling}
                    className="w-full h-10 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-1 disabled:opacity-60"
                    style={isPaid
                      ? { background: '#F0FDF4', color: '#16a34a', border: '1px solid #BBF7D0' }
                      : { background: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0' }
                    }>
                    <CheckCircle2 className="w-4 h-4" />
                    {isToggling ? 'Guardando...' : isPaid ? 'Recibido ✓ — desmarcar' : 'Marcar como recibido'}
                  </button>
                )}

                {/* "Copy my amount" — only shown to the highlighted person */}
                {isHighlighted && (
                  <button onClick={() => handleCopyMyAmount(s)}
                    className="w-full h-10 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] mt-1"
                    style={{ background: '#FFF1F2', color: '#f43f5e', border: '1px solid #FECDD3' }}>
                    <UserCheck className="w-4 h-4" /> Copiar mi monto
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-3 pb-3 safe-bottom space-y-2" style={{ background: '#FFF7F7', borderTop: '1px solid #FFE4E6' }}>
        <button onClick={handleShare}
          className="w-full h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}>
          {canShare
            ? <><Share2 className="w-5 h-5" /> Compartir</>
            : <><MessageCircle className="w-5 h-5" /> Enviar por WhatsApp</>
          }
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
            style={allPaid
              ? { color: '#fff', background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.30)' }
              : { color: '#16a34a', border: '1px solid #BBF7D0', background: '#F0FDF4' }
            }>
            <CheckCircle2 className="w-4 h-4" />
            {settling ? 'Guardando...' : allPaid ? '¡Todos pagaron! Liquidar cuenta' : 'Marcar cuenta como liquidada'}
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
