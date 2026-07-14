import Link from 'next/link'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatPhoneBR } from '@/lib/format'

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
        <p className="text-sm text-[color:var(--granite)]">
          Digite ao menos 3 caracteres.
        </p>
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
        <p className="text-sm text-[color:var(--oxblood)]" role="alert">
          Não foi possível buscar agora.
        </p>
      </div>
    )
  }

  const hits = (data ?? []) as PersonHit[]

  return (
    <div>
      <Header q={q} />

      {hits.length === 0 ? (
        <p className="text-sm text-[color:var(--granite)]">Nada encontrado.</p>
      ) : (
        <>
          <ul>
            {hits.map((p) => (
              <li key={p.id} className="border-b border-[color:var(--line)] py-3">
                <Link
                  href={`/admin/people/${p.id}`}
                  className="flex items-baseline justify-between gap-3 group"
                >
                  <span className="underline decoration-[color:var(--line)] underline-offset-4 group-hover:decoration-[color:var(--onyx)] transition-colors">
                    {p.name?.trim() || '(sem nome)'}
                  </span>
                  <span className="text-sm text-[color:var(--granite)] tabular-nums whitespace-nowrap">
                    {formatPhoneBR(p.phone)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {hits.length === LIMIT && (
            <p className="mt-4 text-xs text-[color:var(--granite)]">
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
    <h1 className="font-[family-name:var(--font-fraunces)] text-2xl sm:text-3xl mb-8">
      Busca
      {q.trim() && (
        <span className="text-[color:var(--granite)] text-base font-[family-name:var(--font-lato)]">
          {' '}
          — “{q.trim()}”
        </span>
      )}
    </h1>
  )
}
