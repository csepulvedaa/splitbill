'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDraft, saveDraft } from '@/lib/store'
import type { ParticipantDraft } from '@/lib/types'

export default function ParticipantsPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [participants, setParticipants] = useState<ParticipantDraft[]>([])
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    const draft = getDraft()
    if (!draft || !draft.items.length) {
      router.replace('/new')
      return
    }
    setParticipants(draft.participants)
  }, [router])

  function addParticipant() {
    const name = inputValue.trim()
    if (!name) return
    const newP: ParticipantDraft = {
      id: crypto.randomUUID(),
      nombre: name,
      orden: participants.length,
    }
    setParticipants((prev) => [...prev, newP])
    setInputValue('')
    inputRef.current?.focus()
  }

  function removeParticipant(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') addParticipant()
  }

  function handleContinue() {
    const draft = getDraft()
    if (!draft) return
    draft.participants = participants
    // Limpiar asignaciones previas si cambiaron los participantes
    draft.assignments = []
    saveDraft(draft)
    router.push('/receipt/assign')
  }

  const canContinue = participants.length >= 2

  return (
    <div className="flex flex-col min-h-dvh" style={{ background: '#FFF7F7' }}>
      <header className="safe-top text-white px-4 pt-4 pb-5 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)' }}>
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">👥 ¿Quiénes están en la mesa?</h1>
          <p className="text-white/70 text-xs mt-0.5">Mínimo 2 personas</p>
        </div>
      </header>

      <div className="flex-1 px-4 mt-6 space-y-4">
        {/* Lista de participantes */}
        {participants.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Agrega al menos 2 personas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold" style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
                    {p.nombre.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-900">{p.nombre}</span>
                </div>
                <button
                  onClick={() => removeParticipant(p.id)}
                  className="p-2 text-slate-300 hover:text-red-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input agregar */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombre de la persona"
            maxLength={30}
            className="flex-1 h-14 px-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
          />
          <button
            onClick={addParticipant}
            disabled={!inputValue.trim()}
            className="w-14 h-14 text-white rounded-2xl flex items-center justify-center disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {participants.length === 1 && (
          <p className="text-xs text-center text-amber-600">Agrega al menos una persona más</p>
        )}
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 px-4 py-3 safe-bottom" style={{ background: '#FFF7F7', borderTop: '1px solid #FFE4E6' }}>
        <Button
          onClick={handleContinue}
          size="lg"
          disabled={!canContinue}
          className="w-full h-14 text-base rounded-2xl text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #f43f5e, #fb923c)', boxShadow: '0 4px 20px rgba(244,63,94,0.30)' }}
        >
          Continuar — Asignar ítems
        </Button>
      </div>
    </div>
  )
}
