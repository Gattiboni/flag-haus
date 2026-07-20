# Regra de adoção do Design System — em vigor

**Vigência:** a partir da Spec #4c-visual (2026-07-15).

Qualquer JSX novo no repo importa componentes de `src/components/ui/`.
Qualquer CSS novo consome tokens de `src/styles/tokens/`.
Cor, tipografia, espaçamento, radii, borders — sempre via token.

## Nunca

- Hex de cor hardcoded (exceto assets externos e código de terceiros)
- `box-shadow`, `linear-gradient`, `filter: blur()`, contornos artificiais
- Font-family diferente de Inter / Lato / Bebas Neue
- Cor fora da paleta oficial
- Emoji na interface (ícones funcionais são Lucide, 18–20px, stroke 1.5)

## Divisão de trabalho: Tailwind × componentes

Tailwind cuida de **layout** — `flex`, `grid`, `gap`, `p`, `m`, breakpoints,
larguras de container. Os componentes de `src/components/ui/` cuidam de
**aparência** — cor, tipo, borda, radii, transições — em CSS puro lendo os
tokens.

Para que layout também fale a língua do padrão, `src/app/globals.css` apelida
os tokens dentro do Tailwind com o prefixo `fh-`:

| Utilitária | Token |
|---|---|
| `p-fh-4`, `gap-fh-5`, `mt-fh-6`… | `--fh-space-*` (escala 4/8 do DS) |
| `text-fh-secondary`, `bg-fh-sunken`, `border-fh-subtle`… | tokens semânticos |
| `rounded-fh-md`, `rounded-fh-lg` | `--fh-radius-*` |

A escala de espaçamento do DS **diverge** da default do Tailwind a partir do
passo 5 (DS: 24/32/48/64/96) — por isso os nomes têm prefixo, e `p-5` (20px do
Tailwind) nunca deve ser usado no lugar de `p-fh-5` (24px do DS).

Helpers de texto que o `base.css` não cobre: `.fh-eyebrow` (versalete),
`.fh-lead`, `.fh-micro`, `.fh-error`, `.fh-tnum` (números tabulares),
`.fh-wordmark` (letreiro FLAG HAUS em Bebas — e só ele).

## Densidade

O admin inteiro roda sob `data-density="compact"` (declarado uma vez em
`src/app/admin/(protected)/layout.tsx`). O formulário público fica na densidade
default, `comfortable`. Mesmo componente, ar diferente — não existe versão
"admin" de componente nenhum.

## Se um componente não existe

O Codinho pausa e reporta. Não improvisa. Novo componente = nova spec (mesmo
pequena).

Modificador novo em componente existente (uma variante, um `accent`) pode
entrar junto do trabalho, desde que documentado no CSS do próprio componente e
reportado na revisão.

## Componentes disponíveis hoje

`Alert`, `Badge`, `Button`, `Card` (+ `CardHeader`), `Checkbox`, `Dialog`,
`Input`, `RadioGroup`, `Select`, `Textarea` — todos exportados por
`src/components/ui/index.ts`.

Os demais componentes do design system de referência **não** foram criados:
ainda não têm caso de uso no CRM, e dívida especulativa não entra no repo.

## Referência viva

`D:\Backup C 256\Desktop\Gattiboni Enterprises\Julio Bandeiras\design_system_v1\`
(também espelhado em `_reference/design_system_v1/`, gitignored — consulta
manual para dúvidas de estilo/uso). Cada componente lá tem um `.prompt.md`
descrevendo o comportamento pretendido: leia antes de mexer no equivalente
daqui.
