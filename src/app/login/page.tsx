'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail, CheckCircle2, Loader2, KeyRound } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase'

type Step = 'email' | 'code' | 'done'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('email')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmitEmail(e: React.FormEvent) {
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
      setError(error.message.includes('rate') || error.message.includes('limit')
        ? 'Espera un minuto antes de pedir otro código.'
        : `Error: ${error.message}`)
      setLoading(false)
      return
    }

    setStep('code')
    setLoading(false)
  }

  async function handleSubmitCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim().length < 6) return
    setLoading(true)
    setError(null)

    const supabase = getSupabaseBrowser()
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })

    if (error) {
      setError('Código incorrecto o expirado. Revisa el email o pide uno nuevo.')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
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

        {/* Step 1: Email */}
        {step === 'email' && (
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
                <Mail className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">Entra con tu email</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Te mandamos un código de 6 dígitos. Sin contraseña.
              </p>
            </div>

            <form onSubmit={handleSubmitEmail} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                className="w-full h-14 px-4 rounded-2xl text-base outline-none transition-all"
                style={{ background: '#fff', border: '1.5px solid #E2E8F0', color: '#0F172A' }}
                onFocus={(e) => (e.target.style.borderColor = '#f43f5e')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />

              {error && <p className="text-sm text-red-500 px-1">{error}</p>}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>
                  : <><Mail className="w-5 h-5" /> Enviar código</>}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              Al entrar aceptas que usamos tu email solo para identificarte en la app.
            </p>
          </div>
        )}

        {/* Step 2: OTP code */}
        {step === 'code' && (
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 mb-2">Ingresa el código</h1>
              <p className="text-slate-500 text-sm leading-relaxed mb-1">
                Mandamos un código de 6 dígitos a
              </p>
              <p className="font-bold text-slate-800 text-base">{email}</p>
            </div>

            <form onSubmit={handleSubmitCode} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
                autoFocus
                className="w-full h-14 px-4 rounded-2xl text-base text-center tracking-[0.5em] font-bold outline-none transition-all"
                style={{ background: '#fff', border: '1.5px solid #E2E8F0', color: '#0F172A', fontSize: '1.5rem' }}
                onFocus={(e) => (e.target.style.borderColor = '#f43f5e')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />

              {error && <p className="text-sm text-red-500 px-1">{error}</p>}

              <button
                type="submit"
                disabled={loading || code.length < 6}
                className="w-full h-14 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
              >
                {loading
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</>
                  : <><CheckCircle2 className="w-5 h-5" /> Entrar</>}
              </button>
            </form>

            <div className="flex flex-col items-center gap-3 mt-6">
              <button
                onClick={handleSubmitEmail as unknown as React.MouseEventHandler}
                disabled={loading}
                className="text-sm font-semibold disabled:opacity-40"
                style={{ color: '#f43f5e' }}
                type="button"
              >
                Reenviar código
              </button>
              <button
                onClick={() => { setStep('email'); setCode(''); setError(null) }}
                className="text-sm text-slate-400"
                type="button"
              >
                Usar otro email
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
