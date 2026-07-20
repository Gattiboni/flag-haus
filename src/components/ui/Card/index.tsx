import type { ElementType, HTMLAttributes, ReactNode } from 'react'
import './card.css'

export type CardTone = 'raised' | 'sunken' | 'inset' | 'inverse'

export type CardProps = {
  tone?: CardTone
  /** `false` remove o padding interno (listas que sangram até a borda). */
  padded?: boolean
  bordered?: boolean
  /** Borda oxblood 1.5px — "leia com atenção" (consentimento sensível). */
  accent?: boolean
  /** Elemento renderizado — `section`, `article`, `li`… */
  as?: ElementType
  /** Layout externo (Tailwind) é de quem consome. */
  className?: string
  children?: ReactNode
} & Omit<HTMLAttributes<HTMLElement>, 'className'>

/** Superfície-base. Nunca ganha sombra: a elevação é o contraste de fundo. */
export function Card({
  tone = 'raised',
  padded = true,
  bordered = true,
  accent = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}: CardProps) {
  const classes = [
    'fh-card',
    tone !== 'raised' ? `fh-card--${tone}` : '',
    accent ? 'fh-card--accent' : '',
    padded ? '' : 'fh-card--flush',
    bordered ? '' : 'fh-card--borderless',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}

export type CardHeaderProps = {
  title: ReactNode
  description?: ReactNode
  /** Slot à direita: badge, contador, botão. */
  action?: ReactNode
  className?: string
}

/** Cabeçalho titulado de um Card: título + descrição opcional + ação. */
export function CardHeader({
  title,
  description,
  action,
  className = '',
}: CardHeaderProps) {
  return (
    <div className={`fh-card-header ${className}`.trim()}>
      <div className="fh-card-header__text">
        <h3 className="fh-card-header__title">{title}</h3>
        {description && <p className="fh-card-header__description">{description}</p>}
      </div>
      {action && <div className="fh-card-header__action">{action}</div>}
    </div>
  )
}
