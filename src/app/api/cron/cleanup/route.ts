import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const ANON_RETENTION_DAYS = 30

// Deletes anonymous bills older than ANON_RETENTION_DAYS.
// Related rows (items, participants, assignments) are removed via CASCADE.
// Protected by CRON_SECRET — called by Vercel Cron daily.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - ANON_RETENTION_DAYS)

  const { data, error } = await supabaseAdmin
    .from('bills')
    .delete()
    .is('user_id', null)
    .lt('created_at', cutoff.toISOString())
    .select('id')

  if (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const deleted = data?.length ?? 0
  console.log(`Cron cleanup: deleted ${deleted} anonymous bills older than ${ANON_RETENTION_DAYS} days`)
  return NextResponse.json({ deleted, cutoff: cutoff.toISOString() })
}
