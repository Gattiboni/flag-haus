# Spec #3c — Formulário `/antes-da-sessao`

**Projeto:** Flag Haus CRM
**Executor:** Codinho · **Arquiteto:** Claudinho · **Validador:** Alan
**Data:** 2026-07-13 · **Decisão:** #025
**Status:** FINAL — esta é a única versão. Substitui integralmente qualquer rascunho anterior da #3c.

---

## 0. Contrato de trabalho

- Codinho **só escreve código de aplicação**. Não commita. **Não escreve SQL. Não roda SQL.**
- Em divergência com esta spec: **para e reporta via Alan.** Não decide sozinho.
- Princípios: **incrementalidade, modularidade, zero dívida técnica.**
- **Nenhuma dependência nova.** Tudo o que a #3c precisa já existe no projeto.
- Nunca escrever "β X/X verde" antes de o β passar de verdade.

---

## 1. O banco já está pronto

Leia esta seção antes de qualquer outra coisa.

**Tudo o que é banco já foi feito, rodado e testado:**

| item | estado |
|---|---|
| RPC `submit_anamnese` | **existe em produção, 9/9 verde**, idempotência validada |
| `consent_type` com valor `'health'` | criado |
| `consents.policy_version` (NOT NULL) | criado |
| `events.actor_id` | criado |
| índice `jobs_submission_id_unique` | criado |
| seeds de teste (`+55119000000xx`) | populados, incluindo os caminhos de confirmação |
| `docs/legal/consentimento_anamnese_v1.md` | escrito e **congelado** |
| `docs/copy_anamnese_v3_consolidado.md` | escrito |

**Seu escopo é:** rota, formulário, Server Action, validação Zod, constante de policy.
**Nada mais.**

Se você achar que precisa alterar o banco, **você entendeu errado — pare e reporte.**

---

## 2. O que é

O segundo formulário público. Roda em `cadastro.flaghaus.art/antes-da-sessao` (hoje é placeholder).

**Quando é usado:** depois do pix de sinal, antes de qualquer sessão — **inclusive para cliente recorrente**, porque saúde muda entre uma sessão e outra.

**O que cobre:** gate de idade + anamnese + consentimentos + cadastro. Cria um `job`.

Diferença para o `/cadastro`: aquele é só cadastro. Este acrescenta saúde, consentimentos de sessão, e o job.

### Fontes da verdade, em ordem

