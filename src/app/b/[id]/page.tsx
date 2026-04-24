import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Bill, Item, Participant, Assignment } from '@/lib/types'
import { calculateSummary, buildAssignments } from '@/lib/calculations'
import PublicView from './PublicView'

async function getBillData(id: string) {
  const [billRes, itemsRes, participantsRes] = await Promise.all([
    supabase.from('bills').select('*').eq('id', id).single(),
    supabase.from('items').select('*').eq('bill_id', id).order('orden'),
    supabase.from('participants').select('*').eq('bill_id', id).order('orden'),
  ])

  if (billRes.error || !billRes.data) return null

  const itemIds = (itemsRes.data ?? []).map((i: Item) => i.id)
  const assignmentsRes =
    itemIds.length > 0
      ? await supabase.from('assignments').select('*').in('item_id', itemIds)
      : { data: [] }

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
  searchParams: Promise<{ para?: string; saved?: string; edited?: string }>
}) {
  const { id } = await params
  const { para, saved, edited } = await searchParams

  const data = await getBillData(id)
  if (!data) notFound()

  const { bill, items, participants, assignments } = data
  const summaries = calculateSummary(items, participants, assignments, bill.tip_manual_enabled)
  const isAnonymous = !bill.user_id

  return (
    <PublicView
      bill={bill}
      billId={id}
      summaries={summaries}
      highlightName={para}
      justSaved={saved === '1'}
      justEdited={edited === '1'}
      isAnonymous={isAnonymous}
    />
  )
}

export const revalidate = 0
