/**
 * Fundação de tags — as regras que TODO ponto de escrita compartilha.
 *
 * A razão de este módulo existir é uma TRAP herdada da origem: lá havia duas
 * funções de normalização de slug, uma no ponto de criação e outra no de
 * importação, e elas divergiam em acento. Uma tag criada por um caminho não era
 * a mesma tag criada pelo outro. Aqui existe UMA, exportada, e todo ponto de
 * criação a importa — inclusive a criação inline da ficha.
 *
 * Módulo plano (sem 'use server'), pra que client e server usem o mesmo código.
 */

export {
  MIN_CONTRAST,
  TAG_PALETTE,
  contrastOnWhite,
  isPaletteColor,
  pickAutoColor,
  relativeLuminance,
  type PaletteColor,
} from './palette'

/** Teto do slug e do nome. Rótulo é etiqueta, não frase. */
export const TAG_NAME_MAX = 40
export const TAG_SLUG_MAX = 60

/**
 * A ÚNICA normalização de slug do repo. Minúsculo, sem acento, hífen no lugar
 * de qualquer coisa que não seja letra ou número, sem hífen sobrando nas pontas.
 *
 *   "Orçamento Aberto"  → "orcamento-aberto"
 *   "  Fine   Line  "   → "fine-line"
 *   "VIP!!!"            → "vip"
 *
 * O slug é IDENTIDADE e é IMUTÁVEL depois de criado (contrato §2): renomear
 * escreve só em `tags.name`, e a badge se atualiza sozinha porque o contato
 * guarda o slug, não o nome.
 */
export function toSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, TAG_SLUG_MAX)
    // O corte pode ter deixado um hífen na ponta.
    .replace(/-+$/g, '')
}

export type TagNameCheck =
  | { ok: true; name: string; slug: string }
  | { ok: false; reason: string }

/**
 * Valida um nome de tag e devolve o par (nome exibido, slug). Um nome que
 * normaliza pra slug vazio ("!!!", "   ") é recusado aqui e não no banco: o
 * erro do CHECK não teria como explicar por que "!!!" não vira tag.
 */
export function checkTagName(raw: string): TagNameCheck {
  const name = raw.trim().replace(/\s+/g, ' ')

  if (name === '') return { ok: false, reason: 'Dá um nome pra tag.' }
  if (name.length > TAG_NAME_MAX) {
    return { ok: false, reason: `O nome passou de ${TAG_NAME_MAX} caracteres.` }
  }

  const slug = toSlug(name)
  if (slug === '') {
    return { ok: false, reason: 'Esse nome só tem símbolos — usa ao menos uma letra.' }
  }

  return { ok: true, name, slug }
}
