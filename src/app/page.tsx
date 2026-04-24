'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Camera, ChevronRight, Receipt, LogIn, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/calculations'
import { clearDraft } from '@/lib/store'
import { getDeviceId } from '@/lib/identity'
import { getSupabaseBrowser } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

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
  const [user, setUser] = useState<SupabaseUser | null>(null)

  useEffect(() => {
    clearDraft()

    const supabase = getSupabaseBrowser()

    // Get current session
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null))

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    fetch('/api/bills', { headers: { 'X-Device-Id': getDeviceId() } })
      .then((r) => r.json())
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [user]) // Refetch when auth state changes

  async function handleSignOut() {
    await getSupabaseBrowser().auth.signOut()
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      {/* Header */}
      <header className="safe-top text-white px-4 pt-4 pb-5" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Image src="/favicon-96x96.png" alt="SplitBill" width={28} height={28} className="sm:w-8 sm:h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SplitBill</h1>
              <p className="text-white/70 text-sm mt-0.5">Divide la cuenta sin dramas</p>
            </div>
          </Link>

          {/* Auth button */}
          {user ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <User className="w-3.5 h-3.5 text-white/80" />
                <span className="text-xs text-white/90 font-medium max-w-[100px] truncate">
                  {user.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleSignOut}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.15)' }}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <Link href="/login">
              <button
                className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}
              >
                <LogIn className="w-4 h-4" /> Entrar
              </button>
            </Link>
          )}
        </div>
      </header>

      {/* Main action */}
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

      {/* History */}
      <div className="flex-1 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Cuentas recientes
          </h2>
          {!user && (
            <Link href="/login" className="text-xs font-semibold" style={{ color: '#f43f5e' }}>
              Entra para sincronizar →
            </Link>
          )}
        </div>

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
            {!user && (
              <p className="text-xs mt-2">
                <Link href="/login" className="font-semibold" style={{ color: '#f43f5e' }}>Entra con tu email</Link>
                {' '}para acceder desde cualquier dispositivo
              </p>
            )}
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
                    <p className="text-sm text-slate-400 mt-0.5" suppressHydrationWarning>
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
