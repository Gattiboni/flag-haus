'use client'

import Link from 'next/link'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import './cadastros.css'

/**
 * Dropdown de cabeçalho de coluna (Adendo 3, 09/08). Substitui as três fileiras
 * de chips: cada coluna passa a carregar o filtro e a ordenação que são dela.
 *
 * Este é o único JS de cliente que a barra de filtro ganhou, e ele faz uma coisa
 * só: abrir e fechar o painel. Todo item lá dentro continua sendo um <Link> pra
 * uma URL — o estado da tela segue inteiro na barra de endereço, colar o link no
 * WhatsApp segue reproduzindo o que o Julio via, e o servidor continua fazendo
 * filtro, ordenação e paginação. Trocamos a apresentação, não a arquitetura.
 *
 * Não é `role="menu"`: menu de aplicação implica navegação por setas e itens que
 * disparam comandos. Isto é uma lista de links — anunciar como menu obrigaria o
 * leitor de tela a prometer um teclado que não existe. O item ligado se anuncia
 * com `aria-current`, igual aos chips que ele aposenta.
 */

/** O `close` desce por contexto, não por prop: entre o painel e o MenuLink há
 *  três camadas de seção que não têm nada a ver com abrir e fechar. */
const MenuContext = createContext<{ close: () => void }>({ close: () => {} })

export function ColumnMenu({
  label,
  count = 0,
  align = 'start',
  icon,
  iconOnly = false,
  triggerClassName,
  children,
}: {
  label: string
  /** Quantos itens estão ligados; > 0 vira "STATUS (2)" e marca o cabeçalho. */
  count?: number
  align?: 'start' | 'end'
  /** Botão do celular e cabeçalhos em ícone (Adendo 4). */
  icon?: React.ReactNode
  /**
   * Esconde o texto do rótulo, deixando só o ícone (Adendo 4, 10/08). O nome
   * por extenso continua existindo: vai pro `title` e pro `aria-label`. Some da
   * tela, não da interface.
   */
  iconOnly?: boolean
  triggerClassName?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  // Fechar sem devolver o foco largaria o teclado no <body>, e o próximo Tab
  // recomeçaria do topo da página.
  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  const ctx = useMemo(() => ({ close }), [close])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  // Tab saindo do painel fecha: um painel aberto atrás do foco viraria um
  // pedaço de tela que ninguém consegue mais alcançar nem dispensar.
  function handleFocusOut(e: React.FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null
    if (next && !rootRef.current?.contains(next)) setOpen(false)
  }

  const active = count > 0

  // Sem texto na tela, o rótulo tem que chegar por outro caminho — e o contador
  // visível some junto se o `aria-label` não o disser: `aria-label` substitui o
  // conteúdo do botão, não soma a ele.
  const accessibleLabel = active
    ? `${label} (${count} ${count === 1 ? 'ativo' : 'ativos'})`
    : label

  return (
    <div className="fh-cad-menu" ref={rootRef} onBlur={handleFocusOut}>
      <button
        type="button"
        ref={triggerRef}
        className={`fh-cad-menu__trigger ${triggerClassName ?? ''}`.trim()}
        data-active={active || undefined}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={iconOnly ? accessibleLabel : undefined}
        title={iconOnly ? label : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        {icon && (
          <span className="fh-cad-menu__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        {!iconOnly && <span>{label}</span>}
        {active && <span className="fh-cad-menu__count fh-tnum">({count})</span>}
        <ChevronDown
          size={14}
          strokeWidth={1.5}
          className="fh-cad-menu__caret"
          aria-hidden="true"
        />
      </button>

      {open && (
        <div id={panelId} className="fh-cad-menu__panel" data-align={align}>
          <MenuContext.Provider value={ctx}>{children}</MenuContext.Provider>
        </div>
      )}
    </div>
  )
}

/** Uma seção do painel (Status · Marcadores · Atalhos · Ordenar). */
export function MenuGroup({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="fh-cad-menu__group">
      <p className="fh-eyebrow fh-cad-menu__grouplabel">{label}</p>
      {children}
    </div>
  )
}

/**
 * Item do painel. `closeOnSelect` separa os dois gestos: escolher UMA ordenação
 * termina a interação e fecha; ligar/desligar um status é multi-seleção e o
 * painel fica aberto pro próximo clique — fechar a cada toggle obrigaria o Julio
 * a reabrir o menu quatro vezes pra montar um recorte de quatro status.
 */
export function MenuLink({
  href,
  active,
  title,
  closeOnSelect = false,
  children,
}: {
  href: string
  active: boolean
  title?: string
  closeOnSelect?: boolean
  children: React.ReactNode
}) {
  const { close } = useContext(MenuContext)

  return (
    <Link
      href={href}
      className="fh-cad-menu__item"
      data-active={active || undefined}
      aria-current={active ? 'true' : undefined}
      title={title}
      onClick={() => {
        if (closeOnSelect) close()
      }}
    >
      {/* Sempre no DOM, escondido quando desligado: some o pulo de 20px que o
          rótulo daria ao ligar e desligar o item. */}
      <Check
        size={14}
        strokeWidth={2}
        className="fh-cad-menu__check"
        aria-hidden="true"
      />
      <span>{children}</span>
    </Link>
  )
}
