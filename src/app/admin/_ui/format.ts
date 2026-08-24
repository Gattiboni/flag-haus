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
 * timestamptz → "12/08/2026 · 14:00". Mesma informação de `formatDateTimeBR`,
 * sem o "às": a coluna "Próxima sessão" da lista de cadastros é estreita e o
 * conectivo não paga o espaço que ocupa. null/inválido → "—".
 */
export function formatDateTimeShortBR(
  input: string | Date | null | undefined
): string {
  if (!input) return '—'
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return '—'
  return `${DATE.format(d)} · ${TIME.format(d)}`
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

/* ------------------------------------------------------------------
   Calendário — resolução de dia e janela em America/Sao_Paulo
   ------------------------------------------------------------------

   O calendário (Fase 4) precisa de mais que formatação: precisa saber a que
   DIA de São Paulo um `timestamptz` pertence e como transformar um dia de São
   Paulo de volta num instante UTC (janela da RPC, datetime-local do form).

   Isso mora aqui, e não num módulo do calendário, porque a instrução da fase é
   explícita: conversão UTC↔America/Sao_Paulo só no ponto único existente. Este
   arquivo é esse ponto.

   O offset é FIXO em -03:00: o Brasil não tem horário de verão desde 2019
   (contrato §1.5). Se um dia voltar, este é o único lugar a mudar — e aí a
   construção passa a precisar de Intl nos dois sentidos, não só na leitura.
*/

export const TIMEZONE = 'America/Sao_Paulo'

/** Offset fixo de São Paulo, no formato que `Date` entende ao parsear. */
const SP_OFFSET = '-03:00'

const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: TIMEZONE,
})

/**
 * timestamptz → "YYYY-MM-DD" do dia EM SÃO PAULO. É a chave com que o grid
 * agrupa eventos: uma sessão às 23h de SP não pode aparecer no dia seguinte só
 * porque em UTC já virou.
 */
export function spDayKey(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ''
  return DAY_KEY.format(d)
}

/** "YYYY-MM-DD" (dia de SP) + "HH:MM" → instante UTC. */
export function spToInstant(dayKey: string, time = '00:00'): Date {
  return new Date(`${dayKey}T${time}:00${SP_OFFSET}`)
}

/** Hoje em São Paulo, como "YYYY-MM-DD". */
export function spToday(): string {
  return DAY_KEY.format(new Date())
}

/**
 * Aritmética de dias sobre a chave "YYYY-MM-DD", sem passar por fuso: soma no
 * calendário civil, que é o que o grid quer dizer com "+1 dia". Usar `Date` com
 * fuso aqui é a origem clássica do bug de borda de mês.
 */
export function addDayKey(dayKey: string, days: number): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

/** Só a hora "HH:MM" do instante, em São Paulo. Vazio se inválido. */
const HOUR_MIN = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TIMEZONE,
})

export function spTime(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(d.getTime())) return ''
  return HOUR_MIN.format(d)
}
