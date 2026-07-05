'use client'

export type PillOption = { value: string; label: string }

type OptionPillsProps = {
  value: string
  onChange: (value: string) => void
  options: PillOption[]
  stacked?: boolean
}

/**
 * Grupo de opções estilo pill (padrão visual do preview), controlado.
 * `stacked` empilha vertical (lista de escolhas longas).
 */
export function OptionPills({
  value,
  onChange,
  options,
  stacked = false,
}: OptionPillsProps) {
  return (
    <div
      className={
        stacked
          ? 'flex flex-col gap-2 mt-4'
          : 'flex flex-wrap gap-3 mt-4'
      }
    >
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'rounded-full border border-[color:var(--onyx)] px-5 py-3 text-sm transition-colors cursor-pointer',
              stacked ? 'w-full text-left' : '',
              selected
                ? 'bg-[color:var(--onyx)] text-[color:var(--white)]'
                : 'text-[color:var(--onyx)] hover:bg-[color:var(--whisper)]',
            ].join(' ')}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
