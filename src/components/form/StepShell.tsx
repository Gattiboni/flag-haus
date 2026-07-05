'use client'

import type { ReactNode } from 'react'

type StepShellProps = {
  counter: string
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  nextDisabled?: boolean
  children: ReactNode
}

/**
 * Moldura de cada step: header (marca + contador), corpo e nav.
 * Reproduz o visual do preview (cadastro_preview_v1.html) com os
 * tokens do globals.css. Voltar é opcional (abertura não tem).
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
    <main className="max-w-[560px] mx-auto px-6 sm:px-8 pt-16 sm:pt-20 pb-[120px] min-h-screen flex flex-col">
      <header className="flex justify-between items-baseline pb-8 border-b border-[color:var(--line)] mb-14">
        <span className="font-[family-name:var(--font-fraunces)] text-lg tracking-[0.02em]">
          Flag Haus
        </span>
        <span className="text-[11px] text-[color:var(--granite)] tracking-[0.12em] uppercase">
          {counter}
        </span>
      </header>

      <div className="flex-1">{children}</div>

      <div className="flex justify-between items-center mt-14 pt-8 border-t border-[color:var(--line)]">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm tracking-[0.04em] text-[color:var(--granite)] hover:text-[color:var(--onyx)] transition-colors cursor-pointer"
          >
            Voltar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className="text-sm tracking-[0.04em] px-7 py-3.5 rounded-full bg-[color:var(--onyx)] text-[color:var(--white)] border border-[color:var(--onyx)] hover:bg-[color:var(--oxblood)] hover:border-[color:var(--oxblood)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
        >
          {nextLabel}
        </button>
      </div>
    </main>
  )
}
