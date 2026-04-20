import { createClient, SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

function createPublicClient(): SupabaseClient<DB> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  return createClient<DB>(url, key)
}

function createAdminClient(): SupabaseClient<DB> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  return createClient<DB>(url, key, { auth: { persistSession: false } })
}

let _supabase: SupabaseClient<DB> | null = null
let _supabaseAdmin: SupabaseClient<DB> | null = null

export function getSupabase(): SupabaseClient<DB> {
  if (!_supabase) _supabase = createPublicClient()
  return _supabase
}

export function getSupabaseAdmin(): SupabaseClient<DB> {
  if (!_supabaseAdmin) _supabaseAdmin = createAdminClient()
  return _supabaseAdmin
}

// Proxies para uso directo: supabase.from(...), supabaseAdmin.from(...)
export const supabase: SupabaseClient<DB> = new Proxy({} as SupabaseClient<DB>, {
  get(_, prop: string) {
    const client = getSupabase()
    const val = client[prop as keyof SupabaseClient<DB>]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

export const supabaseAdmin: SupabaseClient<DB> = new Proxy({} as SupabaseClient<DB>, {
  get(_, prop: string) {
    const client = getSupabaseAdmin()
    const val = client[prop as keyof SupabaseClient<DB>]
    return typeof val === 'function' ? val.bind(client) : val
  },
})
