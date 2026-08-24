/**
 * Paleta fixa das tags (contrato §10) e a matemática de contraste que a prova.
 *
 * Módulo SEM imports de propósito: o teste determinístico
 * (`scripts/tags-palette-check.mjs`) carrega este arquivo direto pra medir os
 * hexes REAIS que o app usa. Um teste que declarasse a própria cópia da paleta
 * provaria apenas que a cópia está certa — e a TRAP herdada da origem foi
 * exatamente essa: um dourado de marca que reprovou (3,46:1) e passou meses em
 * produção porque nada media a constante de verdade.
 */

export type PaletteColor = {
  hex: string
  /** Nome de trabalho — não aparece na UI, serve pra conversa e pro log. */
  name: string
}

/**
 * Oito cores, todas com contraste ≥4,5:1 como TEXTO sobre branco (é assim que
 * a badge vazada as usa). A ORDEM importa: ela é o critério de desempate da
 * cor automática, então reordenar muda que cor uma tag nova recebe.
 */
export const TAG_PALETTE: readonly PaletteColor[] = [
  { hex: '#8B0000', name: 'Oxblood' },
  { hex: '#1F5F73', name: 'Petróleo' },
  { hex: '#5B2D86', name: 'Violeta' },
  { hex: '#1E6B45', name: 'Verde' },
  { hex: '#A61E4D', name: 'Framboesa' },
  { hex: '#8A6D00', name: 'Dourado escuro' },
  { hex: '#B4530A', name: 'Terracota' },
  { hex: '#2D4B9A', name: 'Cobalto' },
]

/** WCAG AA para texto normal. */
export const MIN_CONTRAST = 4.5

export function isPaletteColor(hex: string): boolean {
  return TAG_PALETTE.some((c) => c.hex.toLowerCase() === hex.toLowerCase())
}

/* ------------------------------------------------------------------
   Contraste (WCAG 2.1, relative luminance)
   ------------------------------------------------------------------ */

function channel(value: number): number {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export function relativeLuminance(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = channel((n >> 16) & 255)
  const g = channel((n >> 8) & 255)
  const b = channel(n & 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste da cor como texto sobre branco (#FFFFFF). */
export function contrastOnWhite(hex: string): number {
  return 1.05 / (relativeLuminance(hex) + 0.05)
}

/* ------------------------------------------------------------------
   Cor automática
   ------------------------------------------------------------------ */

/**
 * Cor de uma tag nova: a MENOS usada da paleta, empate pela ordem da constante.
 * Determinístico de propósito — cor aleatória faria duas tags criadas no mesmo
 * minuto saírem iguais com frequência incômoda, e escolher cor no ato da
 * criação inline seria um passo a mais no meio de outra tarefa.
 */
export function pickAutoColor(usedColors: readonly string[]): string {
  const counts = new Map<string, number>()
  for (const { hex } of TAG_PALETTE) counts.set(hex.toLowerCase(), 0)

  for (const used of usedColors) {
    const key = used.toLowerCase()
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  let best = TAG_PALETTE[0]
  let bestCount = Number.POSITIVE_INFINITY
  for (const color of TAG_PALETTE) {
    const count = counts.get(color.hex.toLowerCase()) ?? 0
    // `<` estrito: o primeiro da ordem vence o empate.
    if (count < bestCount) {
      best = color
      bestCount = count
    }
  }

  return best.hex
}
