# Auditoria de estado real do repo — 2026-08-09

Investigação read-only. Nenhum arquivo fora de `docs/_auditoria/` foi tocado.
Toda afirmação abaixo sai de leitura de código/git no repo, com `arquivo:linha`.
Onde não há evidência, está escrito `NÃO ENCONTRADO`.

Repo: `site-flag-haus` · branch `main` · commit HEAD `cb3e159`.

---

## Bloco A — Git: o que aconteceu desde 20/07

**Commits desde 2026-07-20: ZERO.**

`git log --since=2026-07-20` retorna vazio. O commit mais recente do repo é
`cb3e159`, de **2026-07-20 02:07:30 -0300**, `docs(crm): registra Emenda D —
changelog + decision #028`, autor Alan Gattiboni. Não existe nenhum commit
posterior a ele. As três semanas de silêncio documental foram também silêncio de
código.

**Últimos 8 commits (todos anteriores ou iguais a 20/07):**

| hash | data | autor | mensagem |
|---|---|---|---|
| `cb3e159` | 2026-07-20 02:07:30 | Alan Gattiboni | docs(crm): registra Emenda D — changelog + decision #028 |
| `a952b52` | 2026-07-20 02:01:53 | Alan Gattiboni | fix(db): regen MOAS pós-restauração do header original da submit_cadastro |
| `48b0bd6` | 2026-07-20 01:50:23 | Alan Gattiboni | (Emenda D — CadastroForm submissionId + people.ts + índice único/RPC via MCP) |
| `7feeb92` | 2026-07-19 22:15:26 | Alan Gattiboni | feat(design-system): integração completa Flag Haus DS + refactor de todas as telas (#4c-visual) |
| `0912d73` | 2026-07-19 20:57:00 | Alan Gattiboni | chore(gitignore): _reference/ |
| `5d663c4` | 2026-07-19 20:35:50 | Alan Gattiboni | docs(db): regen MOAS após Emenda C (submit_cadastro/anamnese respeitam admin_locks) |
| `3a11ef2` | 2026-07-19 20:27:52 | Alan Gattiboni | Emenda visual do PersonEdit: leitura por padrão, lápis edita, cadeado só em campos travados |
| `670435c` | 2026-07-14 08:18:03 | Alan Gattiboni | timas conversas |

**Commit `a41763e`** (2026-07-13 23:22:39, autor `Claude`): `feat(#4a): admin —
autenticação + gate por allowlist`. É o único commit do repo que nomeia um item
do Bloco 4 no assunto.

**Estado da árvore:**

- Branch atual: `main`.
- `git rev-list --left-right --count origin/main...main` → `0 0`. **Nem à frente
  nem atrás** do remoto.
- `git status --porcelain` → **saída vazia**. Working tree limpa: zero arquivos
  modificados, zero untracked.

**Arquivos tocados por commits pós-20/07:** não se aplica — não há commits
pós-20/07.

---

## Bloco B — Rotas que existem de fato

Varredura de `src/app/`. **Não existe nenhum route handler** no projeto (nenhum
`route.ts`/`route.tsx` em toda a árvore). Todas as rotas são páginas (Server ou
Client Components).

| Rota | Arquivo | Tipo | O que faz, segundo o código |
|---|---|---|---|
| `/` | [src/app/(cadastro)/page.tsx](src/app/(cadastro)/page.tsx) | página | Monta o formulário público de cadastro (`CadastroForm`). O route group `(cadastro)` não entra na URL — a raiz do site **é** o cadastro. |
| `/antes-da-sessao` | [src/app/(anamnese)/antes-da-sessao/page.tsx](src/app/(anamnese)/antes-da-sessao/page.tsx) | página | Formulário público de anamnese (wizard). |
| `/__health` | [src/app/%5F%5Fhealth/page.tsx](src/app/%5F%5Fhealth/page.tsx) | página | Health check: conta linhas de `people` via `service_role` ([page.tsx:11-14](src/app/%5F%5Fhealth/page.tsx#L11-L14)) e expõe a Server Action `findPersonByPhone` num form client ([page.tsx:48](src/app/%5F%5Fhealth/page.tsx#L48)). |
| `/admin` | [src/app/admin/(protected)/page.tsx](src/app/admin/(protected)/page.tsx) | página | A **fila de trabalho** (#4b). Uma query em `jobs` com join em `people`, agrupada em 4 seções em memória. |
| `/admin/login` | [src/app/admin/login/page.tsx](src/app/admin/login/page.tsx) | página | Login por e-mail + senha. Fora do route group `(protected)`, por isso não herda o gate ([page.tsx:4-8](src/app/admin/login/page.tsx#L4-L8)). |
| `/admin/buscar` | [src/app/admin/(protected)/buscar/page.tsx](src/app/admin/(protected)/buscar/page.tsx) | página | Busca de pessoa por nome ou telefone via `?q=`, renderizada no server, limite 50 ([buscar/page.tsx:16](src/app/admin/(protected)/buscar/page.tsx#L16)). |
| `/admin/jobs/[id]` | [src/app/admin/(protected)/jobs/[id]/page.tsx](src/app/admin/(protected)/jobs/[id]/page.tsx) | página | Detalhe do job em 3 colunas: bloco editável, anamnese clínica com alertas, contexto (motivação/consents/eventos). |
| `/admin/people/[id]` | [src/app/admin/(protected)/people/[id]/page.tsx](src/app/admin/(protected)/people/[id]/page.tsx) | página | Ficha da pessoa: `PersonEdit` (lápis/cadeado), fatos do sistema, `extra_data` cru, jobs ativos/histórico, consents, últimos 20 eventos. |

Layouts (não são rotas): [src/app/layout.tsx](src/app/layout.tsx) (root) e
[src/app/admin/(protected)/layout.tsx](src/app/admin/(protected)/layout.tsx)
(shell do admin + gate).

### `/__health`: existe e está ABERTA

- A pasta `src/app/%5F%5Fhealth/` existe e a página está lá.
- O proxy tem `matcher: ['/admin/:path*']`
  ([src/proxy.ts:66-68](src/proxy.ts#L66-L68)) — `/__health` **não** passa pelo
  proxy.
- A página **não chama `requireOperator()`**
  ([src/app/%5F%5Fhealth/page.tsx:1-14](src/app/%5F%5Fhealth/page.tsx#L1-L14)) —
  é o único Server Component que lê dado sem gate.
- Ela lê a base com `service_role`
  ([page.tsx:11](src/app/%5F%5Fhealth/page.tsx#L11)) e expõe busca de pessoa por
  telefone a qualquer visitante. O próprio código diz "Rota técnica. Será
  removida antes do lançamento público."
  ([page.tsx:52](src/app/%5F%5Fhealth/page.tsx#L52)).

---

## Bloco C — Bloco 4 item por item

### 1. #4a — auth + allowlist do admin — **EXISTE, completo**

**Login é e-mail + senha. Confirmado no código, não é Google SSO:**
[src/app/admin/login/LoginForm.tsx:33-36](src/app/admin/login/LoginForm.tsx#L33-L36)
chama `supabase.auth.signInWithPassword({ email, password })`. Não existe
nenhuma chamada a `signInWithOAuth` em `src/`. Os campos do form são `type=email`
e `type=password`
([LoginForm.tsx:57-73](src/app/admin/login/LoginForm.tsx#L57-L73)). Não há
cadastro nem "esqueci a senha" — comentado como decisão em
[LoginForm.tsx:14](src/app/admin/login/LoginForm.tsx#L14).

**Allowlist:** [src/lib/auth/gate.ts:27-59](src/lib/auth/gate.ts#L27-L59),
função `requireOperator()`.

- Tabela/coluna: **`user_roles`**, consultada por `user_id`
  ([gate.ts:38-42](src/lib/auth/gate.ts#L38-L42)), com o client `service_role`
  (`createAdminClient()`, [gate.ts:37](src/lib/auth/gate.ts#L37)).
- **A coluna `role` NÃO é lida.** O gate checa *pertencimento* (existe linha?),
  não papel — documentado em [gate.ts:24-25](src/lib/auth/gate.ts#L24-L25) e
  visível no `.select('user_id')` de
  [gate.ts:39](src/lib/auth/gate.ts#L39). Não há nenhum nível de acesso
  diferenciado no código.
- Sem linha → `signOut()` + `redirect('/admin/login?blocked=1')`
  ([gate.ts:51-56](src/lib/auth/gate.ts#L51-L56)).
- Erro na checagem → fail-closed, redirect pro login sem encerrar sessão
  ([gate.ts:44-49](src/lib/auth/gate.ts#L44-L49)).

**Três camadas, conforme o código:**

1. Proxy (UX): [src/proxy.ts:18-64](src/proxy.ts#L18-L64), escopo fechado em
   `/admin/*`.
2. Gate (segurança real): `requireOperator()` chamado no layout
   ([layout.tsx:24](src/app/admin/(protected)/layout.tsx#L24)) **e** em cada
   página protegida — [admin/page.tsx:67](src/app/admin/(protected)/page.tsx#L67),
   [buscar/page.tsx:25](src/app/admin/(protected)/buscar/page.tsx#L25),
   [jobs/[id]/page.tsx:109](src/app/admin/(protected)/jobs/[id]/page.tsx#L109),
   [people/[id]/page.tsx:91](src/app/admin/(protected)/people/[id]/page.tsx#L91)
   — **e** na primeira linha de cada Server Action do admin
   ([admin-jobs.ts:70](src/app/actions/admin-jobs.ts#L70),
   [admin-people.ts:98](src/app/actions/admin-people.ts#L98),
   [admin-people.ts:237](src/app/actions/admin-people.ts#L237)).
3. RLS deny-all no banco (fora do escopo desta leitura de repo).

Logout: `signOutAdmin()` em
[src/app/actions/auth-admin.ts:10-14](src/app/actions/auth-admin.ts#L10-L14),
ligado ao botão "Sair" do shell
([layout.tsx:51-56](src/app/admin/(protected)/layout.tsx#L51-L56)).

Nenhum TODO, branch vazio ou handler no-op neste item.

### 2. #4b — fila de trabalho — **EXISTE, completo**

Tela: `/admin` (home do admin), [src/app/admin/(protected)/page.tsx](src/app/admin/(protected)/page.tsx).

**Query que alimenta**
([page.tsx:70-78](src/app/admin/(protected)/page.tsx#L70-L78)), literal:

```
admin.from('jobs')
  .select('id, status, quoted_price, final_price, created_at, description, body_region, people(name, phone)')
  .is('deleted_at', null)
  .in('status', ['quoted', 'confirmed', 'no_response'])
  .order('created_at', { ascending: true })
```

Agrupamento em memória em 4 seções
([page.tsx:101-111](src/app/admin/(protected)/page.tsx#L101-L111)):

- **Precisa de preço** — `status='quoted'` **e** `quoted_price` nulo
  ([page.tsx:104](src/app/admin/(protected)/page.tsx#L104));
- **Aguardando resposta** — `status='quoted'` com `quoted_price` preenchido;
- **Aguardando sessão** — `status='confirmed'`;
- **Sem resposta** — `status='no_response'`.

Renderização e edição inline: [src/app/admin/(protected)/QueueTable.tsx](src/app/admin/(protected)/QueueTable.tsx)
(212 linhas), client component que edita status/preço final direto na linha via
`updateJob` ([QueueTable.tsx:112](src/app/admin/(protected)/QueueTable.tsx#L112))
e linka pro detalhe
([QueueTable.tsx:136](src/app/admin/(protected)/QueueTable.tsx#L136)).

Nenhum TODO ou branch vazio.

### 3. #4c — PersonEdit — **EXISTE, completo no lado da aplicação**

**Componente:** [src/app/admin/(protected)/people/[id]/PersonEdit.tsx](src/app/admin/(protected)/people/[id]/PersonEdit.tsx),
364 linhas, `'use client'`. Montado em
[people/[id]/page.tsx:205-210](src/app/admin/(protected)/people/[id]/page.tsx#L205-L210).

**Campos editáveis** — 11, definidos em `FIELDS`
([PersonEdit.tsx:34-67](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L34-L67))
e espelhados em `LOCKABLE_FIELDS`
([src/app/admin/_ui/person-fields.ts:9-21](src/app/admin/_ui/person-fields.ts#L9-L21)):
`name`, `email`, `phone`, `birth_date`, `document_type`, `document_number`,
`neighborhood`, `city`, `instagram`, `occupation`, `preferred_channel`.

Colunas diretas de `people`: `name`, `email`, `phone`, `birth_date`
([person-fields.ts:26](src/app/admin/_ui/person-fields.ts#L26)). Os outros 7
moram em `people.extra_data`
([admin-people.ts:166-170](src/app/actions/admin-people.ts#L166-L170)).

**Modelo lápis/cadeado:**

- Página abre em leitura; cada linha tem um ✎ que abre edição inline só naquele
  campo ([PersonEdit.tsx:323-332](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L323-L332)).
- Um editor por vez ([PersonEdit.tsx:96-99](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L96-L99)).
- O 🔒 só aparece em campo realmente travado
  ([PersonEdit.tsx:19-21](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L19-L21)).
- Destravar passa por `<Dialog>` de confirmação
  ([PersonEdit.tsx:351-361](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L351-L361)),
  que chama `unlockField()`.

**`admin_locks`:** vive em `people.extra_data.admin_locks`, um objeto
`{ campo: { locked_at, locked_by } }`
([admin-people.ts:82-85](src/app/actions/admin-people.ts#L82-L85),
[admin-people.ts:184-189](src/app/actions/admin-people.ts#L184-L189)). Todo
campo cujo valor muda ganha lock automaticamente
([admin-people.ts:173](src/app/actions/admin-people.ts#L173)). `unlockField()`
remove só a chave, sem mexer no valor
([admin-people.ts:273-274](src/app/actions/admin-people.ts#L273-L274)). Cada
operação grava evento em `events` (`admin.person_updated` /
`admin.person_field_unlocked`) com `actor_id`
([admin-people.ts:202-208](src/app/actions/admin-people.ts#L202-L208),
[admin-people.ts:287-293](src/app/actions/admin-people.ts#L287-L293)).

**Divergência importante entre comentário e banco.** Os comentários do código
dizem que as RPCs ainda não respeitam os locks — "depende de uma migration do
Alan (Emenda C): **até ela rodar, a trava só vive no lado do admin**"
([admin-people.ts:20-22](src/app/actions/admin-people.ts#L20-L22)) e "depois da
migration do Alan" ([PersonEdit.tsx:15-16](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L15-L16)).
**Mas o snapshot do schema no repo mostra que a migration JÁ rodou:** tanto
`submit_anamnese` quanto `submit_cadastro` leem `extra_data->'admin_locks'` e
subtraem as chaves travadas do `extra_data` que chega do formulário —
[docs/db/schema.sql:81-92](docs/db/schema.sql#L81-L92) (`submit_anamnese`,
declarada na linha 43) e [docs/db/schema.sql:280-292](docs/db/schema.sql#L280-L292)
(`submit_cadastro`, declarada na linha 227). O snapshot é de `a952b52`
(2026-07-20). **Os comentários no código estão desatualizados** — dívida de
documentação inline, registrada aqui, não corrigida.

*Ressalva:* a trava, como implementada nas RPCs, cobre apenas chaves de
`extra_data`. As colunas diretas (`name`, `email`, `birth_date`) são
sobrescritas pelo `insert ... on conflict` sem consultar `v_locks`
([schema.sql:95-100](docs/db/schema.sql#L95-L100),
[schema.sql:294-300](docs/db/schema.sql#L294-L300)) — mas o `on conflict` não foi
lido integralmente nesta auditoria, então marco como **AMBÍGUO**: leitura (a) as
colunas diretas ficam desprotegidas pelo lock; leitura (b) o `do update` usa
`coalesce`/condicional que preserva o valor do admin. Resolver isso exige ler o
corpo completo das duas funções ou consultar o banco.

### 4. #4d — job manual — **NÃO ENCONTRADO**

Não existe criação manual de job em nenhuma camada:

- **Página/rota:** a lista completa de rotas (Bloco B) não tem nada como
  `/admin/jobs/novo`, `/admin/jobs/new` ou equivalente. Os únicos arquivos sob
  `src/app/admin/(protected)/jobs/` são `[id]/page.tsx` e `[id]/JobDetail.tsx`.
- **Formulário:** `NÃO ENCONTRADO`.
- **Server Action:** a lista completa de Server Actions exportadas
  (Bloco D) tem 9 funções; nenhuma cria job. `grep -rni
  "createjob|novo job|new job|insert.*jobs|from('jobs').insert" src/` → **zero
  ocorrências**.
- **RPC:** as duas únicas RPCs chamadas pelo app são `submit_cadastro` e
  `submit_anamnese` (Bloco D). Nenhuma RPC de criação de job pelo admin.

A única forma de um `job` nascer no sistema, segundo o código, é pelo formulário
público `/antes-da-sessao` via `submit_anamnese`
([src/app/actions/anamnese.ts:259](src/app/actions/anamnese.ts#L259)) — o
`submit_cadastro` não cria job.

**Os documentos estão certos e a memória de trabalho está errada neste item.**
Os docs registram em 15/07: "falta apenas #4d (job manual)"
([docs/changelog.md:579](docs/changelog.md#L579),
[docs/changelog.md:587](docs/changelog.md#L587),
[docs/changelog.md:690](docs/changelog.md#L690),
[docs/decision_log.md:1456](docs/decision_log.md#L1456)) — e nenhum commit
posterior a essa data implementa job manual.

### 5. Campo de observações vivas na ficha da pessoa — **NÃO ENCONTRADO**

Não existe campo de texto livre editável e persistido na ficha da pessoa:

- `FIELDS` do `PersonEdit`
  ([PersonEdit.tsx:34-67](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L34-L67))
  tem 11 campos, todos `text`/`date`/`select` de dado cadastral. Nenhum
  `textarea`, nenhum campo de nota.
- `LOCKABLE_FIELDS` ([person-fields.ts:9-21](src/app/admin/_ui/person-fields.ts#L9-L21))
  não tem `notes`/`observacoes`/equivalente.
- O `patchSchema` do `updatePerson`
  ([admin-people.ts:41-70](src/app/actions/admin-people.ts#L41-L70)) aceita
  exatamente esses 11 campos — qualquer outro é descartado pelo Zod.
- `grep -rni "observa|notes|anota" src/app/admin/` só retorna `health_notes`, que
  é **campo clínico de leitura** vindo da anamnese, exibido no detalhe do **job**
  ([jobs/[id]/page.tsx:366-368](src/app/admin/(protected)/jobs/[id]/page.tsx#L366-L368)),
  não editável pelo admin.

A ficha da pessoa exibe `extra_data` cru num `<details>` só-leitura
([people/[id]/page.tsx:321-331](src/app/admin/(protected)/people/[id]/page.tsx#L321-L331)) —
o mais próximo que existe de "observações", e não é editável.

---

## Bloco D — Camada de dados

### Server Actions (9 exportadas, em 5 arquivos)

Todas usam `createAdminClient()` (`service_role`). Nenhuma usa a publishable key
para escrita ou leitura de dado.

| # | Arquivo:linha | Nome | O que faz | Toca | service_role? | Gate |
|---|---|---|---|---|---|---|
| 1 | [admin-jobs.ts:66](src/app/actions/admin-jobs.ts#L66) | `updateJob` | Atualiza status/preços/descrição/estilo/tamanho do job; carimba `quoted_at`/`confirmed_at`/`executed_at`/`cancelled_at` só se ainda nulos; grava evento `admin.job_updated` | tabelas `jobs`, `events` | sim ([:81](src/app/actions/admin-jobs.ts#L81)) | `requireOperator()` [:70](src/app/actions/admin-jobs.ts#L70) |
| 2 | [admin-people.ts:95](src/app/actions/admin-people.ts#L95) | `updatePerson` | Edita os 11 campos da pessoa (colunas + `extra_data`), carimba `admin_locks`, grava evento `admin.person_updated` | tabelas `people`, `events` | sim ([:126](src/app/actions/admin-people.ts#L126)) | `requireOperator()` [:98](src/app/actions/admin-people.ts#L98) |
| 3 | [admin-people.ts:234](src/app/actions/admin-people.ts#L234) | `unlockField` | Remove uma chave de `extra_data.admin_locks`; grava evento `admin.person_field_unlocked` | tabelas `people`, `events` | sim ([:249](src/app/actions/admin-people.ts#L249)) | `requireOperator()` [:237](src/app/actions/admin-people.ts#L237) |
| 4 | [anamnese.ts:49](src/app/actions/anamnese.ts#L49) | `getAnamneseProfileByPhone` | Perfil por telefone E.164 + estado atual dos consents `lgpd`/`marketing`/`image` | tabelas `people`, `consents` | sim ([:59](src/app/actions/anamnese.ts#L59)) | **público** (form) |
| 5 | [anamnese.ts:235](src/app/actions/anamnese.ts#L235) | `submitAnamnese` | Valida com Zod, reafirma `POLICY_VERSION_ANAMNESE` em cada consent, chama a RPC | **RPC `submit_anamnese`** ([:259](src/app/actions/anamnese.ts#L259)) | sim ([:258](src/app/actions/anamnese.ts#L258)) | **público** (form) |
| 6 | [auth-admin.ts:10](src/app/actions/auth-admin.ts#L10) | `signOutAdmin` | Encerra a sessão e redireciona pro login | Supabase Auth (cookies) | **não** — usa o server client `@supabase/ssr` ([:11](src/app/actions/auth-admin.ts#L11)) | — |
| 7 | [people.ts:32](src/app/actions/people.ts#L32) | `findPersonByPhone` | Busca pessoa por telefone E.164 | tabela `people` | sim ([:43](src/app/actions/people.ts#L43)) | **público** (usada em `/__health`) |
| 8 | [people.ts:104](src/app/actions/people.ts#L104) | `getPersonProfileByPhone` | Perfil + `extra_data` + estado dos consents `lgpd`/`marketing` | tabelas `people`, `consents` | sim ([:114](src/app/actions/people.ts#L114)) | **público** (form) |
| 9 | [people.ts:232](src/app/actions/people.ts#L232) | `submitCadastro` | Valida com Zod, normaliza telefone pra E.164, monta consents e chama a RPC | **RPC `submit_cadastro`** ([:257](src/app/actions/people.ts#L257)) | sim ([:256](src/app/actions/people.ts#L256)) | **público** (form) |

Registro (não corrigido): `signOutAdmin` é a única Server Action sem
`requireOperator()` — coerente, já que logout de quem não passou no gate não faz
sentido, e ela não lê dado.

### RPCs do Postgres chamadas pelo app

`grep -rn "\.rpc(" src/` retorna exatamente **2 ocorrências**:

| RPC (nome literal) | Chamada de |
|---|---|
| `submit_anamnese` | [src/app/actions/anamnese.ts:259](src/app/actions/anamnese.ts#L259) |
| `submit_cadastro` | [src/app/actions/people.ts:257](src/app/actions/people.ts#L257) |

Ambas recebem um único parâmetro `payload` (jsonb).

Para cruzamento com o banco: o snapshot `docs/db/schema.sql` declara **5**
funções em `public` — `set_updated_at` ([:33](docs/db/schema.sql#L33)),
`submit_anamnese` ([:43](docs/db/schema.sql#L43)), `submit_cadastro`
([:227](docs/db/schema.sql#L227)), `sync_people_location`
([:370](docs/db/schema.sql#L370)), `uuid_generate_v7`
([:384](docs/db/schema.sql#L384)). As outras três não são chamadas pelo app
(são trigger/utilitário).

### `supabase/migrations/` versionado — **NÃO ENCONTRADO**

`ls supabase` → `No such file or directory`. Não existe diretório `supabase/` no
repo, portanto não existe `supabase/migrations/`. A dívida está registrada nos
próprios docs ([docs/changelog.md:920-923](docs/changelog.md#L920-L923),
[docs/decision_log.md:1556-1557](docs/decision_log.md#L1556-L1557)): as
migrations vivem no schema `supabase_migrations` do Supabase, aplicadas via MCP.

### `docs/db/schema.sql` e `schema.md` — **EXISTEM**

| Arquivo | Tamanho | Último commit que tocou |
|---|---|---|
| [docs/db/schema.sql](docs/db/schema.sql) | 57.206 bytes | `a952b52` — 2026-07-20 02:01:53 -0300 |
| [docs/db/schema.md](docs/db/schema.md) | 45.406 bytes | `a952b52` — 2026-07-20 02:01:53 -0300 |

Ambos são gerados pelo MOAS ([scripts/moas.mjs](scripts/moas.mjs), `npm run
moas` / `npm run moas:check` — [package.json:9-10](package.json#L9-L10)).
Snapshot congelado em 20/07; não foi regerado desde então (não há commits desde
então).

---

## Bloco E — Dívidas técnicas rastreadas

### 1. Geração/download de PDF — **NÃO ENCONTRADO**

Não existe geração nem download de PDF no repo.

- `grep -rn "pdf|PDF|jsPDF|print("` em `src/` (`.ts`/`.tsx`) → **zero
  ocorrências**.
- `git grep -il "jspdf|react-pdf|puppeteer|@react-pdf|pdfkit"` em todos os
  arquivos versionados → **zero ocorrências**.
- `package.json` não tem nenhuma dependência de PDF
  ([package.json:12-21](package.json#L12-L21) e
  [:22-32](package.json#L22-L32)).
- `grep -rn "PDF" docs/changelog.md docs/decision_log.md` → **zero ocorrências**.

Portanto: **não há código de PDF e, consequentemente, não há tratamento mobile**.
O bug relatado ("PDFs não funcionam no celular") não tem contraparte neste repo.
**AMBÍGUO quanto à origem do bug:** leitura (a) o PDF é gerado fora deste repo
(WordPress legado, Supabase Storage, ferramenta externa) e o relato não pertence
a este código; leitura (b) o relato se refere a algo que nunca foi implementado
aqui. O repo não permite decidir entre as duas.

### 2. `/cadastro` envia `policy_version`? — **NÃO. Ainda depende do coalesce.**

- `submitCadastro` monta os consents em
  [src/app/actions/people.ts:247-253](src/app/actions/people.ts#L247-L253):
  `{ type, granted, valid_months }` — **sem `policy_version`**.
- O `cadastroPayloadSchema`
  ([people.ts:178-204](src/app/actions/people.ts#L178-L204)) não tem campo de
  versão de política.
- `src/lib/legal/policy.ts` exporta **apenas** `POLICY_VERSION_ANAMNESE`
  ([policy.ts:11](src/lib/legal/policy.ts#L11)). Não existe constante de cadastro.
- A RPC preenche o buraco:
  [docs/db/schema.sql:342](docs/db/schema.sql#L342) —
  `coalesce(v_consent->>'policy_version', 'cadastro-v1-2026-07')`.

Contraste com a anamnese, que **é** rigorosa: cada consent carrega
`policy_version` obrigatório no schema Zod
([anamnese.ts:195](src/app/actions/anamnese.ts#L195)), o server reafirma a
constante ignorando o client
([anamnese.ts:252-255](src/app/actions/anamnese.ts#L252-L255)) e a RPC levanta
`consent_policy_version_required` se faltar
([docs/db/schema.sql:183-184](docs/db/schema.sql#L183-L184)).

**Presente** — dívida intacta.

### 3. Doc legal `cadastro-v1-2026-07` em `docs/legal/` — **NÃO ENCONTRADO**

`docs/legal/` contém **um único arquivo**: `consentimento_anamnese_v1.md` (6.253
bytes, modificado 13/07). Não existe nenhum arquivo de texto de consentimento do
cadastro. A string `'cadastro-v1-2026-07'` é gravada em produção pelo coalesce da
RPC ([docs/db/schema.sql:342](docs/db/schema.sql#L342)) **sem texto congelado
correspondente no repo** — a versão jurídica aponta para um documento que não
existe.

**Presente** — dívida intacta, e agravada pelo item 2.

### 4. `/__health` protegida ou aberta? — **ABERTA**

Ver Bloco B. Resumo da evidência: matcher do proxy restrito a `/admin/:path*`
([src/proxy.ts:67](src/proxy.ts#L67)); a página não chama `requireOperator()`
([src/app/%5F%5Fhealth/page.tsx:5-30](src/app/%5F%5Fhealth/page.tsx#L5-L30));
lê com `service_role` ([:11](src/app/%5F%5Fhealth/page.tsx#L11)); expõe a Server
Action `findPersonByPhone` no client ([:48](src/app/%5F%5Fhealth/page.tsx#L48)),
que também não tem gate ([src/app/actions/people.ts:32](src/app/actions/people.ts#L32)).

**Presente** — dívida intacta.

### 5. Bandeiras SVG no `PhoneField` — **Presente (ainda emoji)**

[src/components/form/PhoneField.tsx:18-23](src/components/form/PhoneField.tsx#L18-L23):
`flagEmoji()` monta a bandeira com regional indicator symbols
(`String.fromCodePoint`). Usada no label de cada opção de país em
[PhoneField.tsx:29](src/components/form/PhoneField.tsx#L29). A própria dívida
está anotada no arquivo, [PhoneField.tsx:37-38](src/components/form/PhoneField.tsx#L37-L38):
"a bandeira é emoji e não renderiza no Chrome/Windows. Vira SVG numa spec
própria."

**Presente** — dívida intacta.

### 6. `window.confirm` no campo de telefone do `<PersonEdit>` — **Presente**

[src/app/admin/(protected)/people/[id]/PersonEdit.tsx:163-165](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L163-L165):

```
if (key === 'phone' && !window.confirm(PHONE_WARNING)) {
  return
}
```

`PHONE_WARNING` está em [PersonEdit.tsx:69-70](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L69-L70).

Esta é a **única** ocorrência de `window.confirm` em `src/`. O `<Dialog>` do
design system substituiu apenas o confirm **do destravamento**, não o do
telefone — comentado explicitamente em
[PersonEdit.tsx:346-350](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L346-L350):
"Substitui o window.confirm da #026" (referindo-se ao unlock).

**Presente** — dívida intacta.

### 7. Erros de ESLint em `CadastroForm.tsx` — **Presentes. Saída real:**

Comando: `npm run lint` (`eslint`, [package.json:8](package.json#L8)). Saída
literal:

```
D:\...\site-flag-haus\src\app\(cadastro)\CadastroForm.tsx
  159:3  error  Error: Cannot access refs during render

React refs are values that are not needed for rendering. Refs should only be
accessed outside of render, such as in event handlers or effects. Accessing a
ref value (the `current` property) during render can cause your component not to
update as expected (https://react.dev/reference/react/useRef).

  157 |   const handleNextRef = useRef<() => void>(() => {})
  158 |   const guardRef = useRef({ isPending, blocked: state.blocked, done: state.done })
> 159 |   handleNextRef.current = handleNext
      |   ^^^^^^^^^^^^^^^^^^^^^ Cannot update ref during render
  160 |   guardRef.current = { isPending, blocked: state.blocked, done: state.done }
  161 |
  162 |   useEffect(() => {  react-hooks/refs

  160:3  error  Error: Cannot access refs during render
  [mesma mensagem, apontando para guardRef.current]

✖ 2 problems (2 errors, 0 warnings)
```

Regra: `react-hooks/refs`. Linhas: exatamente **159 e 160** de
[src/app/(cadastro)/CadastroForm.tsx](src/app/(cadastro)/CadastroForm.tsx#L157-L162)
— confirma a localização rastreada. **São os 2 únicos erros de lint do projeto
inteiro**; nenhum outro arquivo aparece na saída.

**Presente** — dívida intacta, não corrigida nesta rodada.

### 8. `npm audit` — **6 vulnerabilidades, todas HIGH**

Comando: `npm audit` (não foi rodado `npm audit fix`). Resumo literal do final da
saída: `6 high severity vulnerabilities`.

Distribuição por pacote:

| Pacote | Versão vulnerável | Severidade | Origem |
|---|---|---|---|
| `next` | (a instalada: 16.2.9) | high | 9 advisories: bypass de proxy no App Router com Turbopack, DoS em Server Actions, SSRF em Server Actions/rewrites, cache confusion (2), payload ilimitado no Edge, DoS na Image Optimization API via SVG, exposição não autenticada de endpoints de Server Function |
| `postcss` | `<=8.5.22` | high | 4 advisories: XSS via `</style>` não escapado no stringify; path traversal / leitura arbitrária de `.map` via `sourceMappingURL` (3 variantes, incluindo correção incompleta) |
| `sharp` | `<0.35.0` | high | libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 |

`postcss` e `sharp` entram como dependências transitivas do `next`
(`node_modules/next/node_modules/postcss`, `node_modules/sharp`).

O fix disponível é **`npm audit fix --force`**, que instalaria **`next@16.3.0`** —
"outside the stated dependency range" (o `package.json` fixa `"next":
"16.2.9"`, [package.json:18](package.json#L18)). **Não executado**, conforme a
instrução. É decisão do Alan: subir a major/minor do Next é mudança de
plataforma, não patch de segurança silencioso.

---

## Bloco F — Docs do repo vs. docs em mãos

### Última entrada de cada arquivo

| Arquivo | Linhas | Última entrada (data e título) | Último commit |
|---|---|---|---|
| [docs/changelog.md](docs/changelog.md) | 944 | **2026-07-20 — CRM: idempotência real no /cadastro (Emenda D) — fix de bug em produção** ([:819](docs/changelog.md#L819)) | `cb3e159`, 2026-07-20 02:07:30 |
| [docs/decision_log.md](docs/decision_log.md) | 1654 | **Decision #028 — 2026-07-20 — Idempotência real no /cadastro (Emenda D)** ([:1561](docs/decision_log.md#L1561)) | `cb3e159`, 2026-07-20 02:07:30 |

Confirma a premissa da auditoria: os docs param em 20/07 e a última entrada é a
Emenda D / #028.

**Nenhum dos dois arquivos tem entrada própria para #4a, #4b, #4c (a spec-base)
ou #4d.** As únicas menções ao Bloco 4 no changelog são
[:579](docs/changelog.md#L579), [:587](docs/changelog.md#L587),
[:595](docs/changelog.md#L595) (título da spec #4c-**visual**) e
[:690](docs/changelog.md#L690) — três delas dizendo que **falta #4d**. No
decision_log: [:1385](docs/decision_log.md#L1385) (#4c-visual) e
[:1456](docs/decision_log.md#L1456) ("falta #4d — job manual"). O que existe
documentado do Bloco 4 é a *emenda visual* e a *adoção do design system*, não as
specs #4a/#4b/#4c/#4d em si.

### Entradas duplicadas — **SIM, três blocos duplicados confirmados**

**a) Emenda D no changelog — duplicada.** Título idêntico, texto reescrito:

- 1ª ocorrência: [docs/changelog.md:701](docs/changelog.md#L701)
- 2ª ocorrência: [docs/changelog.md:819](docs/changelog.md#L819)

Ambas: `## 2026-07-20 — CRM: idempotência real no /cadastro (Emenda D) — fix de
bug em produção`. Os corpos divergem em redação e em um detalhe factual: a
primeira fala em "3 migrations da Emenda D", a segunda em "4 migrations"
([:921](docs/changelog.md#L921)). A segunda é a versão mais completa.

**b) Decision #028 no decision_log — duplicada:**

- 1ª ocorrência: [docs/decision_log.md:1462](docs/decision_log.md#L1462)
- 2ª ocorrência: [docs/decision_log.md:1561](docs/decision_log.md#L1561)

Ambas: `## Decision #028 — 2026-07-20` / `### Decisão: Idempotência real no
/cadastro (Emenda D)`. Mesma divergência 3 vs. 4 migrations
([:1556](docs/decision_log.md#L1556) vs.
[:1620-1624](docs/decision_log.md#L1620-L1624)).

**c) Decisions #015 / #016 / #017 — duplicadas, cada uma:**

| Decision | 1ª ocorrência | 2ª ocorrência |
|---|---|---|
| #015 — Stack migra para Next.js + Vercel | [decision_log.md:540](docs/decision_log.md#L540) (`# Decision #015 — 2026-06-17`) | [decision_log.md:742](docs/decision_log.md#L742) (`## Decision #015 — 2026-06-17`) |
| #016 — CRM canônico é Supabase nativo | [decision_log.md:611](docs/decision_log.md#L611) | [decision_log.md:781](docs/decision_log.md#L781) |
| #017 — Supabase é estado presente | [decision_log.md:676](docs/decision_log.md#L676) | [decision_log.md:816](docs/decision_log.md#L816) |

Note o nível de heading diferente entre as duas séries (`#` na primeira, `##` na
segunda) — indício de duas colagens em momentos distintos.

**Causa visível da duplicação c):** entre as duas séries existe, **dentro do
próprio `decision_log.md`**, um cabeçalho de instrução que era pra ser
descartado na colagem:

- [docs/decision_log.md:735](docs/decision_log.md#L735) — `# Decision log —
  entradas novas`
- [docs/decision_log.md:737-738](docs/decision_log.md#L737-L738) — "**Cola no
  topo de `docs/decision_log.md`, abaixo do header existente, na ordem em que
  aparecem aqui.**"

Ou seja: o bloco "para colar" foi colado inteiro, cabeçalho de instrução e tudo,
por cima de conteúdo que já estava lá.

### Arquivo solto tipo `emenda_d_inserts_doc_final.md` — **NÃO ENCONTRADO**

`git ls-files | grep -i "emenda|insert|doc_final"` → **zero resultados**. Não há
arquivo solto com esse conteúdo em nenhum lugar do repo versionado, e
`git status` está limpo (não há untracked). O conteúdo "para colar" **foi**
colado — nos dois arquivos, e em duplicidade (ver acima). As strings
`emenda_d_*` que aparecem em [decision_log.md:1620-1624](docs/decision_log.md#L1620-L1624)
são **nomes das migrations** aplicadas via MCP, não nomes de arquivo do repo.

---

## Divergências entre memória de trabalho, docs e código — quadro final

| Item | Memória de trabalho | Docs (até 20/07) | **Código (fonte de verdade)** |
|---|---|---|---|
| #4a auth + allowlist | completo | sem entrada própria | **existe, completo** (`src/lib/auth/gate.ts`, commit `a41763e`) |
| #4b fila | completo | sem entrada própria; "em desenvolvimento" | **existe, completo** (`/admin`) |
| #4c PersonEdit | completo | só a emenda visual e o DS | **existe, completo no app** |
| #4d job manual | completo | "falta apenas #4d" | **NÃO ENCONTRADO** — docs certos, memória errada |
| Observações vivas | — | — | **NÃO ENCONTRADO** |
| RPCs respeitam `admin_locks` | pendente (falta migration) | Emenda C aplicada ([changelog.md:653](docs/changelog.md#L653)) | **snapshot mostra aplicada** ([schema.sql:81](docs/db/schema.sql#L81), [:280](docs/db/schema.sql#L280)); comentários no código estão desatualizados |

---

## Achados registrados e não corrigidos (escopo: inventário)

1. `/__health` aberta em produção, lendo com `service_role` e expondo busca por
   telefone — [src/app/%5F%5Fhealth/page.tsx](src/app/%5F%5Fhealth/page.tsx),
   [src/proxy.ts:67](src/proxy.ts#L67).
2. `policy_version` do cadastro só existe como default no banco, e aponta para um
   texto legal inexistente no repo —
   [src/app/actions/people.ts:247-253](src/app/actions/people.ts#L247-L253),
   [docs/db/schema.sql:342](docs/db/schema.sql#L342), `docs/legal/`.
3. Comentários de `admin-people.ts` e `PersonEdit.tsx` afirmam que a Emenda C não
   rodou, contrariando o snapshot do schema —
   [admin-people.ts:20-22](src/app/actions/admin-people.ts#L20-L22),
   [PersonEdit.tsx:15-16](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L15-L16).
4. Cobertura do lock sobre colunas diretas (`name`/`email`/`birth_date`) —
   **AMBÍGUO**, ver #4c.
5. Dois erros de lint `react-hooks/refs` em
   [CadastroForm.tsx:159-160](src/app/(cadastro)/CadastroForm.tsx#L159-L160).
6. 6 vulnerabilidades high; o fix exige `next@16.3.0`, fora do range declarado.
7. Duplicação em `changelog.md` (1 bloco) e `decision_log.md` (4 blocos).
8. Divergência 3 vs. 4 migrations da Emenda D entre as cópias duplicadas.
9. Repo sem `supabase/migrations/` — banco versionado só por snapshot MOAS.
10. `window.confirm` nativo no telefone do `PersonEdit`
    ([:163](src/app/admin/(protected)/people/[id]/PersonEdit.tsx#L163)).
11. Bandeiras emoji no `PhoneField`
    ([:18-23](src/components/form/PhoneField.tsx#L18-L23)).

Nenhum foi corrigido. Nenhuma migration, seed, instalação ou alteração de
Supabase foi executada. Comandos rodados: `git log`/`status`/`rev-list`/`grep`/
`ls-files`, leitura de arquivos, busca, `npm run lint`, `npm audit`.
