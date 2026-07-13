'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Login do admin. Sóbrio, mesma família visual dos forms públicos (tokens do
 * globals.css). É ferramenta interna: sem logo animado, sem firula.
 *
 * - erro SEMPRE genérico ("E-mail ou senha incorretos.") — nunca revela se o
 *   e-mail existe;
 * - sem cadastro, sem "esqueci a senha" (reset é no dashboard, pelo Alan);
 * - blocked=1 (não está na allowlist) mostra mensagem própria.
 */
export function LoginForm({ blocked }: { blocked: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    blocked ? 'Esse acesso não está liberado.' : null
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (signInError) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    router.replace('/admin')
    router.refresh()
  }

  return (
    <main className="max-w-[400px] mx-auto px-6 min-h-screen flex flex-col justify-center pb-24">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl">Flag Haus</h1>
      <p className="text-[color:var(--granite)] text-sm mb-10 tracking-[0.12em] uppercase">
        Admin
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--granite)]">
            E-mail
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-b border-[color:var(--line)] bg-transparent py-2 focus:outline-none focus:border-[color:var(--onyx)] transition-colors"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--granite)]">
            Senha
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-b border-[color:var(--line)] bg-transparent py-2 focus:outline-none focus:border-[color:var(--onyx)] transition-colors"
          />
        </label>

        {error && (
          <p className="text-sm text-[color:var(--oxblood)]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 self-start text-sm tracking-[0.04em] px-8 py-3.5 rounded-full bg-[color:var(--onyx)] text-[color:var(--white)] border border-[color:var(--onyx)] hover:bg-[color:var(--oxblood)] hover:border-[color:var(--oxblood)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className="text-xs text-[color:var(--granite)] mt-12 text-center tracking-[0.02em]">
        Problemas pra entrar? Fala com o Alan.
      </p>
    </main>
  )
}
