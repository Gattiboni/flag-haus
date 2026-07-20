'use client'

import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js/max'
import { Input, Select } from '@/components/ui'

type PhoneFieldProps = {
  phone: string
  country: string
  onPhoneChange: (value: string) => void
  onCountryChange: (country: string) => void
  error?: string | null
}

/** Bandeira emoji a partir do ISO alpha-2 (regional indicator symbols). */
function flagEmoji(iso: string): string {
  return String.fromCodePoint(
    ...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  )
}

// BR primeiro, resto em ordem alfabética do ISO.
const COUNTRY_OPTIONS = ['BR', ...getCountries().filter((c) => c !== 'BR')].map(
  (iso) => ({
    value: iso,
    label: `${flagEmoji(iso as CountryCode)} ${iso} +${getCountryCallingCode(iso as CountryCode)}`,
  })
)

/**
 * Seletor de país (bandeira + ISO + DDI) + campo de telefone.
 * Controlado pelo form pai. Validação (isValidPhoneNumber) fica no Continuar.
 *
 * Dívida rastreada (anterior a esta spec): a bandeira é emoji e não renderiza
 * no Chrome/Windows. Vira SVG numa spec própria.
 */
export function PhoneField({
  phone,
  country,
  onPhoneChange,
  onCountryChange,
  error,
}: PhoneFieldProps) {
  return (
    <div className="mt-fh-6">
      <div className="flex gap-fh-3 items-start">
        <Select
          label="País"
          className="shrink-0 max-w-40"
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          options={COUNTRY_OPTIONS}
        />
        <Input
          label="WhatsApp com DDD"
          className="flex-1"
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="11 98334 0447"
          error={error ?? undefined}
        />
      </div>
    </div>
  )
}
