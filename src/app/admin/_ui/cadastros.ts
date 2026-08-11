/**
 * Contrato da tela de Cadastros (Bloco 4) — fonte única de tipos e vocabulário.
 *
 * Espelha a view `v_admin_cadastros` e a coluna `jobs.scheduled_at` entregues
 * pela migration do Bloco 3 (contrato da seção 2 da instrução + Adendo de
 * 09/08). Nada aqui cria SQL: se a view divergir destes nomes, o certo é PARAR
 * e reportar, não adaptar o front.
 *
 * Vive num módulo plano (sem 'use server'/'use client') de propósito, pela mesma
 * razão de `person-fields.ts`: uma Server Action só pode exportar funções async,
 * então constantes compartilhadas entre server e client precisam morar fora.
 */

export const CADASTROS_PATH = '/admin/cadastros'
export const CADASTROS_VIEW = 'v_admin_cadastros'

/* ------------------------------------------------------------------
   Status operacional
   ------------------------------------------------------------------ */

/**
 * Slugs de `operational_status`. `retornante` NÃO está aqui: pelo Adendo de
 * 09/08 ele deixou de ser status e virou o marcador `is_returning`, e
 * `sem_resposta` entrou no lugar, com o mesmo rótulo da Fila.
 */
export const OPERATIONAL_STATUSES = [
  'novo',
  'orcar',
  'orcamento_enviado',
  'agendar',
  'sessao_marcada',
  'sem_resposta',
  'cliente',
  'inativo',
] as const

export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number]

/** slug → rótulo. Única tradução da tela; a view entrega só o slug. */
export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  novo: 'Novo',
  orcar: 'Orçar',
  orcamento_enviado: 'Orçamento enviado',
  agendar: 'Agendar',
  sessao_marcada: 'Sessão marcada',
  sem_resposta: 'Sem resposta',
  cliente: 'Cliente',
  inativo: 'Inativo',
}

export function isOperationalStatus(v: string): v is OperationalStatus {
  return (OPERATIONAL_STATUSES as readonly string[]).includes(v)
}

/** "Precisa follow-up": a bola está com o Julio ou parou do outro lado. */
export const FOLLOW_UP_STATUSES: readonly OperationalStatus[] = [
  'orcar',
  'orcamento_enviado',
  'agendar',
  'sem_resposta',
]

/**
 * "Precisa de atenção" NÃO tem constante aqui, de propósito (Adendo 3, 09/08):
 * a ordem virou a coluna `attention_rank` de `v_admin_cadastros`
 * (orcar=1 · agendar=2 · orcamento_enviado=3 · sem_resposta=4 · sessao_marcada=5
 * · novo=6 · cliente=7 · inativo=8). Duplicar o rank no front seria criar uma
 * segunda fonte de verdade que diverge calada no dia em que a view mudar — o
 * PostgREST ordena pela coluna e ninguém aqui precisa saber os números.
 */

/* ------------------------------------------------------------------
   Canal preferido
   ------------------------------------------------------------------ */

/**
 * Mesmo conjunto aceito por `updatePerson` (admin-people.ts) e exibido no
 * PersonEdit. Duplicado aqui de propósito: PersonEdit mantém a lista inline e
 * esta tela não pode importar de uma Server Action ('use server' só exporta
 * async). Se um canal novo surgir, os dois pontos mudam juntos.
 */
export const PREFERRED_CHANNELS = [
  'whatsapp',
  'email',
  'instagram',
  'tanto_faz',
] as const

export type PreferredChannel = (typeof PREFERRED_CHANNELS)[number]

export const PREFERRED_CHANNEL_LABELS: Record<PreferredChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  instagram: 'Instagram',
  tanto_faz: 'Tanto faz',
}

export function isPreferredChannel(v: string): v is PreferredChannel {
  return (PREFERRED_CHANNELS as readonly string[]).includes(v)
}

