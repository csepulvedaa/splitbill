import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Bill, Item, Participant, Assignment } from '@/lib/types'
import EditLoader from './EditLoader'

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

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getBillData(id)
  if (!data) notFound()
  return <EditLoader billId={id} {...data} />
}
