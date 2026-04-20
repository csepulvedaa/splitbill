import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Bill, Item, Participant, Assignment } from '@/lib/types'
import { calculateSummary } from '@/lib/calculations'
import { buildAssignments } from '@/lib/calculations'
import PublicView from './PublicView'

async function getBillData(id: string) {
  const [billRes, itemsRes, participantsRes, assignmentsRes] = await Promise.all([
    supabase.from('bills').select('*').eq('id', id).single(),
    supabase.from('items').select('*').eq('bill_id', id).order('orden'),
    supabase.from('participants').select('*').eq('bill_id', id).order('orden'),
    supabase
      .from('assignments')
      .select('*')
      .in(
        'item_id',
        (await supabase.from('items').select('id').eq('bill_id', id)).data?.map((i) => i.id) ?? [],
      ),
  ])

  if (billRes.error || !billRes.data) return null

  return {
    bill: billRes.data as Bill,
    items: (itemsRes.data ?? []) as Item[],
    participants: (participantsRes.data ?? []) as Participant[],
    assignments: (assignmentsRes.data ?? []) as Assignment[],
  }
}

export default async function BillPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ para?: string; saved?: string }>
}) {
  const { id } = await params
  const { para, saved } = await searchParams

  const data = await getBillData(id)
  if (!data) notFound()

  const { bill, items, participants, assignments } = data

  const summaries = calculateSummary(items, participants, assignments, bill.tip_manual_enabled)

  return (
    <PublicView
      bill={bill}
      summaries={summaries}
      highlightName={para}
      justSaved={saved === '1'}
    />
  )
}

export const revalidate = 30
