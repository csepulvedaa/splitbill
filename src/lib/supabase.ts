import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { cookies } from 'next/headers'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// ─── Admin client (service role, server-only) ─────────────────────────────────

function createAdminClient(): SupabaseClient<DB> {
  return createClient<DB>(URL, SERVICE_KEY, { auth: { persistSession: false } })
}

let _supabaseAdmin: SupabaseClient<DB> | null = null

export function getSupabaseAdmin(): SupabaseClient<DB> {
  if (!_supabaseAdmin) _supabaseAdmin = createAdminClient()
  return _supabaseAdmin
}

export const supabaseAdmin: SupabaseClient<DB> = new Proxy({} as SupabaseClient<DB>, {
  get(_, prop: string) {
    const client = getSupabaseAdmin()
    const val = client[prop as keyof SupabaseClient<DB>]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

// ─── Anon client (public reads, legacy) ──────────────────────────────────────

function createPublicClient(): SupabaseClient<DB> {
  return createClient<DB>(URL, ANON_KEY)
}

let _supabase: SupabaseClient<DB> | null = null

export function getSupabase(): SupabaseClient<DB> {
  if (!_supabase) _supabase = createPublicClient()
  return _supabase
}

export const supabase: SupabaseClient<DB> = new Proxy({} as SupabaseClient<DB>, {
  get(_, prop: string) {
    const client = getSupabase()
    const val = client[prop as keyof SupabaseClient<DB>]
    return typeof val === 'function' ? val.bind(client) : val
  },
})

// ─── Auth-aware server client (reads session from cookies) ───────────────────
// Use in Server Components and API Routes to get the current user.

export function createSupabaseServerClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient<DB>(URL, ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component — cookies can't be set here, middleware handles it
        }
      },
    },
  })
}

// ─── Auth-aware browser client (singleton) ────────────────────────────────────
// Use in Client Components for auth state and sign-in/sign-out.

let _browserClient: ReturnType<typeof createBrowserClient<DB>> | null = null

export function getSupabaseBrowser() {
  if (!_browserClient) {
    _browserClient = createBrowserClient<DB>(URL, ANON_KEY)
  }
  return _browserClient
}
