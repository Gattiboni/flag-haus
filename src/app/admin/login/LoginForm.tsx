'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert, Button, Card, Input } from '@/components/ui'

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
    <main className="max-w-[400px] mx-auto px-fh-5 min-h-screen flex flex-col justify-center">
      <Card>
        <header className="mb-fh-6">
          <p className="fh-wordmark">Flag Haus</p>
          <p className="fh-eyebrow">Admin</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-fh-4" noValidate>
          <Input
            label="E-mail"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Senha"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <Alert variant="critical">{error}</Alert>}

          <Button type="submit" loading={loading} fullWidth className="mt-fh-2">
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>

      <p className="fh-micro mt-fh-5 text-center">
        Problemas pra entrar? Fala com o Alan.
      </p>
    </main>
  )
}
