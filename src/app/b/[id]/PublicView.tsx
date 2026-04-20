'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Copy, CheckCheck, Share2, Camera } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/calculations'
import type { Bill, PersonSummary } from '@/lib/types'

interface Props {
  bill: Bill
  summaries: PersonSummary[]
  highlightName?: string
  justSaved?: boolean
}

export default function PublicView({ bill, summaries, highlightName, justSaved }: Props) {
  const [copied, setCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (justSaved) {
      toast.success('¡Cuenta guardada! Comparte el link con tus amigos.')
    }
  }, [justSaved])

  const currency = bill.currency

  function buildShareText(): string {
    const lines = ['🧾 SplitBill\n']
    summaries.forEach((s) => {
      lines.push(`👤 ${s.participant.nombre}`)
      s.items.forEach((pi) => {
        const share = pi.fraccion < 1 ? ` (÷${Math.round(1 / pi.fraccion)})` : ''
        lines.push(`   • ${pi.item.nombre}${share}: ${formatCurrency(pi.monto, currency)}`)
      })
      if (bill.tip_manual_enabled && s.propina > 0) {
        lines.push(`   • Propina (10%): ${formatCurrency(s.propina, currency)}`)
      }
      lines.push(`   TOTAL: ${formatCurrency(s.total, currency)}\n`)
    })
    lines.push(`Ver detalle: ${window.location.href}`)
    return lines.join('\n')
  }

  async function handleCopyText() {
    try {
      await navigator.clipboard.writeText(buildShareText())
      setCopied(true)
      toast.success('Texto copiado')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar')
    }
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setLinkCopied(true)
      toast.success('Link copiado')
      setTimeout(() => setLinkCopied(false), 2000)
    } catch {
      toast.error('No se pudo copiar el link')
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SplitBill — División de cuenta',
          text: buildShareText(),
          url: window.location.href,
        })
      } catch {
        // El usuario canceló
      }
    } else {
      handleCopyLink()
    }
  }

  const grandTotal = summaries.reduce((s, p) => s + p.total, 0)

  return (
    <div className="flex flex-col min-h-dvh">
      <header className="safe-top bg-slate-900 text-white px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">SplitBill</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {bill.restaurant ?? 'División de cuenta'} —{' '}
              {new Date(bill.created_at).toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Total</p>
            <p className="font-bold text-lg">{formatCurrency(grandTotal, currency)}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3 pb-40">
        {summaries.map((s) => {
          const isHighlighted =
            highlightName &&
            s.participant.nombre.toLowerCase() === highlightName.toLowerCase()

          return (
            <div
              key={s.participant.id}
              className={`rounded-2xl border shadow-sm overflow-hidden ${
                isHighlighted
                  ? 'border-slate-900 ring-2 ring-slate-900'
                  : 'border-slate-100 bg-white'
              }`}
            >
              <div
                className={`flex items-center gap-3 px-4 py-3.5 border-b ${
                  isHighlighted
                    ? 'bg-slate-900 text-white border-slate-700'
                    : 'bg-slate-50 border-slate-100'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    isHighlighted ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
                  }`}
                >
                  {s.participant.nombre.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold flex-1">{s.participant.nombre}</p>
                {isHighlighted && (
                  <span className="text-xs bg-white text-slate-900 px-2 py-0.5 rounded-full font-medium">
                    Tú
                  </span>
                )}
              </div>

              <div className="px-4 py-3 space-y-2 bg-white">
                {s.items.map((pi) => (
                  <div key={pi.item.id} className="flex justify-between text-sm">
                    <span className="text-slate-600 flex-1 pr-2">
                      {pi.item.nombre}
                      {pi.fraccion < 1 && (
                        <span className="text-slate-400 ml-1">÷{Math.round(1 / pi.fraccion)}</span>
                      )}
                    </span>
                    <span className="text-slate-700 shrink-0">
                      {formatCurrency(pi.monto, currency)}
                    </span>
                  </div>
                ))}

                {bill.tip_manual_enabled && s.propina > 0 && (
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>Propina (10%)</span>
                    <span>{formatCurrency(s.propina, currency)}</span>
                  </div>
                )}

                <Separator className="my-2" />

                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-900">
                    {isHighlighted ? '💸 Debes transferir' : 'Total'}
                  </span>
                  <span
                    className={`font-bold ${isHighlighted ? 'text-2xl text-slate-900' : 'text-xl text-slate-900'}`}
                  >
                    {formatCurrency(s.total, currency)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* CTAs fijos */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 pt-3 pb-3 safe-bottom space-y-2">
        <Button
          onClick={handleShare}
          size="lg"
          className="w-full h-14 text-base rounded-2xl bg-slate-900 hover:bg-slate-800 text-white"
        >
          <Share2 className="w-5 h-5 mr-2" />
          Compartir
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={handleCopyText}
            variant="outline"
            size="lg"
            className="flex-1 h-12 text-sm rounded-2xl border-slate-200"
          >
            {copied ? <CheckCheck className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
            {copied ? 'Copiado' : 'Copiar texto'}
          </Button>

          <Link href="/" className="flex-1">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12 text-sm rounded-2xl border-slate-200"
            >
              <Camera className="w-4 h-4 mr-1.5" />
              Nueva cuenta
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