1. `docs/decision_log.md` (#023, #024, #025)
2. **esta spec** (mecânica, mapeamento, contrato)
3. `docs/copy_anamnese_v3_consolidado.md` (texto das perguntas)
4. `docs/legal/consentimento_anamnese_v1.md` (texto dos consentimentos — **literal, congelado**)

> Existe um `copy_anamnese_v2` no repo. Ele está **VENCIDO** e contradiz esta spec em 8 pontos.
> **Não abra o v2.** Se você abrir, você implementa o formulário errado.

---

## 3. Visual — reusa o `/cadastro`, sem refinar

**Nenhum refinamento visual nesta spec.** A #3c usa a mesma linguagem visual do `/cadastro`, que está em produção e validado em celular.

Refinar só a anamnese faria os dois formulários divergirem. O refinamento (bandeiras SVG no `PhoneField`, motion, hovers oxblood) vira spec própria, aplicada **aos dois de uma vez**, depois que ambos existirem.

**Herança direta, sem reescrita:**
`PhoneField` · `GeoFields` (autocomplete Photon) · `StepShell` · `OptionPills` · `ConfirmField` · `age.ts` · `geo.ts` · pipeline E.164 · padrão de Server Action · tela de bloqueio de idade · Enter avança step (com lock contra submit duplo).

Se um desses componentes precisar mudar para servir a #3c, **mude de forma que continue servindo o `/cadastro`**. Fork de componente é dívida — se parecer inevitável, **pare e reporte**.

---

## 4. Ordem dos steps (31 + tela de bloqueio)

```
 0  Abertura
 1  Telefone (chave)                    → findPersonByPhone
 2  Reconhecimento (condicional: new / returning)
 3  Data de nascimento  ◄── GATE        → <18: tela de bloqueio, ZERO escrita
──────── SAÚDE (sempre completo, mesmo para recorrente)
 4  Região do corpo
 5  Alergias            (+ detalhe, progressive disclosure)
 6  Medicação           (+ detalhe)
 7  Diabetes
 8  Pele no local       (+ detalhe)     ◄── contextualizado pelo step 4
 9  Gravidez            (5 opções)
10  Saúde geral         (texto livre, opcional)
11  Últimas 24h         (3 opções)
12  RESPIRO 1
──────── CONSENTIMENTO
13  Documento           (pula → confirma)
14  Consentimento do procedimento       (sempre)
15  Consentimento de DADOS DE SAÚDE     (sempre, destacado)
16  LGPD (geral)                        (pula se consentiu há < 12 meses)
17  Autorização de imagem               (pula → confirma)
18  RESPIRO 2
──────── CADASTRO (cada campo pula se já existe)
19  Nome completo
20  E-mail
21  Bairro e cidade     (geo + autocomplete)
22  Como conheceu
23  Primeira tatuagem
24  Instagram           (opcional)
25  Profissão           (opcional)
26  Canal preferido
27  Opt-in comunicação  (pula → confirma)
28  Estilos / temas     (opcional)
29  Motivação           (opcional, por sessão)
30  Fechamento
```

### Regras da ordem

**"Pula o que já tem" é por campo, não por modo.** Igual à #3b: cada campo decide sozinho se aparece como pergunta, como confirmação leve, ou se some. Não existe "modo returning" que pule blocos inteiros.

**O gate de idade é o step 3, e é a data de nascimento.** Não existe pergunta binária "18+? Sim/Não". Decisão #023: perguntar duas vezes é burro, e um gate antes do telefone forçaria todo recorrente a redigitar uma data que já está no banco.

**O bloco de saúde (4–11) NUNCA é pulado**, nem para recorrente. Saúde muda entre sessões.

**Os consentimentos 14 e 15 NUNCA são pulados.** São por sessão.

**Steps 12 e 18 (respiros)** são telas de transição sem input.

---

## 5. Leitura de estado — a regra que quebra código descuidado

`consents` e `motivations` são tabelas **append-only**. Uma pessoa pode ter N linhas do mesmo `consent_type`.

**O estado atual é sempre a linha mais recente:**

```sql
order by created_at desc limit 1
```

Nunca `limit 1` sem ordenação. Nunca `select ... into` esperando linha única. Nunca `select ... where consent_type = 'marketing'` e pegar a primeira que vier.

**Isto não é teoria.** O seed `+5511900000001` tem **7 linhas de `marketing`**, e a mais recente é `granted = false` enquanto as 6 anteriores são `true`. Se o seu código não ordenar, o step 27 vai mostrar "receber novidades" quando a resposta real é "não receber", e o β vai pegar você.

---

## 6. Idempotência — `submission_id`

Um `uuid` gerado **uma vez, no mount do formulário** (`crypto.randomUUID()`), mantido no state, enviado no payload.

Grava em `jobs.extra_data.submission_id`. O índice único parcial já existe no banco.

**Comportamento:**
- Mesmo formulário reenviado (retry de rede, aba reaberta, duplo submit que escapou do lock) → mesmo `submission_id` → a RPC detecta e **retorna sucesso sem escrever de novo** (`duplicate: true`).
- Link aberto de novo, do zero → `submission_id` novo → job novo. Correto.

O lock síncrono do client (#3b-fix) continua — ele cobre duplo-clique. O `submission_id` cobre o resto.

---

## 7. Mapa campo → tabela → coluna

Você não escreve estas tabelas. A RPC escreve. Este mapa existe para você saber **o que precisa coletar** e **com que nome enviar no payload**.

### `people` — upsert por telefone
`phone` (E.164) · `name` · `email` · `birth_date` · `lat` · `lng` · `identified_at`

### `people.extra_data` — jsonb, **merge**, nunca substitui
`document_type` · `document_number` · `acquisition_source` · `is_first_tattoo` · `instagram` · `occupation` · `preferred_channel` · `interests` · `circulation_areas` · `neighborhood` · `city`

### `jobs` — 1 insert por submit

| coluna | valor |
|---|---|
| `person_id` | a pessoa |
| `status` | **default** (`quoted`) — o payload não passa |
| `body_region` | step 4 |
| `extra_data` | `{"submission_id": "<uuid>", "created_by": "form_anamnese"}` |
| **todo o resto** | **null** |

> **Por que o job nasce vazio.** `quoted_at = now()` seria mentira: o orçamento aconteceu no WhatsApp, dias antes. `confirmed` seria mentira: o formulário não sabe se o pix caiu — sabe que um link foi aberto. `created_at` (automático) registra a verdade sem inventar nada. Preço, datas e o resto são preenchidos pelo Julio no admin (Bloco 4).

### `clinical_records` — 1 insert por submit

| coluna | origem |
|---|---|
| `has_allergies` + `allergies_detail` | step 5 |
| `takes_medication` + `medications_detail` | step 6 |
| `has_diabetes` | step 7 |
| `has_skin_condition` + `skin_condition_detail` | step 8 |
| `pregnancy_status` | step 9 |
| `health_notes` | step 10 |
| `recent_substances` | step 11 |

**Valores com CHECK no banco. Exatamente estes. Qualquer outra string derruba a transação inteira:**

```
pregnancy_status:   pregnant | breastfeeding | no | prefer_not_say | not_applicable
recent_substances:  will_not | will | discuss_in_session
```

> Nota sobre gravidez: são **5** opções, não 4. "Estou grávida" e "Estou amamentando" são coisas diferentes e o banco as separa.

### `consents` — append-only, **todos com `policy_version`**

| tipo | `job_id` | `valid_months` | quando |
|---|---|---|---|
| `procedure` | **o job** | — | **sempre** (por sessão) |
| `health` | **o job** | — | **sempre** (por sessão) |
| `lgpd` | null | `12` | se nunca consentiu, ou se expirou |
| `image` | null | — | se nunca respondeu |
| `marketing` | null | — | se nunca respondeu |

A RPC resolve o `job_id` sozinha a partir do `type`. Você só manda `type`, `granted`, `policy_version` e (para o `lgpd`) `valid_months: 12`.

### `motivations` — append-only
`content` · **`job_id` = o job** (a RPC amarra)

> Na anamnese, motivação é "o que te trouxe pra **esta** tatuagem" — pertence ao job. No `/cadastro` ela é genérica e vai com `job_id` null. **Não mexer no `/cadastro`.**

### `events`
A RPC grava `form.anamnese_submitted` sozinha. Você só manda `mode: "new" | "returning"` no payload.

---

## 8. Contrato do payload

Este é o formato exato que a RPC `submit_anamnese` espera. Ela **já existe e já foi testada com este formato**. Se você enviar diferente, quebra.

```jsonc
{
  "submission_id": "uuid-v4",            // obrigatório
  "phone": "+5511999999999",             // obrigatório, E.164
  "birth_date": "1990-01-01",            // obrigatório (a RPC rejeita null e <18)
  "mode": "new",                         // "new" | "returning"
  "source": "form_anamnese",

  "name": "…",
  "email": "…",
  "lat": -23.54,
  "lng": -46.64,

  "body_region": "antebraço esquerdo",

  "extra_data": {                        // merge no people.extra_data
    "document_type": "cpf",              // cpf | rg | cnh
    "document_number": "…",
    "acquisition_source": "…",
    "is_first_tattoo": false,
    "instagram": "…",
    "occupation": "…",
    "preferred_channel": "whatsapp",
    "interests": "…",
    "circulation_areas": "…",
    "neighborhood": "…",
    "city": "…"
  },

  "clinical": {
    "has_allergies": false,
    "allergies_detail": null,
    "takes_medication": false,
    "medications_detail": null,
    "has_diabetes": false,
    "has_skin_condition": false,
    "skin_condition_detail": null,
    "pregnancy_status": "not_applicable",
    "health_notes": null,
    "recent_substances": "will_not"
  },

  "consents": [
    { "type": "procedure", "granted": true,  "policy_version": "anamnese-v1-2026-07" },
    { "type": "health",    "granted": true,  "policy_version": "anamnese-v1-2026-07" },
    { "type": "lgpd",      "granted": true,  "policy_version": "anamnese-v1-2026-07", "valid_months": 12 },
    { "type": "image",     "granted": true,  "policy_version": "anamnese-v1-2026-07" },
    { "type": "marketing", "granted": false, "policy_version": "anamnese-v1-2026-07" }
  ],

  "motivation": "…"                      // opcional
}
```

**Retorno da RPC:**
```json
{ "status": "ok", "person_id": "uuid", "job_id": "uuid", "duplicate": false }
```

**Exceptions que a RPC pode levantar** (traduza para mensagem legível na Server Action):
`invalid_phone` · `invalid_submission_id` · `birth_date_required` · `minor_not_allowed` · `consent_policy_version_required`

---

## 9. Textos de consentimento — congelados

Os textos dos steps 14, 15, 16, 17 e 27 vêm de `docs/legal/consentimento_anamnese_v1.md`, **copiados literalmente**.

**Não reescreva. Não "melhore". Não ajuste pontuação.**

Aquele texto é a prova jurídica de o que a pessoa aceitou, e `consents.policy_version` aponta para ele. Mudar uma vírgula destrói a correspondência entre o que está no banco e o que a pessoa leu.

Se algum texto parecer errado, **pare e reporte** — não corrija.

---

## 10. A constante de policy

Crie `src/lib/legal/policy.ts`:

```ts
export const POLICY_VERSION_ANAMNESE = 'anamnese-v1-2026-07';
```

Uma constante, importada onde for preciso. **Nenhum literal de versão espalhado pelo código.** Todo consent enviado no payload carrega essa constante.

---

## 11. Server Action + Zod

`src/app/actions/anamnese.ts` — mesmo padrão de `people.ts` (#3a):

- `'use server'`
- cliente admin (`service_role`), **nunca** `anon`
- valida o payload inteiro com **Zod** antes de chamar a RPC
- `refine` de idade ≥ 18 sobre `birth_date` (reusar `age.ts`)
- `pregnancy_status` e `recent_substances` como `z.enum([...])` com **exatamente** os valores do CHECK (§7)
- `policy_version` obrigatório em cada consent
- traduz as exceptions da RPC (§8) em mensagens legíveis
- **nunca loga o payload** — contém dado de saúde

---

## 12. Arquivos

```
src/app/(anamnese)/page.tsx            NOVO   (rota /antes-da-sessao)
src/app/(anamnese)/AnamneseForm.tsx    NOVO   (wizard 31 steps)
src/app/actions/anamnese.ts            NOVO   (Server Action + Zod)
src/lib/legal/policy.ts                NOVO   (constante POLICY_VERSION_ANAMNESE)

src/app/(cadastro)/CadastroForm.tsx    NÃO TOCAR
src/app/actions/people.ts              só se um componente compartilhado exigir
supabase/                              NÃO TOCAR — o banco já está pronto
docs/legal/                            NÃO TOCAR — congelado
```

**Não existe entregável de SQL nesta spec.** Se a sua lista de arquivos tiver um `.sql`, você entendeu errado.

---

## 13. O `/cadastro` está fora de escopo

A `submit_cadastro` foi alterada no banco (ganhou `policy_version` com fallback via `coalesce`). O formulário continua funcionando.

**Não toque nele.** Nem no componente, nem na Server Action, nem na RPC.

---

## 14. Validação β (Alan roda; Codinho não commita antes)

| # | Teste | Verde quando |
|---|---|---|
| 1 | Submit completo, pessoa nova | Linhas em `people`, `jobs`, `clinical_records`, `consents`, `motivations`, `events` |
| 2 | `jobs` do teste 1 | `status = 'quoted'` · `body_region` preenchido · **todos os preços e timestamps null** · `extra_data.submission_id` presente |
| 3 | `consents` do teste 1 | `procedure` e `health` **com `job_id`** · `lgpd`, `image`, `marketing` **com `job_id` null** · **todos com `policy_version = 'anamnese-v1-2026-07'`** · `lgpd` com `valid_until ≈ hoje + 12 meses` |
| 4 | `motivations` do teste 1 | `job_id` = o job (≠ do `/cadastro`, que grava null) |
| 5 | Seed `+5511900000001` (perfil completo) | Steps de cadastro (19–26, 28) **pulados**. **Saúde e consentimentos perguntados assim mesmo.** |
| 6 | Seed `+5511900000005` (16 anos) | Tela de bloqueio. **0 linhas novas em qualquer tabela.** `updated_at = created_at` na pessoa |
| 7 | Duplo submit do mesmo formulário (F5 no submit) | **1 job, 1 clinical_record, 1 consent de cada tipo.** RPC retorna `duplicate: true` |
| 8 | Reabrir o link do zero e submeter de novo | **2 jobs**, `submission_id` diferentes |
| 9 | Progressive disclosure | "Sim" em alergia/medicação/pele abre o detalhe; "Não" não abre e **não grava detalhe** |
| 10 | Gravidez | As 5 opções gravam `pregnant` / `breastfeeding` / `no` / `prefer_not_say` / `not_applicable` |
| 11 | Últimas 24h | Grava `will_not` / `will` / `discuss_in_session` |
| 12 | Seed `+5511900000001` — LGPD válido até 2027 | Step 16 **pulado**. **Nenhum** consent `lgpd` novo gravado |
| 13 | **Caminhos de confirmação — seed `+5511900000001`** | Step 13 (documento): **confirma o CPF**, não pergunta de novo · Step 17 (imagem): **confirma "você disse SIM"** · Step 27 (marketing): mostra **"não receber"** |
| 14 | Geo | Bairro e cidade pelo GPS; autocomplete funcionando |
| 15 | Enter | Avança o step; não avança com dropdown de autocomplete aberto; sem submit duplo |
| 16 | `npm run build` + `npm run moas:check` | Passam. `moas:check` exit 0 |
| 17 | **Celular real, em produção** | Fluxo completo, teclado móvel, GPS |

> **O teste 13 é armadilha deliberada.** O seed tem 7 linhas de `marketing`: 6 antigas com `granted = true` e **uma recente com `granted = false`**. Se o seu código ler sem `order by created_at desc`, o step 27 vai mostrar "receber novidades" — e isso é **vermelho**, não detalhe.

---

## 15. Fora de escopo

- Qualquer SQL ou alteração de banco
- Refinamento visual (bandeiras SVG, motion, hovers) — spec própria, aplicada aos **dois** formulários
- Admin (Bloco 4)
- Remover/proteger `/__health`
- Política de privacidade e termos de uso (links nos forms) — Bloco 5
- Qualquer alteração no `/cadastro`

---

## 16. Fechamento

Quando terminar:

1. **Não commite.**
2. Rode o build e o `moas:check`.
3. Rode o β da §14 até onde der sem produção.
4. **Reporte o resultado real** — inclusive o que falhou. Nunca escreva "verde" antes de ser verde.
5. Espere o Alan.
