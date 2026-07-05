import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max'

/**
 * Normaliza telefone para E.164 (ex.: "+5511983340447").
 * Recebe o número livre + o país (ISO 3166-1 alpha-2, ex.: "BR", "US").
 * Retorna o E.164 se o número for válido pra aquele país, senão null.
 *
 * Exemplos (country = "BR"):
 *   "11 98334 0447"     → "+5511983340447"
 *   "(11) 98334-0447"   → "+5511983340447"
 *   "1198334157"        → null (dígitos de menos)
 */
export function toE164(input: string, country: string): string | null {
  const parsed = parsePhoneNumberFromString(input ?? '', country as CountryCode)
  if (parsed && parsed.isValid()) {
    return parsed.number
  }
  return null
}
