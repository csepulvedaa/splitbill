'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowser()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError('No pudimos enviar el link. Verifica el email e intenta de nuevo.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      <header className="safe-top px-5 pt-5 pb-5" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <div className="flex items-center gap-3">
          <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center">
              <Image src="/favicon-96x96.png" alt="SplitBill" width={22} height={22} />
            </div>
            <span className="text-lg font-bold text-white">SplitBill</span>
          </Link>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {!sent ? (
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">Entra con tu email</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Te mandamos un link mágico. Sin contraseña, sin formularios.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  autoFocus
                  className="w-full h-14 px-4 rounded-2xl text-base outline-none transition-all"
                  style={{
                    background: '#fff',
                    border: '1.5px solid #E2E8F0',
                    color: '#0F172A',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#f43f5e')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500 px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
              >
                {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</> : <><Mail className="w-5 h-5" /> Enviar link mágico</>}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              Al entrar aceptas que usamos tu email solo para identificarte en la app.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <CheckCircle2 className="w-8 h-8" style={{ color: '#16a34a' }} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-2">Revisa tu email</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-1">
              Mandamos un link a
            </p>
            <p className="font-bold text-slate-800 text-base mb-6">{email}</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Toca el link en el email para entrar. Si no llega en un minuto, revisa la carpeta de spam.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-8 text-sm font-semibold"
              style={{ color: '#f43f5e' }}
            >
              Usar otro email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
