import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { requireOperator } from '@/lib/auth/gate'
import { formatPhoneBR, formatRelativeTime } from '@/lib/format'
import { formatDateTimeShortBR } from '@/app/admin/_ui/format'
import {
  CLEAR_PATCH,
  PER_PAGE_OPTIONS,
  cadastrosHref,
  hasActiveFilters,
  parseCadastrosQuery,
  type CadastroRow,
  type CadastrosQuery,
} from '@/app/admin/_ui/cadastros'
import { Alert, Card } from '@/components/ui'
import { CadastrosList, type CadastroItem } from './CadastrosList'
import { CadastrosToolbar } from './CadastrosToolbar'
import { loadCadastros } from './data'
import './cadastros.css'

/**
 * Cadastros (Bloco 4 §3B) — "quem se cadastrou". O Julio abriu o admin, achou
 * só a Fila e concluiu que os cadastros não existiam. Esta é a resposta: a
 * lista de gente, não de jobs.
 *
 * Nada de dado clínico, consentimento, nascimento ou e-mail na lista. Bairro
 * existe só dentro da edição inline. Quem quiser a ficha inteira clica no nome
 * e cai no PersonEdit, que é onde esse tipo de dado tem dono e trava.
 *
 * A contagem do título vem do banco (`count: 'exact'`), nunca de `rows.length`:
 * a página mostra 25, o título tem que dizer quantos existem.
 */

export default async function CadastrosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireOperator()

  const sp = await searchParams
  const query = parseCadastrosQuery(sp)
  const result = await loadCadastros(query)

  if (result.status === 'error') {
    return (
      <div className="flex flex-col gap-fh-5">
        <h1>Cadastros</h1>
        <Alert variant="warning" title="Não foi possível carregar os cadastros">
          <p>Pode ser instabilidade momentânea do banco.</p>
          {/* <a> puro de propósito: o Link do Next reaproveitaria o cache do
              router e "tentar de novo" não tentaria nada. */}
          <a href={cadastrosHref(query, { page: query.page })} className="fh-cad-clear">
            Tentar de novo
          </a>
        </Alert>
      </div>
    )
  }

  const { rows, count, totalAll, page, pageCount } = result.data
  const filtered = hasActiveFilters(query)
  const items = rows.map(toItem)

  return (
    <div className="flex flex-col gap-fh-5">
      <div>
        <h1>Cadastros ({count})</h1>
        {filtered && totalAll !== null && (
          <p className="fh-micro mt-fh-1">
            {count} de {totalAll} no total
          </p>
        )}
      </div>

      <CadastrosToolbar query={query} />

      {/* O Card entra mesmo com zero linhas, de propósito: o cabeçalho de coluna
          agora É a barra de filtro. Sumir com ele no vazio deixaria o Julio sem
          como ajustar o recorte que produziu o vazio — só com o Limpar, que
          joga fora os outros filtros junto. */}
      <Card padded={false}>
        <div className="py-fh-3">
          <CadastrosList items={items} query={query} />
          {items.length === 0 && (
            <EmptyState
              query={query}
              filtered={filtered}
              totalAll={totalAll}
              count={count}
            />
          )}
        </div>
      </Card>

      {items.length > 0 && (
        <Pagination query={query} page={page} pageCount={pageCount} count={count} />
      )}
    </div>
  )
}

/**
 * Linha da view → o que a lista mostra. Tudo que é apresentação (telefone
 * formatado, tempo relativo, data da sessão) resolve aqui, no server: o client
 * recebe strings prontas e nenhum campo a mais do que exibe.
 */
function toItem(row: CadastroRow): CadastroItem {
  return {
    personId: row.person_id,
    displayName: row.name?.trim() || formatPhoneBR(row.phone),
    status: row.operational_status,
    interactionLabel: interactionLabel(row),
    nextSessionLabel: formatDateTimeShortBR(row.next_session_at),
    channel: row.preferred_channel ?? '',
    phoneDigits: row.phone_digits ?? '',
    neighborhood: row.neighborhood ?? '',
    isVip: row.is_vip,
    isDifficult: row.is_difficult,
    isReturning: row.is_returning,
  }
}

/**
 * "Cadastro enviado · há 6 dias". A view já resolveu a precedência
 * (customer > operational > admin) e o rótulo; aqui só se junta com o tempo
 * relativo. Nunca substituído por "agora" depois de uma edição do admin — a
 * fonte é sempre a view.
 */
function interactionLabel(row: CadastroRow): string {
  const label = row.last_interaction_label?.trim() ?? ''
  if (!row.last_interaction_at) return label || '—'
  const rel = formatRelativeTime(row.last_interaction_at)
  return label ? `${label} · ${rel}` : rel
}

function EmptyState({
  query,
  filtered,
  totalAll,
  count,
}: {
  query: CadastrosQuery
  filtered: boolean
  totalAll: number | null
  count: number
}) {
  // Base vazia de verdade (com ou sem filtro na URL) é uma mensagem diferente
  // de "o filtro não achou nada" — a primeira não tem o que limpar.
  const baseEmpty = filtered ? totalAll === 0 : count === 0

  if (baseEmpty) {
    return (
      <p className="fh-lead px-fh-4 py-fh-5">Nenhum cadastro ainda.</p>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-fh-3 px-fh-4 py-fh-5">
      <p className="fh-lead">Nenhum resultado pra esse filtro</p>
      <Link href={cadastrosHref(query, CLEAR_PATCH)} className="fh-cad-clear">
        Limpar
      </Link>
    </div>
  )
}

function Pagination({
  query,
  page,
  pageCount,
  count,
}: {
  query: CadastrosQuery
  page: number
  pageCount: number
  count: number
}) {
  const from = (page - 1) * query.per + 1
  const to = Math.min(page * query.per, count)

  return (
    <div className="flex flex-wrap items-center justify-between gap-fh-3">
      <p className="fh-micro fh-tnum">
        {from}–{to} de {count}
      </p>

      <div className="flex items-center gap-fh-3">
        <span className="fh-eyebrow">Por página</span>
        {PER_PAGE_OPTIONS.map((n) => (
          <Link
            key={n}
            href={cadastrosHref(query, { per: n })}
            className="fh-cad-chip"
            data-active={query.per === n || undefined}
            aria-current={query.per === n ? 'true' : undefined}
          >
            {n}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-fh-2">
        <PageLink
          href={cadastrosHref(query, { page: page - 1 })}
          disabled={page <= 1}
          label="Página anterior"
        >
          <ChevronLeft size={18} strokeWidth={1.5} aria-hidden="true" />
        </PageLink>

        <span className="fh-micro fh-tnum whitespace-nowrap">
          {page} / {pageCount}
        </span>

        <PageLink
          href={cadastrosHref(query, { page: page + 1 })}
          disabled={page >= pageCount}
          label="Próxima página"
        >
          <ChevronRight size={18} strokeWidth={1.5} aria-hidden="true" />
        </PageLink>
      </div>
    </div>
  )
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <span className="fh-cad-iconlink" aria-disabled="true" aria-label={label}>
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className="fh-cad-iconlink" aria-label={label}>
      {children}
    </Link>
  )
}
