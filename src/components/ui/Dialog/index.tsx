'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'
import { Button } from '../Button'
import './dialog.css'

export type DialogProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm?: () => void
  /** Desabilita o botão de confirmar enquanto uma ação corre. */
  loading?: boolean
  /** Corpo custom entre a descrição e as ações. */
  children?: ReactNode
}

/**
 * Modal de confirmação. Escape e clique no scrim fecham; o foco vai para o
 * botão de confirmar ao abrir e volta para quem abriu ao fechar.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  loading = false,
  children,
}: DialogProps) {
  const titleId = useId()
  const descriptionId = `${titleId}-desc`
  const confirmRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<Element | null>(null)

  // `onClose` costuma chegar como arrow inline, ou seja: identidade nova a cada
  // render. Se ele entrasse nas deps do efeito, o foco seria devolvido e
  // roubado de novo a cada re-render com o modal aberto. A ref mantém o
  // callback fresco sem re-disparar o efeito, que só depende de `open`.
  // A atribuição vai num efeito, não no corpo do render: mutar ref durante o
  // render é proibido pelo react-hooks/refs. O listener só lê .current quando
  // a tecla é apertada, bem depois do efeito ter rodado.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return

    openerRef.current = document.activeElement
    confirmRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const opener = openerRef.current
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [open])

  // Sem estado de "mounted": o Dialog só abre por interação do usuário, então
  // o guard de `document` basta e evita um setState dentro de efeito.
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fh-dialog__scrim"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="fh-dialog"
      >
        {variant === 'danger' && (
          <div className="fh-dialog__mark" aria-hidden="true">
            !
          </div>
        )}

        <h2 id={titleId} className="fh-dialog__title">
          {title}
        </h2>

        {description && (
          <p id={descriptionId} className="fh-dialog__description">
            {description}
          </p>
        )}

        {children && <div className="fh-dialog__body">{children}</div>}

        <div className="fh-dialog__actions">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
