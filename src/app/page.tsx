'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Camera, Receipt, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/calculations'
import { clearDraft } from '@/lib/store'

interface BillSummary {
  id: string
  created_at: string
  restaurant: string | null
  currency: string
  total_declared: number | null
}

export default function HomePage() {
  const [history, setHistory] = useState<BillSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clearDraft()
    fetch('/api/bills')
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-dvh">
      {/* Header */}
      <header className="safe-top bg-slate-900 text-white px-4 pt-4 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SplitBill</h1>
            <p className="text-slate-400 text-sm mt-0.5">Divide la cuenta sin dramas</p>
          </div>
          <Receipt className="w-8 h-8 text-slate-400" />
        </div>
      </header>

      {/* Acción principal */}
      <div className="px-4 py-6">
        <Link href="/new">
          <Button
            size="lg"
            className="w-full h-16 text-lg gap-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl"
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