/* ------------------------------------------------------------------
   Linha da view
   ------------------------------------------------------------------ */

export type LastInteractionClass = 'customer' | 'operational' | 'admin'

/** Uma linha de `v_admin_cadastros` — contrato §2.2 + Adendo. */
export type CadastroRow = {
  person_id: string
  name: string | null
  name_norm: string | null
  phone: string | null
  phone_digits: string | null
  email: string | null
  email_norm: string | null
  instagram: string | null
  instagram_norm: string | null
  preferred_channel: string | null
  /** Só para o inline edit — NÃO é coluna da lista. */
  neighborhood: string | null
  is_vip: boolean
  is_difficult: boolean
  /** Adendo 09/08: executou uma vez e voltou com job aberto. */
  is_returning: boolean
  operational_status: OperationalStatus
  next_session_at: string | null
  last_interaction_at: string | null
  last_interaction_class: LastInteractionClass | null
  last_interaction_label: string | null
  created_at: string
}

/**
 * Projeção pedida ao PostgREST. Nenhum dado clínico/consent entra aqui.
 * `attention_rank` fica de fora de propósito: o PostgREST ordena por coluna da
 * relação mesmo sem ela no select, e a tela não exibe o número em lugar nenhum.
 */
export const CADASTRO_SELECT = [
  'person_id',
  'name',
  'phone',
  'phone_digits',
  'email',
  'instagram',
  'preferred_channel',
  'neighborhood',
  'is_vip',
  'is_difficult',
  'is_returning',
  'operational_status',
  'next_session_at',
  'last_interaction_at',
  'last_interaction_class',
  'last_interaction_label',
  'created_at',
].join(', ')

/* ------------------------------------------------------------------
   Estado da tela (tudo na URL)
   ------------------------------------------------------------------ */

/**
 * Ordenações. Cada chave pertence a UMA coluna (ver `SORT_COLUMN`) — é o que
 * permite a flechinha do cabeçalho saber se está ligada. `atencao` é a exceção
 * de forma: mora no menu de STATUS, como atalho, porque é um recorte de status
 * disfarçado de ordenação.
 */
export const SORT_KEYS = [
  'nome',
  'nome_desc',
  'interacao',
  'interacao_asc',
  'sessao',
  'atencao',
] as const
export type SortKey = (typeof SORT_KEYS)[number]

export const DEFAULT_SORT: SortKey = 'nome'

/** Rótulos curtos: o cabeçalho já diz de que coluna se trata. */
export const SORT_LABELS: Record<SortKey, string> = {
  nome: 'A–Z',
  nome_desc: 'Z–A',
  interacao: 'Recente primeiro',
  interacao_asc: 'Antiga primeiro',
  sessao: 'Mais próxima primeiro',
  atencao: 'Precisa de atenção',
}

export const SORT_HINTS: Record<SortKey, string> = {
  nome: 'Ordem alfabética, ignorando acentos.',
  nome_desc: 'Ordem alfabética invertida, ignorando acentos.',
  interacao: 'Interação mais recente primeiro; quem nunca interagiu vai pro fim.',
  interacao_asc:
    'Quem está esperando há mais tempo primeiro; quem nunca interagiu vai pro fim.',
  sessao: 'Sessão mais próxima primeiro; sem sessão vai pro fim.',
  atencao:
    'Orçar → Agendar → Orçamento enviado → Sem resposta → Sessão marcada → Novo → Cliente → Inativo. Empate: interação mais antiga primeiro.',
}

/**
 * Filtros de marcador e atalho. `dificil`/`retornante` levam o nome da COLUNA
 * (`is_difficult`/`is_returning`), não do rótulo: `filtros=atencao` ao lado de
 * `sort=atencao` seriam duas coisas diferentes com o mesmo nome na mesma URL.
 */
