'use client'

import { useState, type ReactNode } from 'react'

type Choice = 'none' | 'confirm' | 'edit' | 'remove'

type ConfirmFieldProps = {
  /** Pergunta no tom do copy, já com o valor interpolado. */
  label: string
  /** Valor atual (dono é o form pai; começa = valor do banco). */
  value: string
  onChange: (value: string) => void
  /** Rótulo do pill de confirmação: "Confirmar" (default) | "Manter". */
  confirmLabel?: string
  /** Rótulo do pill de edição: "Corrigir" | "Atualizar" | "Adicionar / atualizar". */
  editLabel?: string
  allowRemove?: boolean
  inputType?: string
  /** Editor custom (ex.: GeoFields, textarea). Default = input simples. */
  renderEditor?: (value: string, onChange: (v: string) => void) => ReactNode
}

const pill =
  'rounded-full border border-[color:var(--onyx)] px-5 py-3 text-sm transition-colors cursor-pointer'
const pillOn = 'bg-[color:var(--onyx)] text-[color:var(--white)]'
const pillOff = 'text-[color:var(--onyx)] hover:bg-[color:var(--whisper)]'

const inputCls =
  'w-full bg-transparent border-0 border-b border-[color:var(--onyx)] py-2.5 text-lg text-[color:var(--onyx)] outline-none focus:border-[color:var(--oxblood)] transition-colors'

/**
 * Confirmação leve com edição inline: Confirmar mantém o valor do banco;
 * o pill de edição abre o editor no mesmo step; Remover (opcional) esvazia.
 */
export function ConfirmField({
  label,
  value,
  onChange,
  confirmLabel = 'Confirmar',
  editLabel = 'Corrigir',
  allowRemove = false,
  inputType = 'text',
  renderEditor,
}: ConfirmFieldProps) {
  const [choice, setChoice] = useState<Choice>('none')

  return (
    <div>
      <h2 className="text-2xl leading-snug mb-5">{label}</h2>

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          type="button"
          onClick={() => setChoice('confirm')}
          className={`${pill} ${choice === 'confirm' ? pillOn : pillOff}`}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setChoice('edit')}
          className={`${pill} ${choice === 'edit' ? pillOn : pillOff}`}
        >
          {editLabel}
        </button>
        {allowRemove && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              setChoice('remove')
            }}
            className={`${pill} ${choice === 'remove' ? pillOn : pillOff}`}
          >
            Remover
          </button>
        )}
      </div>

      {choice === 'edit' && (
        <div className="my-8">
          {renderEditor ? (
            renderEditor(value, onChange)
          ) : (
            <input
              type={inputType}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={inputCls}
              autoFocus
            />
          )}
        </div>
      )}

      {choice === 'remove' && (
        <p className="text-[color:var(--granite)] text-[15px] mt-6">Removido.</p>
      )}
    </div>
  )
}
