'use client'

import { CalendarDays, Clock, SlidersHorizontal, Tag, User } from 'lucide-react'
import {
  DEFAULT_SORT,
  MARKER_FILTERS,
  MENU_COLUMN_LABELS,
  MENU_COLUMNS,
  OPERATIONAL_STATUSES,
  OPERATIONAL_STATUS_LABELS,
  QUICK_FILTER_LABELS,
  SORT_HINTS,
  SORT_LABELS,
  cadastrosHref,
  menuActiveCount,
  toggle,
  type CadastrosQuery,
  type MenuColumn,
  type QuickFilter,
  type SortKey,
} from '@/app/admin/_ui/cadastros'
import { filterOptionLabel, type TagCatalogEntry } from '@/app/admin/_ui/tags'
import { ColumnMenu, MenuGroup, MenuLink } from './ColumnMenu'
import './cadastros.css'

/**
 * O conteúdo dos dropdowns de Cadastros, escrito UMA vez (Adendo 3, 09/08).
 *
 * No desktop cada bloco vira o dropdown do seu cabeçalho de coluna; no celular,
 * onde não existe cabeçalho de coluna, os quatro entram num único painel atrás
 * do botão "Filtrar/Ordenar". Mesmos itens, mesmos hrefs, mesma URL — a única
 * diferença entre as duas telas é onde o painel está pendurado.
 */

type Props = { query: CadastrosQuery }

/**
 * Escolher a ordenação já ligada desliga: sem isso, o único jeito de voltar ao
 * default seria adivinhar em qual outro menu ele mora.
 */
function sortHref(query: CadastrosQuery, key: SortKey): string {
  return cadastrosHref(query, { sort: query.sort === key ? DEFAULT_SORT : key })
}

function SortItem({ query, sort }: Props & { sort: SortKey }) {
  return (
    <MenuLink
      href={sortHref(query, sort)}
      active={query.sort === sort}
      title={SORT_HINTS[sort]}
      closeOnSelect
    >
      {SORT_LABELS[sort]}
    </MenuLink>
  )
}

function FilterItem({ query, filter }: Props & { filter: QuickFilter }) {
  return (
    <MenuLink
      href={cadastrosHref(query, { filtros: toggle(query.filtros, filter) })}
      active={query.filtros.includes(filter)}
    >
      {QUICK_FILTER_LABELS[filter]}
    </MenuLink>
  )
}

/* ------------------------------------------------------------------
   Seções, por coluna
   ------------------------------------------------------------------ */

function NomeSections({ query }: Props) {
  return (
    <MenuGroup label="Ordenar">
      <SortItem query={query} sort="nome" />
      <SortItem query={query} sort="nome_desc" />
    </MenuGroup>
  )
}

function StatusSections({ query }: Props) {
  return (
    <>
      <MenuGroup label="Status">
        {OPERATIONAL_STATUSES.map((s) => (
          <MenuLink
            key={s}
            href={cadastrosHref(query, { status: toggle(query.status, s) })}
            active={query.status.includes(s)}
          >
            {OPERATIONAL_STATUS_LABELS[s]}
          </MenuLink>
        ))}
      </MenuGroup>

      <MenuGroup label="Marcadores">
        {MARKER_FILTERS.map((f) => (
          <FilterItem key={f} query={query} filter={f} />
        ))}
      </MenuGroup>

      {/* Atalhos: um marca vários status de uma vez, o outro troca a ordem.
          Vivem juntos porque é assim que o Julio pensa neles — "me mostra o que
          está parado comigo" não é um filtro nem uma ordenação, é uma pergunta. */}
      <MenuGroup label="Atalhos">
        <FilterItem query={query} filter="followup" />
        <SortItem query={query} sort="atencao" />
      </MenuGroup>
    </>
  )
}

function InteracaoSections({ query }: Props) {
  return (
    <MenuGroup label="Ordenar">
      <SortItem query={query} sort="interacao" />
      <SortItem query={query} sort="interacao_asc" />
    </MenuGroup>
  )
}

function SessaoSections({ query }: Props) {
  return (
    <>
      <MenuGroup label="Ordenar">
        <SortItem query={query} sort="sessao" />
      </MenuGroup>
      <MenuGroup label="Filtrar">
        <FilterItem query={query} filter="sessao" />
      </MenuGroup>
    </>
  )
}

const SECTIONS: Record<MenuColumn, (p: Props) => React.ReactElement> = {
  nome: NomeSections,
  status: StatusSections,
  interacao: InteracaoSections,
  sessao: SessaoSections,
}

/* ------------------------------------------------------------------
   Desktop — um dropdown por cabeçalho
   ------------------------------------------------------------------ */

