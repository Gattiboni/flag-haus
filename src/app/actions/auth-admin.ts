'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Encerra a sessão do operador e volta pro login. Chamada pelo botão "Sair"
 * do shell do admin. É o único caminho de logout in-app.
 */
export async function signOutAdmin(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/admin/login')
}
