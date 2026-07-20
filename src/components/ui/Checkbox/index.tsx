'use client'

import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import './checkbox.css'

export type CheckboxProps = {
  label?: ReactNode
  /** Detalhe curto abaixo do rótulo — usado no consentimento LGPD. */
  description?: ReactNode
  className?: string
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

/** Controle de múltipla escolha / consentimento. */
export function Checkbox({
  label,
  description,
  id,
  disabled = false,
  className = '',
  ...rest
}: CheckboxProps) {
  const reactId = useId()
  const fieldId = id ?? reactId

  const classes = [
    'fh-checkbox',
    description ? 'fh-checkbox--with-description' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <label htmlFor={fieldId} className={classes} data-disabled={disabled || undefined}>
      <span className="fh-checkbox__control">
        <input
          id={fieldId}
          type="checkbox"
          className="fh-checkbox__box"
          disabled={disabled}
          {...rest}
        />
        <svg
          className="fh-checkbox__check"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 6.25 L4.75 8.5 L9.5 3.5" />
        </svg>
      </span>

      {(label || description) && (
        <span className="fh-checkbox__text">
          {label && <span className="fh-checkbox__label">{label}</span>}
          {description && <span className="fh-checkbox__description">{description}</span>}
        </span>
      )}
    </label>
  )
}
