'use client'

import type { ReactNode } from 'react'

type TerminalScreenProps = {
  title: string
  children: ReactNode
  /** Assinatura ao pé. Default: "— Julio". `null` remove. */
  signature?: string | null
}

/**
 * Tela terminal dos wizards (bloqueio de menor, sucesso do envio): mesma
 * moldura do StepShell, sem contador e sem navegação — não há pra onde ir.
 *
 * Existia duplicada quatro vezes entre cadastro e anamnese; a Spec #4c-visual
 * juntou aqui porque as quatro tinham o mesmo header, o mesmo respiro e a
 * mesma assinatura.
 */
export function TerminalScreen({
  title,
  children,
  signature = '— Julio',
}: TerminalScreenProps) {
  return (
    <main className="max-w-[560px] mx-auto px-fh-5 sm:px-fh-6 pt-fh-8 pb-fh-9 min-h-screen">
      <header className="flex justify-between items-baseline pb-fh-5 border-b border-fh-subtle mb-fh-8">
        <span className="fh-wordmark">Flag Haus</span>
      </header>

      <div className="flex flex-col gap-fh-4 py-fh-6">
        <h1 className="mb-fh-2">{title}</h1>
        {children}
        {signature && <p className="fh-lead mt-fh-6">{signature}</p>}
      </div>
    </main>
  )
}
