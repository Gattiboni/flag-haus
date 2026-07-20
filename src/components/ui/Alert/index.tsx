import type { ReactNode } from 'react'
import './alert.css'

export type AlertVariant = 'info' | 'success' | 'warning' | 'critical'

export type AlertProps = {
  variant?: AlertVariant
  title?: ReactNode
  /** Ícone Lucide; sem ele o alerta usa a marca padrão da variante. */
  icon?: ReactNode
  className?: string
  children?: ReactNode
}

const DEFAULT_MARK: Record<AlertVariant, string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  critical: '!',
}

/**
 * Feedback inline. `critical` usa `role="alert"` (assertivo) para que o leitor
 * de tela anuncie na hora — é o alerta de alergia; os outros usam `status`.
 */
export function Alert({
  variant = 'info',
  title,
  icon,
  className = '',
  children,
}: AlertProps) {
  return (
    <div
      role={variant === 'critical' ? 'alert' : 'status'}
      className={`fh-alert fh-alert--${variant} ${className}`.trim()}
    >
      <span
        className={`fh-alert__mark${icon ? ' fh-alert__mark--icon' : ''}`}
        aria-hidden="true"
      >
        {icon ?? DEFAULT_MARK[variant]}
      </span>
      <div className="fh-alert__body">
        {title && <p className="fh-alert__title">{title}</p>}
        {children && <div className="fh-alert__content">{children}</div>}
      </div>
    </div>
  )
}
