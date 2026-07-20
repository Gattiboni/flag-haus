'use client'

import { RadioGroup } from '@/components/ui'

export type PillOption = { value: string; label: string; description?: string }

type OptionPillsProps = {
  value: string
  onChange: (value: string) => void
  options: PillOption[]
  /** Mantido pela compatibilidade das ~20 chamadas; o RadioGroup já empilha. */
  stacked?: boolean
  /** Legenda do grupo, quando a pergunta não está no <h2> acima. */
  legend?: string
}

/**
 * Escolha única dos wizards.
 *
 * Era um grupo de pills (botão redondo que preenchia de onyx ao escolher).
 * Na Spec #4c-visual virou um `RadioGroup` do padrão: o design system não tem
 * segmented control, e a regra de adoção proíbe improvisar componente novo —
 * escolha única com poucas opções visíveis de uma vez é exatamente o caso do
 * `RadioGroup` (e o que o `.prompt.md` dele recomenda).
 *
 * O nome do arquivo e a API ficaram como estavam de propósito: as ~20 chamadas
 * nos dois formulários não mudam, e o comportamento (escolhe e segue no
 * Continuar) é o mesmo de antes.
 */
export function OptionPills({
  value,
  onChange,
  options,
  legend,
}: OptionPillsProps) {
  return (
    <RadioGroup
      className="mt-fh-4"
      legend={legend}
      value={value}
      onChange={onChange}
      options={options}
    />
  )
}
