import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Operator = {
  userId: string
  email: string
}

/**
 * Gate de acesso do admin — a camada de segurança real (defesa em profundidade,
 * camada 2). Chamar no topo de TODO Server Component que lê dado e de TODA
 * Server Action do admin, desta spec e das #4b–#4d. Sem exceção, sem cache do
 * resultado entre requests.
 *
 *   1. lê a sessão (cookies, via @supabase/ssr server client)
 *   2. sem user   -> redirect('/admin/login')
 *   3. com user   -> checa pertencimento em user_roles (service_role, atrás do RLS)
 *   4. sem linha  -> encerra a sessão + redirect('/admin/login?blocked=1')
 *   5. com linha  -> { userId, email }
 *
 * O gate checa PERTENCIMENTO, não papel: existe linha para esse user_id? A
 * coluna user_roles.role NÃO é lida (§2 da spec — um único nível de acesso).
 */
export async function requireOperator(): Promise<Operator> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('user_roles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    // Falha ao verificar a allowlist: fail-closed. Não encerra a sessão (pode
    // ser transiente), mas também não concede acesso.
    console.error('[requireOperator] user_roles check failed:', error.message)
    redirect('/admin/login')
  }

  if (!data) {
    // Autenticou no Supabase Auth, mas não está na allowlist. Encerra a sessão
    // pra não deixar o usuário num limbo logado e sinaliza o motivo no login.
    await supabase.auth.signOut()
    redirect('/admin/login?blocked=1')
  }

  return { userId: user.id, email: user.email ?? '' }
}
