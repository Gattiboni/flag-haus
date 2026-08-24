/**
 * Teste determinístico da paleta de tags (contrato §10 / item 21).
 *
 * Mede a constante REAL — importa `src/lib/tags/palette.ts` em vez de declarar
 * uma cópia dos hexes. Uma cópia provaria que a cópia está certa, que é
 * exatamente o teste que a origem tinha quando deixou passar um dourado de
 * 3,46:1 pra produção.
 *
 * Roda com `npm run tags:check`. Sai com código ≠ 0 se qualquer cor reprovar,
 * e o que se faz nesse caso é ESCURECER O HEX — nunca afrouxar a régua.
 *
 * O repo não tem framework de teste, e trazer um seria dependência nova (fora
 * do que a instrução autoriza). Node basta: `--experimental-strip-types` lê o
 * .ts direto, sem etapa de build.
 */

import {
  MIN_CONTRAST,
  TAG_PALETTE,
  contrastOnWhite,
  pickAutoColor,
} from '../src/lib/tags/palette.ts'

let failures = 0

function fail(message) {
  failures++
  console.error(`  ✗ ${message}`)
}

console.log('Paleta de tags — contraste como texto sobre branco (WCAG AA)\n')

/* 1. Cada cor da paleta passa a régua. */
for (const { hex, name } of TAG_PALETTE) {
  const ratio = contrastOnWhite(hex)
  const ok = ratio >= MIN_CONTRAST
  const line = `${hex}  ${name.padEnd(16)} ${ratio.toFixed(2)}:1`
  if (ok) console.log(`  ✓ ${line}`)
  else fail(`${line} — abaixo de ${MIN_CONTRAST}:1. Escurece o hex.`)
}

/* 2. A paleta é um conjunto: hex repetido faria a cor automática empatar
      consigo mesma e duas tags nasceriam iguais. */
const seen = new Set()
for (const { hex } of TAG_PALETTE) {
  const key = hex.toLowerCase()
  if (seen.has(key)) fail(`${hex} aparece duas vezes na paleta.`)
  seen.add(key)
}

/* 3. Formato: o hex vai pro banco e sai como `style` inline. */
for (const { hex } of TAG_PALETTE) {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) fail(`${hex} não é um hex de 6 dígitos.`)
}

/* 4. Cor automática: menos usada primeiro, empate pela ordem da constante. */
const first = TAG_PALETTE[0].hex
const second = TAG_PALETTE[1].hex

if (pickAutoColor([]) !== first) {
  fail(`sem tags, a cor automática deveria ser ${first}.`)
}
if (pickAutoColor([first]) !== second) {
  fail(`com ${first} em uso, a próxima deveria ser ${second}.`)
}
// Paleta inteira usada uma vez: volta pro começo, não fica sem resposta.
if (pickAutoColor(TAG_PALETTE.map((c) => c.hex)) !== first) {
  fail('com a paleta toda em uso, deveria reciclar a partir do começo.')
}

console.log('')
if (failures > 0) {
  console.error(`${failures} problema(s) na paleta.`)
  process.exit(1)
}
console.log(`${TAG_PALETTE.length} cores, todas ≥ ${MIN_CONTRAST}:1. Paleta aprovada.`)
