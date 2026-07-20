'use client'

import { useId } from 'react'
import type { ReactNode, TextareaHTMLAttributes } from 'react'
import '../field.css'
import './textarea.css'

export type TextareaProps = {
  label?: ReactNode
  helperText?: ReactNode
  error?: ReactNode
  required?: boolean
  optionalText?: string
  className?: string
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>

/** Campo multi-linha: observações da sessão, descrição do job, anamnese. */
export function Textarea({
  label,
  helperText,
  error,
  required = false,
  optionalText,
  id,
  rows = 4,
  disabled = false,
  className = '',
  ...rest
}: TextareaProps) {
  const reactId = useId()
  const fieldId = id ?? reactId
  const messageId = `${fieldId}-msg`
  const hasError = Boolean(error)
  const message = error ?? helperText

  return (
    <div className={`fh-field ${className}`.trim()}>
      {label && (
        <label htmlFor={fieldId} className="fh-field__label">
          <span>
            {label}
            {required && (
              <span className="fh-field__required" aria-hidden="true">
                *
              </span>
            )}
          </span>
          {!required && optionalText && (
            <span className="fh-field__optional">{optionalText}</span>
          )}
        </label>
      )}

      <textarea
        id={fieldId}
        rows={rows}
        className="fh-control fh-textarea"
        disabled={disabled}
        required={required}
        data-error={hasError || undefined}
        aria-invalid={hasError || undefined}
        aria-describedby={message ? messageId : undefined}
        {...rest}
      />

      {message && (
        <p id={messageId} className="fh-field__message" data-error={hasError || undefined}>
          {message}
        </p>
      )}
    </div>
  )
}
