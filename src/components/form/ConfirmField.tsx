'use client'

import { useState, type ReactNode } from 'react'
import { Button, Input } from '@/components/ui'

type Choice = 'none' | 'confirm' | 'edit' | 'remove'

type ConfirmFieldProps = {
  /** Pergunta no tom do copy, já com o valor interpolado. */
  label: string
  /** Valor atual (dono é o form pai; começa = valor do banco). */
  value: string
  onChange: (value: string) => void
  /** Rótulo do botão de confirmação: "Confirmar" (default) | "Manter". */
  confirmLabel?: string
  /** Rótulo do botão de edição: "Corrigir" | "Atualizar" | "Adicionar / atualizar". */
  editLabel?: string
  allowRemove?: boolean
  inputType?: string
  /** Editor custom (ex.: GeoFields, Textarea). Default = Input simples. */
  renderEditor?: (value: string, onChange: (v: string) => void) => ReactNode
}

/**
 * Confirmação leve com edição inline: Confirmar mantém o valor do banco;
 * o botão de edição abre o editor no mesmo step; Remover (opcional) esvazia.
 *
 * São AÇÕES, não uma escolha de dado — por isso continuam botões (e não
 * viraram RadioGroup como o OptionPills). A opção ativa fica `primary`;
 * as outras, `secondary`.
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
      <h2>{label}</h2>

      <div className="flex flex-wrap gap-fh-3 mt-fh-5">
        <Button
          variant={choice === 'confirm' ? 'primary' : 'secondary'}
          onClick={() => setChoice('confirm')}
        >
          {confirmLabel}
        </Button>
        <Button
          variant={choice === 'edit' ? 'primary' : 'secondary'}
          onClick={() => setChoice('edit')}
        >
          {editLabel}
        </Button>
        {allowRemove && (
          <Button
            variant={choice === 'remove' ? 'primary' : 'secondary'}
            onClick={() => {
              onChange('')
              setChoice('remove')
            }}
          >
            Remover
          </Button>
        )}
      </div>

      {choice === 'edit' && (
        <div className="mt-fh-6">
          {renderEditor ? (
            renderEditor(value, onChange)
          ) : (
            <Input
              type={inputType}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              autoFocus
            />
          )}
        </div>
      )}

      {choice === 'remove' && <p className="fh-lead mt-fh-5">Removido.</p>}
    </div>
  )
}
