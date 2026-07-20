'use client'

import { useId } from 'react'
import type { ReactNode } from 'react'
import '../field.css'
import './radio-group.css'

export type RadioOption = {
  value: string
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
}

export type RadioGroupProps = {
  /** Legenda do fieldset — a pergunta. */
  legend?: ReactNode
  options: RadioOption[]
  value?: string | null
  defaultValue?: string
  onChange?: (value: string) => void
  /** `name` do grupo; gerado se omitido. */
  name?: string
  helperText?: ReactNode
  error?: ReactNode
  disabled?: boolean
  required?: boolean
  className?: string
}

/**
 * Escolha única. Preferido ao `Select` quando as opções são poucas
 * e vale a pena vê-las todas de uma vez — o caso da anamnese.
 */
export function RadioGroup({
  legend,
  options,
  value,
  defaultValue,
  onChange,
  name,
  helperText,
  error,
  disabled = false,
  required = false,
  className = '',
}: RadioGroupProps) {
  const reactId = useId()
  const groupName = name ?? reactId
  const hasError = Boolean(error)
  const message = error ?? helperText
  const controlled = value !== undefined
  const messageId = `${reactId}-msg`

  return (
    <fieldset
      className={`fh-radio-group ${className}`.trim()}
      disabled={disabled}
      aria-describedby={message ? messageId : undefined}
    >
      {legend && (
        <legend className="fh-radio-group__legend">
          {legend}
          {required && (
            <span className="fh-field__required" aria-hidden="true">
              *
            </span>
          )}
        </legend>
      )}

      {options.map((option) => {
        const isDisabled = disabled || option.disabled
        return (
          <label
            key={option.value}
            className={`fh-radio${option.description ? ' fh-radio--with-description' : ''}`}
            data-disabled={isDisabled || undefined}
          >
            <span className="fh-radio__control">
              <input
                type="radio"
                className="fh-radio__dot"
                name={groupName}
                value={option.value}
                disabled={isDisabled}
                {...(controlled
                  ? { checked: value === option.value }
                  : { defaultChecked: defaultValue === option.value })}
                onChange={(event) => onChange?.(event.target.value)}
              />
              <span className="fh-radio__fill" aria-hidden="true" />
            </span>

            <span className="fh-radio__text">
              <span className="fh-radio__label">{option.label}</span>
              {option.description && (
                <span className="fh-radio__description">{option.description}</span>
              )}
            </span>
          </label>
        )
      })}

      {message && (
        <p id={messageId} className="fh-field__message" data-error={hasError || undefined}>
          {message}
        </p>
      )}
    </fieldset>
  )
}
