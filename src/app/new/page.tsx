'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ImageIcon, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { compressImage } from '@/lib/compress'
import { saveDraft, emptyDraft } from '@/lib/store'
import type { OcrResult, EditableItem } from '@/lib/types'

export default function NewPage() {
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
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

    if (file.size > 10 * 1024 * 1024) {
      setError('La imagen es demasiado grande. Máximo 10MB.')
      return
    }
    if (!file.type.startsWith('image/')) {
      setError('Solo se aceptan imágenes.')
      return
    }

    setProcessing(true)

    // Rotate status messages
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
        throw new Error(data.error ?? 'Error al procesar la imagen.')
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
      setError(msg)
    } finally {
      clearInterval(interval)
      setProcessing(false)
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  if (processing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh text-white px-8" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <div className="relative w-20 h-20 mb-8">
          <div className="absolute inset-0 rounded-full border-4 border-white/30" />
          <div className="absolute inset-0 rounded-full border-4 border-t-white animate-spin" />
        </div>
        <p className="text-xl font-semibold text-center mb-2">{statusMsg}</p>
        <p className="text-white/70 text-sm text-center">Esto toma entre 10 y 20 segundos</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      <header className="safe-top text-white px-4 pt-4 pb-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold">📸 Nueva cuenta</h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        {error && (
          <div className="w-full flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={() => cameraInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 text-white rounded-3xl h-44 transition-colors"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
        >
          <Camera className="w-10 h-10" />
          <span className="text-lg font-semibold">Tomar foto</span>
          <span className="text-white/70 text-sm">Apunta a la cuenta</span>
        </button>

        <button
          onClick={() => galleryInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 rounded-3xl h-32 active:bg-slate-50 transition-colors"
        >
          <ImageIcon className="w-8 h-8" />
          <span className="text-base font-semibold">Subir desde galería</span>
        </button>

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
      </div>

      <div className="safe-bottom h-6" />
    </div>
  )
}
