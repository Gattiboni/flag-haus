# Design System Flag Haus — no CRM

Adaptado do design system oficial (`design_system_v1`, gerado a partir do
Branding Book Flag Haus 11/2025) para o contexto deste repositório. O material
original continua sendo a fonte de verdade para dúvidas de estilo; este
documento descreve **como ele vive aqui**.

A marca é minimalista, contemplativa e pesada — *"seriedade poética com leveza
humana"*. Cinco palavras sustentam tudo: **gesto, pausa, presença, corpo,
tempo**.

O sistema serve dois contextos com o mesmo vocabulário em densidades
diferentes:

1. **Formulários públicos** (`/`, `/antes-da-sessao`) — preenchidos pelo
   cliente no celular, carregando dado de saúde sob LGPD. Mobile-first, ar
   generoso.
2. **Admin** (`/admin/*`) — usado pelo Julio *durante* a sessão, com o cliente
   esperando. Mesma língua, densidade compact.

---

## A tensão central (por que este sistema existe)

O admin sofria de *"texto que parece parágrafo mas é botão"*. A marca **proíbe
sombra, gradiente, brilho e contorno artificial**, então a affordance não pode
se apoiar neles. A saída:

- **Peso de tipo** (Medium vs Regular) para marcar rótulo interativo,
- **Preenchimento de fundo** (card branco sobre a página whisper; oxblood
  sólido na ação primária),
- **Bordas finas respiradas** (1px) como única aresta estrutural,
- **Hover marcado** (oxblood escurece; secundário troca o fundo e leva a borda
  pra onyx),
- **Oxblood estratégico** como a única cor de ação primária.

Duas decisões que valem conhecer:

- **Danger = Oxblood.** Oxblood é a cor de *presença / emoção / densidade*,
  reservada pela regra 10/90 para o momento de maior carga. Um alerta crítico
  de saúde **é** esse momento — então danger e CTA primário dividem o matiz,
  desambiguados pelo **tratamento** (bloco sólido de botão vs. alerta que
  inunda a superfície), nunca por inventar um vermelho fora da paleta.
- **Sem verde.** A paleta não tem verde. "Sucesso" se expressa com onyx + um
  check e enquadramento calmo. "Warning" empresta o **Terracota** (corpo,
  narrativa) como preenchimento e aresta — nunca como texto corrido.

---

## Fundações

### Cor (§6.5)

Seis cores canônicas, usadas **exatamente**: Onyx `#2D2C2A`, Oxblood `#8B0000`,
Terracota `#A8643D`, Granite `#6B6B6B`, Whisper `#F4F4F4`, White `#FFFFFF`. Um
conjunto secundário de baixa saturação estende superfícies e detalhe — *nunca*
como texto. Cada cor é gesto, não decoração. **Oxblood obedece a regra 10/90**
— no máximo 10% de qualquer composição.

No repo, hex só existe em `src/styles/tokens/`. Em qualquer outro lugar é bug.

### Tipografia (§6.6)

Três famílias, carregadas por `next/font/google` em `src/app/layout.tsx`:

- **Inter** — títulos (substitui a Neue Einstellung, comercial), com
  `letter-spacing: -0.01em`
- **Lato** — corpo e legendas
- **Bebas Neue** — exclusivamente o letreiro "FLAG HAUS" (`.fh-wordmark`)

Máximo de seis tamanhos: H1 32 / H2 24 / H3 20 / H4 17 / corpo 16 / micro 13.
Pesos calmos — Regular e Medium; Semibold só em destaque raro; nada de bold
pesado.

`next/font` expõe cada família como `--fh-font-*-loaded`, e
`src/styles/tokens/typography.css` as consome em `--fh-font-heading`,
`--fh-font-body` e `--fh-font-wordmark`.

### Espaçamento e layout (§6.3)

Base 4px, passando por múltiplos de 8 nos vãos maiores. O branco **é**
estrutura. Mobile-first. Densidade adaptativa via `[data-density="compact"]`.
Alvo de toque ≥ 44px no mobile (36px no admin, que é mouse).

### Superfícies, bordas, radii

**Nunca sombra.** Elevação é contraste: um card branco lê como elevado sobre a
página whisper, fechado por uma borda de 1px (`#DDDCDA`). Radii contidos —
2px/4px em controles, 8px em cards e modais.

### Movimento e estados

Ritmo lento: fades calmos, ease-out `cubic-bezier(0.22,0.61,0.36,1)`,
120–260ms, sem bounce. Hover é *marcado*, não sutil. **Foco é um contorno
nítido** (`outline: 2px solid onyx`, offset 2px) — linha honesta, nunca brilho.
Scrim de modal é lavagem chapada de onyx a 55%, sem blur.

### Proibido (§6.9.3 / §7.5) — inegociável

Sombra · brilho · blur · gradiente · contorno artificial · cor fora da paleta ·
fundo saturado · alterar ou reestilizar o monograma.

---

## Iconografia (§6.7.1)

A iconografia própria da marca é um conjunto de micro-desenhos à mão, na
linguagem do monograma — **detalhes narrativos, nunca ícones funcionais de
interface**.

Para ícone funcional (campo, toolbar, chevron) o livro não define conjunto.
**Substituição sinalizada:** [Lucide](https://lucide.dev) — traço fino e uniforme
de 1.5px, o mais próximo do gesto fineline da marca. Use `size={18}` (20 quando
precisar de peso) e `strokeWidth={1.5}`, cor onyx ou granite. **Sem emoji na
UI.** Não recrie os ícones narrativos da marca com ícones de linha genéricos —
são vocabulários separados.

O chevron do `Select` é desenhado à mão em 1.25px, dentro do próprio
componente, herdando cor por `currentColor`.

---

## Organização no repo

```
src/styles/
  tokens/{colors,typography,spacing,surfaces,semantic}.css
  base.css        ← reset leve + defaults de elemento
  styles.css      ← entry point portátil (fora do Next); ver nota abaixo
src/components/ui/
  Alert/ Badge/ Button/ Card/ Checkbox/ Dialog/ Input/ RadioGroup/ Select/ Textarea/
  field.css       ← gramática compartilhada de campo
  index.ts        ← barrel
public/brand/     ← PNGs oficiais do monograma
```

`src/app/globals.css` importa as seis camadas **uma a uma** (e não via
`styles.css`) porque o Turbopack iça `@import` aninhado para o topo do CSS
gerado e resolve os caminhos relativos ao arquivo de entrada. `styles.css`
segue existindo como entry point do design system fora do Next.

O namespace `window.FlagHausDesignSystem_cded98` do bundle standalone **não** é
usado aqui: os componentes foram reescritos como React idiomático com tipos
TypeScript e CSS por componente.

---

## Substituição de fonte — pendência ⚠️

A **Neue Einstellung** é comercial e não tem licença web. Enquanto isso, Inter
faz o papel de títulos. Se a licença for comprada, a troca é um `next/font`
local + a variável `--fh-font-heading` em `tokens/typography.css`.

Também pendente: **SVG do monograma**. Hoje só há PNG 500×500 — suficiente para
tela, insuficiente para impressão em formato grande.

---

Regra de uso obrigatória: [`adoption.md`](./adoption.md).
Orientação rápida do design system: [`SKILL.md`](./SKILL.md).
