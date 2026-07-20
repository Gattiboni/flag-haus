---
name: flag-haus-design
description: Use this skill to generate well-branded interfaces and assets for Flag Haus (tattoo studio by Julio Bandeiras), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Fast orientation

- **Global CSS:** link `styles.css` — it imports fonts, all tokens, and base element styles.
- **Namespace:** components are exposed on `window.FlagHausDesignSystem_cded98` after loading `_ds_bundle.js`.
- **Non-negotiables:** no shadows, glows, blurs, gradients, artificial strokes, colours outside the palette, or saturated backgrounds. Affordance = weight + fill + thin border + marked hover.
- **Oxblood is rare (10/90).** It carries the primary action AND critical/danger alerts — separated by treatment, never by inventing new colours. No green in the palette.
- **Type:** Inter (headings, `-0.01em`), Lato (body), Bebas Neue (only the "FLAG HAUS" letreiro). Max 6 sizes; weights Regular/Medium, Semibold rarely.
- **Two densities:** comfortable (public form, mobile) and `[data-density="compact"]` (admin).
- **Voice:** pt-BR, calm, close, sensorial; sentence case; no emoji. *"Aproximar, não elevar."*

## Key files
- `readme.md` — full brand guide, content + visual foundations, iconography, manifest.
- `tokens/` — colours, typography, spacing, surfaces, semantic aliases.
- `components/` — Button, Input, Select, Textarea, Checkbox, RadioGroup, Card, Badge, Alert, Dialog (`.prompt.md` beside each).
- `ui_kits/public_form/` and `ui_kits/admin_panel/` — full interactive screen recreations.
- `assets/` — FH monogram marks + brand icon reference (low-res; request vectors for production).
- Font substitution (Neue Einstellung → Inter) is flagged in `readme.md` — surface it for production. Logo PNGs are the client's official monogram variations; a vector master is still worth requesting for large-format print.