/**
 * Ícone de cada cabeçalho (Adendo 4, 10/08). Mora aqui, não em
 * `_ui/cadastros.ts`: aquele módulo é o contrato da tela (nomes de coluna,
 * chaves de URL, tipos da view) e ícone é aparência — o dia em que a marca
 * trocar de set de ícones não pode ser o dia em que o contrato muda.
 *
 * Mesmo set (lucide, 18px, stroke 1.5) e mesma gramática da sidebar: pessoa
 * para quem é, etiqueta para em que pé está, relógio para quando falou,
 * calendário para quando volta.
 */
const COLUMN_ICONS: Record<MenuColumn, typeof User> = {
  nome: User,
  status: Tag,
  interacao: Clock,
  sessao: CalendarDays,
}

export function ColumnHeaderMenu({
  query,
  column,
  align = 'start',
}: {
  query: CadastrosQuery
  column: MenuColumn
  align?: 'start' | 'end'
}) {
  const Sections = SECTIONS[column]
  const Icon = COLUMN_ICONS[column]
  return (
    <ColumnMenu
      label={MENU_COLUMN_LABELS[column]}
      count={menuActiveCount(query, column)}
      align={align}
      icon={<Icon size={18} strokeWidth={1.5} />}
      iconOnly
      triggerClassName="fh-cad-menu__trigger--icon"
    >
      <Sections query={query} />
    </ColumnMenu>
  )
}

/* ------------------------------------------------------------------
   Celular — os quatro painéis num só
   ------------------------------------------------------------------ */

export function FiltrosSheet({ query }: { query: CadastrosQuery }) {
  const total = MENU_COLUMNS.reduce((n, c) => n + menuActiveCount(query, c), 0)

  return (
    <ColumnMenu
      label="Filtrar/Ordenar"
      count={total}
      align="end"
      icon={<SlidersHorizontal size={14} strokeWidth={1.5} />}
      triggerClassName="fh-cad-menu__trigger--button"
    >
      {MENU_COLUMNS.map((column) => {
        const Sections = SECTIONS[column]
        return (
          <section key={column} className="fh-cad-menu__column">
            <p className="fh-cad-menu__columnlabel">{MENU_COLUMN_LABELS[column]}</p>
            <Sections query={query} />
          </section>
        )
      })}
    </ColumnMenu>
  )
}

/* ------------------------------------------------------------------
   Tag do cliente (Fase 4, Bloco 5)
   ------------------------------------------------------------------ */

/**
 * Filtro por UMA tag, no mesmo padrão dos demais dropdowns: cada item é um
 * <Link> pra uma URL, o estado inteiro segue na barra de endereço, e o servidor
 * continua fazendo o recorte.
 *
 * Não é dropdown de COLUNA porque a lista não tem coluna de tag — tag é rótulo
 * que se lê na ficha, e trazer uma coluna dela pra cá disputaria espaço com o
 * nome, que é o dado que identifica a linha. Ele mora na barra, ao lado da
 * busca.
 *
 * Inativas aparecem com o sufixo "(desativada)": elas seguem filtráveis (quem
 * tem, tem), e esconder isso faria o Julio procurar no editor uma tag que não
 * está mais lá pra aplicar.
 */
export function TagMenu({
  query,
  catalog,
}: {
  query: CadastrosQuery
  catalog: TagCatalogEntry[]
}) {
  // Tag de um link antigo, já excluída do catálogo: aparece pelo slug cru em
  // vez de sumir calada com o filtro ainda aceso na lista.
  const orphan = query.tag && !catalog.some((t) => t.slug === query.tag)

  return (
    <ColumnMenu
      label="Tag"
      count={query.tag ? 1 : 0}
      // `start` e não `end` como o Filtrar/Ordenar: aquele é o último item da
      // barra, então ancorar pela direita o mantém dentro da tela. Este fica no
      // meio da linha, e ancorado pela direita o painel saía ~18px pela
      // esquerda em 390px (medido em CDP).
      align="start"
      icon={<Tag size={14} strokeWidth={1.5} />}
      triggerClassName="fh-cad-menu__trigger--button"
    >
      <MenuGroup label="Tag do cliente">
        <MenuLink
          href={cadastrosHref(query, { tag: '' })}
          active={query.tag === ''}
          closeOnSelect
        >
          Todas
        </MenuLink>

        {orphan && (
          <MenuLink
            href={cadastrosHref(query, { tag: query.tag })}
            active
            title="Essa tag foi excluída do catálogo."
            closeOnSelect
          >
            {query.tag} (excluída)
          </MenuLink>
        )}

        {catalog.map((tag) => (
          <MenuLink
            key={tag.slug}
            href={cadastrosHref(query, { tag: tag.slug })}
            active={query.tag === tag.slug}
            closeOnSelect
          >
            {filterOptionLabel(tag)}
          </MenuLink>
        ))}

        {catalog.length === 0 && !orphan && (
          <p className="fh-cad-menu__empty fh-micro">
            Nenhuma tag no catálogo. Cria a primeira na ficha de um contato.
          </p>
        )}
      </MenuGroup>
    </ColumnMenu>
  )
}
