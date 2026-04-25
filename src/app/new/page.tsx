'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ImageIcon, ArrowLeft, AlertCircle, PenLine, AlertTriangle } from 'lucide-react'
import { compressImage } from '@/lib/compress'
import { saveDraft, emptyDraft } from '@/lib/store'
import type { OcrResult, EditableItem } from '@/lib/types'

export default function NewPage() {
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<'bad_photo' | 'provider_error' | null>(null)
  const [processing, setProcessing] = useState(false)
  const [statusMsg, setStatusMsg] = useState('Leyendo la cuenta...')

  const MESSAGES = [
    'Leyendo la cuenta...',
    'Identificando platos y precios...',
    'Organizando los ítems...',
    'Casi listo...',
  ]

  async function handleFile(file: File) {
    setError(null)
    setErrorCode(null)

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 10MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes.')
      return
    }

    setProcessing(true)

    let msgIdx = 0
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % MESSAGES.length
      setStatusMsg(MESSAGES[msgIdx])
    }, 3500)

    try {
      const compressed = await compressImage(file, 768)

      const res = await fetch('/api/analyze-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: compressed }),
        signal: AbortSignal.timeout(90_000),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const err = new Error(data.error ?? 'Error al procesar la imagen.')
        ;(err as Error & { code?: string }).code = data.code ?? null
        throw err
      }

      const ocrResult: OcrResult = await res.json()

      const items: EditableItem[] = ocrResult.items.map((item) => ({
        ...item,
        is_manually_added: false,
      }))

      const draft = emptyDraft()
      draft.ocrResult = ocrResult
      draft.items = items
      draft.tipManualEnabled = !ocrResult.propina_detectada.incluida
      saveDraft(draft)

      router.push('/receipt/review')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido.'
      const code = (err as Error & { code?: string }).code ?? null
      setError(msg)
      setErrorCode(code as 'bad_photo' | 'provider_error' | null)
      setProcessing(false)
      clearInterval(interval)
    } finally {
      clearInterval(interval)
      setProcessing(false)
    }
  }

  function handleManualEntry() {
    const draft = emptyDraft()
    draft.items = []
    draft.tipManualEnabled = true
    saveDraft(draft)
    router.push('/receipt/review')
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-8" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-white/30" />
          <div className="absolute inset-0 rounded-full border-4 border-t-white animate-spin" />
        </div>
        <p className="text-xl font-bold text-white text-center mb-2">{statusMsg}</p>
        <p className="text-white/70 text-sm text-center">Esto toma entre 10 y 20 segundos</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      <header className="safe-top text-white px-5 pt-5 pb-6 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full shrink-0"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">📸 Nueva cuenta</h1>
          <p className="text-white/75 text-xs mt-0.5">Fotografía el ticket o ingresa manual</p>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-5 py-5 gap-4">

        {/* Error block */}
        {error && (
          <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1px solid #FECDD3', boxShadow: '0 2px 12px rgba(244,63,94,0.10)' }}>
            <div className="px-4 pt-4 pb-3 flex items-start gap-3">
              {errorCode === 'bad_photo'
                ? <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#f43f5e' }} />
                : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: '#f43f5e' }} />
              }
              <div>
                <p className="font-bold text-sm" style={{ color: '#1e293b' }}>
                  {errorCode === 'bad_photo' ? 'No pudimos leer la foto' : 'Servicio no disponible'}
                </p>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: '#64748b' }}>
                  {errorCode === 'bad_photo'
                    ? 'Intenta con mejor iluminación, más cerca o sin flash.'
                    : 'El lector de cuentas falló. Puedes ingresar los ítems manualmente.'}
                </p>
              </div>
            </div>
            <div className="px-4 pb-4 flex flex-col gap-2">
              {errorCode === 'bad_photo' && (
                <button
                  onClick={() => { setError(null); setErrorCode(null); cameraInputRef.current?.click() }}
                  className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#FFF1F2', color: '#f43f5e', border: '1.5px solid #FECDD3' }}
                >
                  <Camera className="w-4 h-4" />
                  Intentar con otra foto
                </button>
              )}
              <button
                onClick={handleManualEntry}
                className="w-full h-11 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}
              >
                <PenLine className="w-4 h-4" />
                Ingresar ítems manualmente
              </button>
            </div>
          </div>
        )}

        {/* Camera button */}
        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 text-white rounded-3xl h-44 transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #f43f5e, #fb923c)',
            boxShadow: '0 8px 32px rgba(244,63,94,0.30)',
          }}
        >
          <Camera className="w-10 h-10" />
          <div className="text-center">
            <p className="text-lg font-bold">Tomar foto</p>
            <p className="text-white/70 text-sm mt-0.5">Apunta a la cuenta del restaurante</p>
          </div>
        </button>

        {/* Gallery button */}
        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-3 bg-white rounded-2xl h-16 active:bg-slate-50 transition-colors"
          style={{ border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FFF1F2' }}>
            <ImageIcon className="w-5 h-5" style={{ color: '#f43f5e' }} />
          </div>
          <span className="text-base font-semibold text-slate-700">Subir desde galería</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
          <span className="text-xs font-medium text-slate-400">o</span>
          <div className="flex-1 h-px" style={{ background: '#e2e8f0' }} />
        </div>

        {/* Manual entry */}
        <button
          onClick={handleManualEntry}
          className="w-full flex items-center justify-center gap-2 h-14 rounded-2xl text-sm font-semibold bg-white active:bg-slate-50 transition-colors"
          style={{ color: '#f43f5e', border: '1.5px dashed #FECDD3' }}
        >
          <PenLine className="w-4 h-4" />
          Ingresar sin foto
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="safe-bottom h-4" />
    </div>
  )
}
