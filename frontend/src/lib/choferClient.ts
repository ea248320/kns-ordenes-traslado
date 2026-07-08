// Cliente de Supabase para la sesión del chofer. A diferencia del jefe (que
// usa Supabase Auth normal), el chofer tiene un JWT custom emitido por la
// Edge Function login-chofer, así que se inyecta como header Authorization
// en un cliente aparte, sin persistencia de sesión de GoTrue.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

let cache: { token: string; client: SupabaseClient<Database> } | null = null

export function choferClient(token: string): SupabaseClient<Database> {
  if (cache?.token === token) return cache.client
  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  cache = { token, client }
  return client
}
