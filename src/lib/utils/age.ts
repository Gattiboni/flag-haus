/** Idade máxima plausível — acima disso a data é tratada como inválida. */
export const MAX_PLAUSIBLE_AGE = 120

/**
 * Idade em anos COMPLETOS na data de referência (hoje por padrão).
 * Função pura e testável: `today` é injetável.
 *
 * Retorna:
 *   - number  → anos completos (pode ser negativo se a data for futura)
 *   - null    → string fora do formato YYYY-MM-DD ou data de calendário inexistente
 *               (ex.: 2026-02-30)
 */
export function calculateAge(birthDate: string, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!m) return null

  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])

  // rejeita datas que não existem no calendário (o Date normaliza silenciosamente)
  const d = new Date(year, month - 1, day)
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null
  }

  let age = today.getFullYear() - year
  const monthDiff = today.getMonth() - (month - 1)
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) {
    age -= 1
  }
  return age
}

/**
 * Elegibilidade de idade: data real, não-futura, plausível (<= 120 anos)
 * e com 18 anos COMPLETOS. Único critério de "pode cadastrar".
 * Usada tanto no client (avançar o wizard) quanto no server (Zod).
 */
export function isEligibleAge(birthDate: string, today: Date = new Date()): boolean {
  const age = calculateAge(birthDate, today)
  return age !== null && age >= 18 && age <= MAX_PLAUSIBLE_AGE
}