export const QUICK_FILTERS = [
  'sessao',
  'followup',
  'vip',
  'dificil',
  'retornante',
] as const
export type QuickFilter = (typeof QUICK_FILTERS)[number]

export const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  sessao: 'Tem sessão marcada',
  followup: 'Precisa follow-up',
  vip: 'VIP',
  dificil: 'Atenção',
  retornante: 'Retornante',
}

/** Os três marcadores da linha, na mesma ordem em que aparecem nela. */
export const MARKER_FILTERS: readonly QuickFilter[] = ['vip', 'dificil', 'retornante']

/* ------------------------------------------------------------------
   Menus de cabeçalho de coluna
   ------------------------------------------------------------------ */

/** Colunas que ganham dropdown (Adendo 3, 09/08). */
export const MENU_COLUMNS = ['nome', 'status', 'interacao', 'sessao'] as const
export type MenuColumn = (typeof MENU_COLUMNS)[number]

export const MENU_COLUMN_LABELS: Record<MenuColumn, string> = {
  nome: 'Nome',
  status: 'Status',
  interacao: 'Última interação',
  sessao: 'Próxima sessão',
}

/** De qual menu cada ordenação sai. */
export const SORT_COLUMN: Record<SortKey, MenuColumn> = {
  nome: 'nome',
  nome_desc: 'nome',
  interacao: 'interacao',
  interacao_asc: 'interacao',
  sessao: 'sessao',
  atencao: 'status',
}

/** Filtros que moram no menu de STATUS (marcadores + atalho de follow-up). */
const STATUS_MENU_FILTERS: readonly QuickFilter[] = [...MARKER_FILTERS, 'followup']

export const PER_PAGE_OPTIONS = [25, 50] as const
export const DEFAULT_PER_PAGE = 25

export type CadastrosQuery = {
  q: string
  status: OperationalStatus[]
  filtros: QuickFilter[]
  sort: SortKey
  page: number
  per: number
}

export const EMPTY_QUERY: CadastrosQuery = {
  q: '',
  status: [],
  filtros: [],
  sort: DEFAULT_SORT,
  page: 1,
  per: DEFAULT_PER_PAGE,
}

/**
 * Há algum RECORTE ativo? Decide o subtítulo "N de M" e a leitura de lista
 * vazia. Ordenação de propósito fora: mudar a ordem não muda quantas pessoas
 * casam com o filtro, e "25 de 25" ao ordenar por nome seria ruído.
 */
export function hasActiveFilters(query: CadastrosQuery): boolean {
  return query.q !== '' || query.status.length > 0 || query.filtros.length > 0
}

/**
 * Há algo pra Limpar? Aqui a ordenação ENTRA: "Precisa de atenção" é oferecido
 * como atalho no menu de status, e um Limpar que apagasse os filtros deixando a
 * lista numa ordem que o Julio não pediu mais seria um Limpar pela metade.
 */
export function hasActiveState(query: CadastrosQuery): boolean {
  return hasActiveFilters(query) || query.sort !== DEFAULT_SORT
}

/** O patch de "Limpar": zera busca, filtros e ordenação de uma vez. */
export const CLEAR_PATCH: Partial<CadastrosQuery> = {
  q: '',
  status: [],
  filtros: [],
  sort: DEFAULT_SORT,
}

/**
 * Quantos itens estão ligados dentro do menu de uma coluna — vira o "(2)" do
 * cabeçalho. A ordenação default não conta: ela é o repouso da tela, não uma
 * escolha que o Julio precise lembrar de desfazer.
 */
export function menuActiveCount(query: CadastrosQuery, column: MenuColumn): number {
  const sorted =
    SORT_COLUMN[query.sort] === column && query.sort !== DEFAULT_SORT ? 1 : 0

  switch (column) {
    case 'nome':
    case 'interacao':
      return sorted
    case 'status':
      return (
        sorted +
        query.status.length +
        query.filtros.filter((f) => STATUS_MENU_FILTERS.includes(f)).length
      )
    case 'sessao':
      return sorted + (query.filtros.includes('sessao') ? 1 : 0)
  }
}

