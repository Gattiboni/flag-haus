import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  CADASTRO_SELECT,
  CADASTROS_VIEW,
  FOLLOW_UP_STATUSES,
  hasActiveFilters,
  normalizeSearch,
  type CadastroRow,
  type CadastrosQuery,
  type OperationalStatus,
  type SortKey,
} from '@/app/admin/_ui/cadastros'

/**
 * Leitura da tela de Cadastros. Busca, filtro, ordenação e paginação acontecem
 * NO SERVIDOR — o client nunca recebe mais que uma página. Fonte única:
 * `v_admin_cadastros` (Bloco 3).
 *
 * Adendo 3 (09/08): "Precisa de atenção" era a única ordenação que o PostgREST
 * não sabia fazer — era um CASE sobre `operational_status`, e o servidor
 * rankeava em memória sobre uma varredura limitada a 2000 linhas. A view ganhou
 * a coluna `attention_rank`, então esse caminho inteiro (projeção dupla, sort em
 * JS, teto e aviso de truncagem) foi embora: agora toda ordenação é um
 * `order by` de coluna, e não existe mais recorte em que a lista minta sobre o
 * próprio tamanho.
 */

export type CadastrosPageData = {
  rows: CadastroRow[]
  /** Total que casa com o recorte atual (do banco, não da página). */
  count: number
  /** Total sem recorte nenhum. Só consultado quando há filtro ativo. */
  totalAll: number | null
  page: number
  pageCount: number
}

export type LoadCadastrosResult =
  | { status: 'ok'; data: CadastrosPageData }
  | { status: 'error'; message: string }

type Admin = ReturnType<typeof createAdminClient>

/**
 * Interseção do filtro de status (multi) com o atalho "Precisa follow-up".
 * `null` = sem restrição. Array vazio = recorte impossível (ex.: status=cliente
 * junto com follow-up) — a tela mostra "nenhum resultado", não uma query
 * inválida.
 */
function resolveStatusFilter(query: CadastrosQuery): OperationalStatus[] | null {
  if (!query.filtros.includes('followup')) {
    return query.status.length ? [...query.status] : null
  }
  if (!query.status.length) return [...FOLLOW_UP_STATUSES]
  return query.status.filter((s) => FOLLOW_UP_STATUSES.includes(s))
}

/**
 * Predicado de busca no formato `or` do PostgREST. Cada termo vai entre aspas
 * (o valor já chega sem os caracteres que são gramática do filtro). `null`
 * quando não há nada pra buscar.
 */
function buildSearchExpr(q: string): string | null {
  if (!q) return null
  const { text, digits, instagram } = normalizeSearch(q)

  const parts: string[] = []
  if (text) {
    parts.push(`name_norm.ilike."*${text}*"`)
    parts.push(`email_norm.ilike."*${text}*"`)
  }
  if (instagram) parts.push(`instagram_norm.ilike."*${instagram}*"`)
  if (digits) parts.push(`phone_digits.ilike."*${digits}*"`)

  return parts.length ? parts.join(',') : null
}

/**
 * Ids das pessoas que carregam a tag. Usa o índice GIN de `people.tags`
 * (`contains` vira o operador `@>`), e roda no servidor como todo o resto do
 * recorte desta tela.
 *
 * O passo extra existe porque `v_admin_cadastros` não projeta `people.tags`, e
 * a view está fora do escopo desta entrega — mexer nela é migration, e
 * migration é do Claudinho via MCP. Enquanto isso, o filtro é a interseção de
 * duas queries em vez de um `where` só.
 *
 * Custo real: o universo é de ~24 pessoas hoje, e mesmo em milhares o retorno
 * é uma coluna de uuid vinda de um índice. Se um dia o `in(...)` ficar grande
 * demais pra URL do PostgREST, a saída certa é a view projetar `tags` — não
 * paginar esta lista aqui.
 */
async function personIdsWithTag(admin: Admin, slug: string): Promise<string[]> {
  const { data, error } = await admin
    .from('people')
    .select('id')
    .contains('tags', [slug])
    .is('deleted_at', null)

  if (error) {
    console.error('[admin/cadastros] filtro de tag falhou:', error.message)
    // Devolver "todo mundo" aqui mostraria uma lista sem o recorte pedido, com
    // o filtro aceso. Vazio é honesto: o recorte não pôde ser aplicado.
    return []
  }
  return ((data ?? []) as Array<{ id: string }>).map((p) => p.id)
}

/**
 * Fábrica do recorte: devolve a função que aplica busca + filtros sobre um
 * select da view. Todo caminho de leitura passa por ela, então filtro novo
 * entra num lugar só.
 */
function makeScoped(
  admin: Admin,
  query: CadastrosQuery,
  taggedIds: string[] | null
) {
  const statuses = resolveStatusFilter(query)
  const searchExpr = buildSearchExpr(query.q)
  const requireSession = query.filtros.includes('sessao')

  // Marcadores: cada um é uma coluna booleana da view. Combinados são E, não OU
  // — "VIP + Atenção" é quem tem os dois, que é o que o Julio quer dizer ao
  // ligar os dois marcadores.
  const flags: Array<'is_vip' | 'is_difficult' | 'is_returning'> = []
  if (query.filtros.includes('vip')) flags.push('is_vip')
  if (query.filtros.includes('dificil')) flags.push('is_difficult')
  if (query.filtros.includes('retornante')) flags.push('is_returning')

  function scoped(select: string, opts?: { count?: 'exact'; head?: boolean }) {
    let b = admin.from(CADASTROS_VIEW).select(select, opts)
    if (statuses) b = b.in('operational_status', statuses)
    if (searchExpr) b = b.or(searchExpr)
    if (requireSession) b = b.not('next_session_at', 'is', null)
    if (taggedIds) b = b.in('person_id', taggedIds)
    for (const f of flags) b = b.eq(f, true)
    return b
  }

  // Busca que sobra vazia depois de normalizar (o Julio digitou só pontuação,
  // ex.: "%*" ou "()"): não é "sem busca", é uma busca que não casa com nada.
  // Sem isto, o campo mostraria o termo e a lista devolveria as 22 pessoas.
  const searchImpossible = query.q !== '' && searchExpr === null

  return {
    scoped,
    impossible:
      (statuses !== null && statuses.length === 0) ||
      searchImpossible ||
      // Tag pedida que ninguém carrega: recorte legítimo e vazio, não erro.
      (taggedIds !== null && taggedIds.length === 0),
  }
}

