/**
 * Normaliza telefone brasileiro para formato canônico.
 * Remove espaços, traços, parênteses, pontos.
 * Aceita com ou sem +55. Retorna sempre só dígitos.
 *
 * Exemplos:
 *   "11 99999 8888"     → "11999998888"
 *   "(11) 99999-8888"   → "11999998888"
 *   "+55 11 99999 8888" → "11999998888"
 *   "5511999998888"     → "11999998888"
 *   "11999998888"       → "11999998888"
 */
export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  // Remove código do país brasileiro se presente
  if (digits.startsWith('55') && digits.length > 11) {
    return digits.slice(2)
  }
  return digits
}

/**
 * Valida se telefone normalizado tem formato BR válido.
 * Móvel: 11 dígitos (DDD + 9 + 8 dígitos)
 * Fixo: 10 dígitos (DDD + 8 dígitos)
 */
export function isValidBrazilianPhone(normalized: string): boolean {
  return /^\d{10,11}$/.test(normalized)
}
