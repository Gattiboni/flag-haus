'use client'

import { useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import '../field.css'
import './select.css'

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SelectProps = {
  label?: ReactNode
  helperText?: ReactNode
  error?: ReactNode
  required?: boolean
  /** Opções como `{value,label}` ou string simples. */
  options: Array<SelectOption | string>
  /** Primeira opção, desabilitada, para o estado vazio. */
  placeholder?: string
  className?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>

/** Dropdown nativo estilizado. Use para listas fechadas (status, região). */
export function Select({
  label,
  helperText,
  error,
  required = false,
  options,
  placeholder,
  id,
  value,
  disabled = false,
  className = '',
  ...rest
}: SelectProps) {
  const reactId = useId()
  const fieldId = id ?? reactId
  const messageId = `${fieldId}-msg`
  const hasError = Boolean(error)
  const message = error ?? helperText
  const isEmpty = value === '' || value == null

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
        </label>
      )}

      <div className="fh-select">
        <select
          id={fieldId}
          className="fh-control fh-select__control"
          value={value}
          disabled={disabled}
          required={required}
          data-error={hasError || undefined}
          data-placeholder={(placeholder && isEmpty) || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={message ? messageId : undefined}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => {
            const opt: SelectOption =
              typeof option === 'string' ? { value: option, label: option } : option
            return (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            )
          })}
        </select>

        {/* Chevron desenhado à mão em 1.25px, no espírito fineline da marca. */}
        <svg
          className="fh-select__chevron"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 5.5 L7 9 L11 5.5" />
        </svg>
      </div>

      {message && (
        <p id={messageId} className="fh-field__message" data-error={hasError || undefined}>
          {message}
        </p>
      )}
    </div>
  )
}