type RawSearchParams = Record<string, string | string[] | undefined>

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

/** Lista separada por vírgula, sem vazios e sem repetição. */
function csv(v: string | string[] | undefined): string[] {
  const raw = Array.isArray(v) ? v.join(',') : (v ?? '')
  const seen = new Set<string>()
  for (const part of raw.split(',')) {
    const t = part.trim()
    if (t) seen.add(t)
  }
  return [...seen]
}

/**
 * URL → estado. Tolerante: valor desconhecido é descartado, nunca derruba a
 * página. Colar uma URL alheia tem que reproduzir a tela ou degradar pro
 * default, jamais estourar.
 */
export function parseCadastrosQuery(sp: RawSearchParams): CadastrosQuery {
  const q = first(sp.q).trim().slice(0, 120)

  const status = csv(sp.status).filter(isOperationalStatus)

  const filtros = csv(sp.filtros).filter((f): f is QuickFilter =>
    (QUICK_FILTERS as readonly string[]).includes(f)
  )

  const rawSort = first(sp.sort)
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(rawSort)
    ? (rawSort as SortKey)
    : DEFAULT_SORT

  const rawPer = Number.parseInt(first(sp.per), 10)
  const per = (PER_PAGE_OPTIONS as readonly number[]).includes(rawPer)
    ? rawPer
    : DEFAULT_PER_PAGE

  const rawPage = Number.parseInt(first(sp.page), 10)
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1

  return { q, status, filtros, sort, page, per }
}

/**
 * Estado → URL. Só escreve o que difere do default, pra o link ficar curto e
 * legível. `page` volta pra 1 em qualquer mudança que não seja de página —
 * trocar filtro estando na página 4 e cair num vazio é o clássico bug de lista.
 */
export function cadastrosHref(
  query: CadastrosQuery,
  patch: Partial<CadastrosQuery> = {}
): string {
  const next: CadastrosQuery = {
    ...query,
    ...patch,
    page: patch.page ?? 1,
  }

  const sp = new URLSearchParams()
  if (next.q) sp.set('q', next.q)
  if (next.status.length) sp.set('status', next.status.join(','))
  if (next.filtros.length) sp.set('filtros', next.filtros.join(','))
  if (next.sort !== DEFAULT_SORT) sp.set('sort', next.sort)
  if (next.per !== DEFAULT_PER_PAGE) sp.set('per', String(next.per))
  if (next.page > 1) sp.set('page', String(next.page))

  const qs = sp.toString()
  return qs ? `${CADASTROS_PATH}?${qs}` : CADASTROS_PATH
}

/** Liga/desliga um valor numa lista de filtro (chip clicável). */
export function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value]
}

/* ------------------------------------------------------------------
   Normalização da busca
   ------------------------------------------------------------------ */

/**
 * A view guarda `name_norm`/`email_norm`/`instagram_norm` já minúsculos e sem
 * acento, e `phone_digits` só com dígitos. Quem normaliza a QUERY é o JS, aqui,
 * pra que "João" case com "joao" e "(11) 95555-0004" case com "5511955550004".
 *
 * `text` sai limpo dos caracteres que são gramática do filtro `or` do PostgREST
 * (vírgula, parênteses, aspas, barra) e dos curingas (`*`, `%`) — buscar por
 * eles não faz sentido e deixá-los passar viraria uma busca larga demais.
 */
export function normalizeSearch(raw: string): {
  text: string
  digits: string
  instagram: string
} {
  const stripped = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

  const text = stripped
    .replace(/["\\,()*%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    text,
    digits: raw.replace(/\D/g, ''),
    // "@fulano" e "fulano" têm que casar com instagram_norm (gravado sem @).
    instagram: text.replace(/^@+/, ''),
  }
}
