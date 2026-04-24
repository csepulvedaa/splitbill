import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin, createSupabaseServerClient } from '@/lib/supabase'

// Claims all anonymous bills (by device_id) for the authenticated user.
// Called once after login to migrate pre-login bills to the user account.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createSupabaseServerClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const deviceId = request.headers.get('X-Device-Id')
  if (!deviceId) return NextResponse.json({ claimed: 0 })

  const { data, error } = await supabaseAdmin
    .from('bills')
    .update({ user_id: user.id })
    .eq('device_id', deviceId)
    .is('user_id', null)
    .select('id')

  if (error) {
    console.error('Error claiming bills:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ claimed: data?.length ?? 0 })
}
