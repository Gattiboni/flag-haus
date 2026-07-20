'use client'

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import '../field.css'
import './input.css'

export type InputProps = {
  label?: ReactNode
  /** Texto de apoio abaixo do campo. `error` tem precedência. */
  helperText?: ReactNode
  error?: ReactNode
  required?: boolean
  /** Rótulo curto para campos opcionais (ex: "opcional"). */
  optionalText?: string
  /** Conteúdo colado à esquerda dentro da borda (ex: "R$"). */
  prefix?: ReactNode
  /** Conteúdo colado à direita dentro da borda (ex: "cm", ícone). */
  suffix?: ReactNode
  /** Classe aplicada ao wrapper — layout externo é de quem consome. */
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'className'>

/**
 * Campo de texto do padrão Flag Haus.
 * Estado se comunica por cor de borda + legenda curta: a marca proíbe
 * brilho, então foco é outline nítido e erro é fio oxblood.
 */
export function Input({
  label,
  helperText,
  error,
  required = false,
  optionalText,
  prefix,
  suffix,
  id,
  type = 'text',
  disabled = false,
  className = '',
  ...rest
}: InputProps) {
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

      <div
        className="fh-control fh-input__shell"
        data-error={hasError || undefined}
        data-disabled={disabled || undefined}
      >
        {prefix && <span className="fh-input__affix">{prefix}</span>}
        <input
          id={fieldId}
          type={type}
          className="fh-input__field"
          disabled={disabled}
          required={required}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          {...rest}
        />
        {suffix && <span className="fh-input__affix">{suffix}</span>}
      </div>

      {message && (
        <p id={messageId} className="fh-field__message" data-error={hasError || undefined}>
          {message}
        </p>
      )}
    </div>
  )
}
