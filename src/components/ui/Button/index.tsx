import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'
import './button.css'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger'
export type ButtonSize = 'sm' | 'md'

export type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Ícone Lucide (18–20px, stroke 1.5). */
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  loading?: boolean
  children?: ReactNode
  /** React 19 aceita `ref` como prop normal — sem forwardRef. */
  ref?: Ref<HTMLButtonElement>
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

/**
 * Botão do padrão Flag Haus.
 *
 * `primary` é reservado (regra 10/90): um por tela. `danger` divide o Oxblood
 * com o primary de propósito — são separados por tratamento e contexto,
 * nunca mostrados competindo no mesmo cluster.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth = false,
  loading = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    'fh-button',
    `fh-button--${variant}`,
    size === 'sm' ? 'fh-button--sm' : '',
    fullWidth ? 'fh-button--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const mark = loading ? (
    <span className="fh-button__spinner" aria-hidden="true" />
  ) : icon ? (
    <span className="fh-button__icon" aria-hidden="true">
      {icon}
    </span>
  ) : null

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      {...rest}
    >
      {iconPosition === 'left' && mark}
      {children != null && <span>{children}</span>}
      {iconPosition === 'right' && mark}
    </button>
  )
}
