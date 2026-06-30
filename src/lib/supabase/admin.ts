import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase com service_role.
 * Bypassa RLS — acesso total ao banco.
 * USAR EXCLUSIVAMENTE EM SERVER ACTIONS / SERVER COMPONENTS.
 * Nunca importar em Client Components.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      '[supabase/admin] Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
