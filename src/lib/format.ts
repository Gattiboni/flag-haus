import { parsePhoneNumberFromString } from 'libphonenumber-js/max'

/**
 * Formatadores de apresentação da fila do admin (#4b). Sem dependência nova:
 * BRL e tempo relativo saem do `Intl` nativo; o telefone reusa o
 * libphonenumber-js que já normaliza o E.164 na entrada.
 */

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

/**
 * Valor em BRL. `null`/vazio/NaN → "—" (o traço é o vazio honesto da fila).
 * Aceita number ou string porque numeric(10,2) pode chegar do PostgREST como
 * string.
 */
export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(n)) return '—'
  return BRL.format(n)
}

/**
 * Telefone E.164 (ex.: "+5511955550001") no formato nacional BR
 * "(11) 95555-0001". Se não parsear, devolve o que veio (nunca engole o dado).
 */
export function formatPhoneBR(e164: string | null | undefined): string {
  if (!e164) return '—'
  const parsed = parsePhoneNumberFromString(e164)
  if (!parsed) return e164
  return parsed.formatNational()
}

const RTF = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'always' })

/**
 * Idade do job em linguagem relativa: "há 2 dias", "há 3 meses". `numeric:
 * 'always'` de propósito — queremos "há 1 dia", não "ontem": a fila é sobre
 * quanto tempo alguém espera, e o número é o sinal de urgência.
 */
export function formatRelativeTime(input: string | Date): string {
  const then = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(then.getTime())) return '—'

  const sec = Math.round((then.getTime() - Date.now()) / 1000) // < 0 = passado

  if (Math.abs(sec) < 60) return RTF.format(sec, 'second')
  const min = Math.round(sec / 60)
  if (Math.abs(min) < 60) return RTF.format(min, 'minute')
  const hr = Math.round(sec / 3600)
  if (Math.abs(hr) < 24) return RTF.format(hr, 'hour')
  const day = Math.round(sec / 86400)
  if (Math.abs(day) < 30) return RTF.format(day, 'day')
  const month = Math.round(day / 30)
  if (Math.abs(month) < 12) return RTF.format(month, 'month')
  const year = Math.round(day / 365)
  return RTF.format(year, 'year')
}
