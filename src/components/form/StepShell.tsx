'use client'

import type { ReactNode } from 'react'
import { Button } from '@/components/ui'

type StepShellProps = {
  counter: string
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  children: ReactNode
}

/**
 * Moldura de cada step: header (letreiro + contador), corpo e nav.
 * Densidade comfortable (o público preenche no celular, com dado sensível):
 * respiro generoso, alvo de toque ≥ 44px, sem sombra em lugar nenhum.
 * Voltar é opcional (a abertura não tem).
 */
export function StepShell({
  counter,
  onBack,
  onNext,
  nextLabel = 'Continuar',
  nextDisabled = false,
  children,
}: StepShellProps) {
  return (
    <main className="max-w-[560px] mx-auto px-fh-5 sm:px-fh-6 pt-fh-8 pb-fh-9 min-h-screen flex flex-col">
      <header className="flex justify-between items-baseline pb-fh-5 border-b border-fh-subtle mb-fh-8">
        <span className="fh-wordmark">Flag Haus</span>
        <span className="fh-eyebrow">{counter}</span>
      </header>

      <div className="flex-1">{children}</div>

      <div className="flex justify-between items-center gap-fh-4 mt-fh-8 pt-fh-5 border-t border-fh-subtle">
        {onBack ? (
          <Button variant="tertiary" onClick={onBack}>
            Voltar
          </Button>
        ) : (
          <span />
        )}
        <Button variant="primary" onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </Button>
      </div>
    </main>
  )
}