type Scoped = ReturnType<typeof makeScoped>['scoped']

type PartialResult =
  | { status: 'ok'; data: Omit<CadastrosPageData, 'totalAll'> }
  | { status: 'error'; message: string }

/** Divide em páginas a partir do total; a página pedida é presa ao intervalo. */
function paginate(count: number, per: number, requested: number) {
  const pageCount = Math.max(1, Math.ceil(count / per))
  const page = Math.min(Math.max(1, requested), pageCount)
  return { page, pageCount }
}

export async function loadCadastros(
  query: CadastrosQuery
): Promise<LoadCadastrosResult> {
  const admin = createAdminClient()

  const taggedIds = query.tag ? await personIdsWithTag(admin, query.tag) : null
  const { scoped, impossible } = makeScoped(admin, query, taggedIds)

  try {
    // Total geral só interessa quando há recorte — sem filtro, `count` já é ele.
    const totalAllPromise = hasActiveFilters(query)
      ? admin.from(CADASTROS_VIEW).select('person_id', { count: 'exact', head: true })
      : null

    if (impossible) {
      const totalAll = totalAllPromise ? ((await totalAllPromise).count ?? 0) : 0
      return {
        status: 'ok',
        data: { rows: [], count: 0, totalAll, page: 1, pageCount: 1 },
      }
    }

    const loaded = await loadPage(query, scoped)
    if (loaded.status === 'error') return loaded

    const totalAll = totalAllPromise ? ((await totalAllPromise).count ?? null) : null
    return { status: 'ok', data: { ...loaded.data, totalAll } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[admin/cadastros] load threw:', msg)
    return { status: 'error', message: msg }
  }
}

type OrderSpec = { column: string; ascending: boolean }

const BY_NAME: OrderSpec = { column: 'name_norm', ascending: true }

/**
 * Chave de ordenação → colunas do `order by`, na ordem. `nullsFirst: false`
 * vale pra todas: ausência de data (nunca interagiu, sem sessão marcada) vai
 * pro fim, tanto na ordem crescente quanto na decrescente. Quem não tem data
 * não é "o mais antigo" nem "o mais recente" — é quem não tem.
 *
 * `name_norm` fecha as listas com empate; `person_id` fecha todas (aplicado por
 * `orderedPage`), pra a paginação não embaralhar entre dois requests.
 */
function orderSpecs(sort: SortKey): OrderSpec[] {
  switch (sort) {
    case 'nome':
      return [BY_NAME]
    case 'nome_desc':
      return [{ column: 'name_norm', ascending: false }]
    case 'interacao':
      return [{ column: 'last_interaction_at', ascending: false }, BY_NAME]
    case 'interacao_asc':
      return [{ column: 'last_interaction_at', ascending: true }, BY_NAME]
    case 'sessao':
      return [{ column: 'next_session_at', ascending: true }, BY_NAME]
    // Adendo 3: rank da view, empate pela espera mais longa primeiro.
    case 'atencao':
      return [
        { column: 'attention_rank', ascending: true },
        { column: 'last_interaction_at', ascending: true },
        BY_NAME,
      ]
  }
}

async function loadPage(
  query: CadastrosQuery,
  scoped: Scoped
): Promise<PartialResult> {
  function fetchPage(page: number) {
    let b = scoped(CADASTRO_SELECT, { count: 'exact' })
    for (const spec of orderSpecs(query.sort)) {
      b = b.order(spec.column, { ascending: spec.ascending, nullsFirst: false })
    }
    b = b.order('person_id', { ascending: true })

    const from = (page - 1) * query.per
    return b.range(from, from + query.per - 1)
  }

  const requested = Math.max(1, query.page)
  const first = await fetchPage(requested)
  if (first.error) {
    console.error('[admin/cadastros] query failed:', first.error.message)
    return { status: 'error', message: first.error.message }
  }

  const count = first.count ?? 0
  const { page, pageCount } = paginate(count, query.per, requested)

  // URL apontando além do fim (link velho, filtro novo): refaz na última página
  // em vez de mostrar um vazio que parece "nenhum resultado".
  if (page !== requested && count > 0) {
    const retry = await fetchPage(page)
    if (retry.error) {
      console.error('[admin/cadastros] clamp retry failed:', retry.error.message)
      return { status: 'error', message: retry.error.message }
    }
    return {
      status: 'ok',
      data: {
        rows: (retry.data ?? []) as unknown as CadastroRow[],
        count,
        page,
        pageCount,
      },
    }
  }

  return {
    status: 'ok',
    data: {
      rows: (first.data ?? []) as unknown as CadastroRow[],
      count,
      page,
      pageCount,
    },
  }
}
