import type { ReactNode } from 'react'
import type { JobStatus } from '@/lib/domain/job-status'
import './badge.css'

/**
 * As variantes de status são os valores do enum `job_status` do banco — não os
 * nomes genéricos do design system — porque no Flag Haus `quoted` é "A orçar"
 * (quem separa "ainda não orçei" de "orçei e sumiu" é o quoted_price, não o
 * enum). O mapa de tokens está em badge.css.
 */
export type BadgeVariant = JobStatus | 'neutral' | 'warning' | 'critical'

export type BadgeProps = {
  variant?: BadgeVariant
  /** Ponto de status antes do rótulo. */
  dot?: boolean
  className?: string
  children: ReactNode
}

/** Chip de status, quieto por natureza. */
export function Badge({
  variant = 'neutral',
  dot = false,
  className = '',
  children,
}: BadgeProps) {
  return (
    <span className={`fh-badge fh-badge--${variant} ${className}`.trim()}>
      {dot && <span className="fh-badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
