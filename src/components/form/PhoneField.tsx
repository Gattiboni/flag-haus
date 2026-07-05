'use client'

import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js/max'

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
const COUNTRIES: CountryCode[] = [
  'BR',
  ...getCountries().filter((c) => c !== 'BR'),
]

const controlCls =
  'bg-transparent border-0 border-b border-[color:var(--onyx)] py-2.5 text-lg text-[color:var(--onyx)] outline-none focus:border-[color:var(--oxblood)] transition-colors'

/**
 * Seletor de país (bandeira + ISO + DDI) + input de telefone.
 * Controlado pelo form pai. Validação (isValidPhoneNumber) fica no Continuar.
 */
export function PhoneField({
  phone,
  country,
  onPhoneChange,
  onCountryChange,
  error,
}: PhoneFieldProps) {
  return (
    <div className="my-8">
      <label className="block text-[13px] uppercase tracking-[0.12em] text-[color:var(--granite)] mb-3">
        WhatsApp com DDD
      </label>
      <div className="flex gap-3 items-end">
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className={`${controlCls} shrink-0 max-w-[9rem]`}
          aria-label="País"
        >
          {COUNTRIES.map((iso) => (
            <option key={iso} value={iso}>
              {flagEmoji(iso)} {iso} +{getCountryCallingCode(iso)}
            </option>
          ))}
        </select>
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="11 98334 0447"
          className={`${controlCls} flex-1 min-w-0`}
        />
      </div>
      {error && (
        <p className="text-[color:var(--oxblood)] text-[13px] mt-2">{error}</p>
      )}
    </div>
  )
}
