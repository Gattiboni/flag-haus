import Link from 'next/link'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPhoneBR } from '@/lib/format'
import { Alert, Card } from '@/components/ui'

/**
 * Busca de pessoa por nome ou telefone (#4c §6). Sem client search, sem debounce:
 * o form GET nativo do header manda `q`, esta página renderiza no server.
 *
 * A extração de dígitos (`only_digits`) é JS puro aplicado antes da query. Assim
 * "(11) 95555-0004" vira "11955550004" e casa com o E.164 gravado. O texto (nome)
 * vai entre aspas no filtro `or` do PostgREST pra não quebrar com parênteses.
 */

const LIMIT = 50

type PersonHit = { id: string; name: string | null; phone: string | null }

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requireOperator()

  const { q: rawQ } = await searchParams
  const q = (rawQ ?? '').trim()

  if (q.length < 3) {
    return (
      <div>
        <Header q={rawQ ?? ''} />
        <p className="fh-lead">Digite ao menos 3 caracteres.</p>
      </div>
    )
  }

  const digits = q.replace(/\D/g, '')
  // O valor vai entre aspas no filtro `or`; ainda assim removemos os caracteres
  // que são gramática do PostgREST (vírgula, parênteses) e o que quebraria o
  // próprio quoting (aspas, barra). Buscar por texto com esses símbolos não faz
  // sentido de qualquer forma — o que importa deles vira dígito no predicado do
  // telefone.
  const safeName = q.replace(/["\\,()]/g, ' ').replace(/\s+/g, ' ').trim()

  const admin = createAdminClient()
  let query = admin
    .from('people')
    .select('id, name, phone')
    .is('deleted_at', null)

  if (digits) {
    query = query.or(`name.ilike."*${safeName}*",phone.ilike."*${digits}*"`)
  } else {
    query = query.ilike('name', `*${safeName}*`)
  }

  const { data, error } = await query
    .order('name', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (error) {
    console.error('[admin/buscar] query failed:', error.message)
    return (
      <div>
        <Header q={q} />
        <Alert variant="warning" title="Não foi possível buscar agora">
          Tenta de novo em instantes.
        </Alert>
      </div>
    )
  }

  const hits = (data ?? []) as PersonHit[]

  return (
    <div>
      <Header q={q} />

      {hits.length === 0 ? (
        <p className="fh-lead">Nada encontrado.</p>
      ) : (
        <>
          <Card padded={false}>
            <ul>
              {hits.map((p, i) => (
                <li
                  key={p.id}
                  className={i > 0 ? 'border-t border-fh-subtle' : undefined}
                >
                  <Link
                    href={`/admin/people/${p.id}`}
                    className="flex items-baseline justify-between gap-fh-3 px-fh-4 py-fh-3 no-underline hover:bg-fh-sunken transition-colors"
                  >
                    <span>{p.name?.trim() || '(sem nome)'}</span>
                    <span className="fh-micro fh-tnum whitespace-nowrap">
                      {formatPhoneBR(p.phone)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {hits.length === LIMIT && (
            <p className="fh-micro mt-fh-4">
              Mostrando os primeiros {LIMIT}. Refine a busca.
            </p>
          )}
        </>
      )}
    </div>
  )
}

function Header({ q }: { q: string }) {
  return (
    <h1 className="mb-fh-5">
      Busca
      {q.trim() && <span className="text-fh-secondary"> — “{q.trim()}”</span>}
    </h1>
  )
}
