'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Camera, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/calculations'
import { clearDraft } from '@/lib/store'
import { getDeviceId } from '@/lib/identity'

interface BillSummary {
  id: string
  created_at: string
  restaurant: string | null
  currency: string
  total_declared: number | null
  status?: string
}

export default function HomePage() {
  const [history, setHistory] = useState<BillSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clearDraft()
    fetch('/api/bills', { headers: { 'X-Device-Id': getDeviceId() } })
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      {/* Header */}
      <header className="safe-top text-white px-4 pt-4 pb-5" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SplitBill</h1>
            <p className="text-white/70 text-sm mt-0.5">Divide la cuenta sin dramas</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.svg" alt="SplitBill" className="w-10 h-10" />
        </div>
      </header>

      {/* Acción principal */}
      <div className="px-4 py-6">
        <Link href="/new">
          <Button
            size="lg"
            className="w-full h-16 text-lg gap-3 text-white rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
          >
            <Camera className="w-6 h-6" />
            Nueva cuenta
          </Button>
        </Link>
      </div>

      {/* Historial */}
      <div className="flex-1 px-4">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Cuentas recientes
        </h2>

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && history.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Aún no hay cuentas guardadas</p>
          </div>
        )}

        {!loading && history.length > 0 && (
          <div className="space-y-2">
            {history.map((bill) => (
              <Link key={bill.id} href={`/b/${bill.id}`}>
                <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-slate-100 active:bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-900">
                      {bill.restaurant ?? 'Sin nombre'}
                    </p>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {new Date(bill.created_at).toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bill.status === 'liquidada' && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Liquidada
                      </span>
                    )}
                    {bill.total_declared != null && (
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(bill.total_declared, bill.currency)}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="safe-bottom h-6" />
    </div>
  )
}
