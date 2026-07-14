/**
 * Formatadores de data absoluta do admin (#4c). `lib/format.ts` está congelado
 * pela spec (NÃO TOCAR) e cobre BRL / telefone / tempo relativo; aqui ficam as
 * datas absolutas que o detalhe do job e da pessoa precisam.
 *
 * Fuso fixo em America/Sao_Paulo: ferramenta interna de um estúdio no Brasil, o
 * horário exibido tem que bater com o relógio do Julio, não com o do servidor.
 */

const DATE = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'America/Sao_Paulo',
})

const TIME = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo',
})

/** timestamptz → "14/07/2026 às 22:04". null/inválido → "—". */
export function formatDateTimeBR(input: string | Date | null | undefined): string {
  if (!input) return '—'
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return '—'
  return `${DATE.format(d)} às ${TIME.format(d)}`
}

/**
 * `date` (YYYY-MM-DD) → "10/05/2000". Trata a string de data pura sem passar
 * pelo fuso (senão a meia-noite UTC volta um dia em SP). null/inválido → "—".
 */
export function formatDateBR(input: string | null | undefined): string {
  if (!input) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(input)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return '—'
  return DATE.format(d)
}
