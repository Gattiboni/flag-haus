## 2026-05-27 — CRM Flag Haus: anamnese, consentimentos e motivações (Leva 0007)

### Adicionado

- ENUM `consent_type` com 4 valores: `procedure`, `lgpd`, `image`, `marketing`
- Tabela `clinical_records` — anamnese por job, wide table com campos clínicos
- Tabela `consents` — registro append-only de consentimentos, todos os tipos
- Tabela `motivations` — histórico append-only de motivações declaradas pelo
  cliente
- Todas as 3 tabelas com RLS habilitada (policies pendentes — ver decision log
  da Leva 0006)

### Aprovado e documentado

- Copy v2 dos questionários `/anamnese` e `/cadastro` (Versão A + B
  consolidadas)
- Arquivo de referência: `docs/copy_anamnese_v2_consolidado.md`
- Tom alinhado ao Brand Book Flag Haus (seção 4 — Tom de Voz)
- Lógica de "telefone como chave + pula o que já tem" definida

### Pendente

- Implementação dos forms `/anamnese` e `/cadastro` (Bloco 3 do plano de junho)
- Página de admin do Julio (Bloco 4)
- Promoção de chaves de `extra_data` para colunas dedicadas (quando houver massa
  crítica e padrão claro)

---

## 2026-05-27 — CRM Flag Haus: schema base (Leva 1 + 2)

### Adicionado

- Extensão PostGIS habilitada
- Função `public.uuid_generate_v7()` (substitui extensão `pg_uuidv7`
  indisponível no Supabase hosted)
- Função `public.set_updated_at()` (trigger genérico reusável)
- ENUMs: `lifecycle_stage`, `job_status`, `user_role`
- Tabela `people` — entidade central, identidade frouxa
- Tabela `jobs` — orçamentos/trabalhos/cancelamentos
- Tabela `lifecycle_transitions` — histórico append-only de mudanças de stage
- Tabela `identity_links` — resolução anonymous_id ↔ person_id
- Tabela `events` — timeline unificada (funil + marketing)
- Tabela `user_roles` — mapeamento auth.users → role
- Tabela `customer_segments_snapshot` — foto mensal da carteira
- Trigger `people_sync_location` — sincroniza geography a partir de lat/lng
- 7 tabelas com RLS habilitada (policies pendentes — ver decision log)

### Pendente

- RLS policies (Leva 3, adiada conscientemente)
- Custom Access Token Hook (Leva 3)
- pg_cron + snapshot mensal (junho, junto com Bloco 7)

---

## v0.1.0 — 2026-01-26

### Stack Reset e Fundação Técnica do Projeto Flag Haus

- Limpeza deliberada da implementação anterior baseada em Gutenberg + Astra.
- Extração integral do conteúdo textual da Home para documentação estruturada.
- Definição formal do Elementor como engine de layout principal.
- Adoção do tema Hello Elementor como base neutra e não opinativa.
- Instalação dos plugins essenciais (SEO, segurança, embeds), sem configuração
  prematura de performance.
- Preparação do ambiente para reconstrução incremental com foco em motion,
  escalabilidade e sanidade técnica.

**Impacto:**

- Eliminação de dívida estrutural precoce.
- Base estável para construção do layout e animações futuras.
- Separação clara entre conteúdo, layout e motion desde o início.

**Responsável:** Gattiboni

---

## 2026-06-17 — Setup inicial Next.js + Supabase + Vercel (Spec #2)

### Adicionado

- Projeto Next.js 16.2.9 inicializado na raiz do repo (TypeScript, App Router,
  Tailwind, src/, ESLint, sem Turbopack)
- Dependências: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `@types/node`
- Estrutura de pastas:
  - `src/app/(cadastro)/page.tsx` — placeholder da renovação de cadastro
  - `src/app/antes-da-sessao/page.tsx` — placeholder da anamnese pré-sessão
  - `src/app/%5F%5Fhealth/page.tsx` — health check técnico (URL pública
    `/__health`)
  - `src/lib/supabase/client.ts` — cliente browser
  - `src/lib/supabase/server.ts` — cliente server (Server Components/Actions)
  - `src/lib/supabase/types.ts` — placeholder
  - `src/components/.gitkeep`
- Design system base: CSS variables (paleta Flag Haus), fontes Fraunces + Lato
  via `next/font`, `globals.css` com `@layer base`
- Env vars: `.env.local` (gitignored) + `.env.example` (commitável)
- `readme.md` raiz substituído — reflete Next.js + Vercel + Supabase como stack
  canônica

### Validado

- α (textual): arquivos no lugar, `docs/` intacto, env vars corretas,
  `.gitignore` cobre `.env.local`
- β (executável): 8/8 verdes
  - `npm install` sem erro (2 vulns moderadas transitivas — não bloqueante,
    anotado pra revisar)
  - `npm run dev` sobe em `:3000`
  - `/` HTTP 200 com "Oi." em Fraunces
  - `/antes-da-sessao` HTTP 200 com título correto
  - `/__health` HTTP 200 com `Status: ok` e `People count: 0`
  - Fontes self-hosted via `next/font` (não fallback)
  - Paleta correta no CSS compilado
  - `npm run build` exit 0

### Pendente

- Deploy Vercel + configuração DNS Hostinger (CNAME `cadastro` → Vercel)
- Confirmação de `cadastro.flaghaus.art/__health` em produção
- RLS policy mínima de SELECT em `people` (necessária pra Spec #3, ainda não
  criada)
- Implementação real dos formulários (Spec #3)
- Revisão de `npm audit` após Spec #3

---

## 2026-06-17 — RLS: deny explícito para anon e authenticated (migration 0007)

### Adicionado

- Migration `explicit_deny_anon_authenticated` aplicada no Supabase
  (`inuboxnkbtkvtxbupmqb`)
- 40 policies criadas (4 por tabela × 10 tabelas):
  - `deny_anon_select` — deny SELECT pra role `anon`
  - `deny_anon_write` — deny ALL (insert/update/delete) pra role `anon`
  - `deny_authenticated_select` — deny SELECT pra role `authenticated`
  - `deny_authenticated_write` — deny ALL pra role `authenticated`
- Tabelas cobertas: `people`, `jobs`, `lifecycle_transitions`, `identity_links`,
  `events`, `user_roles`, `customer_segments_snapshot`, `clinical_records`,
  `consents`, `motivations`

### Comportamento

- **Não mudou** — RLS habilitada sem policies já era deny-all implícito.
- **Mudou** — intenção agora é explícita, advisors silenciados, protegido contra
  "consertos" futuros equivocados.
- `service_role` continua com acesso total (bypass nativo Supabase, não precisa
  de policy).
- `/__health` em produção continua respondendo `Status: ok` / `People count: 0`.

### Pendente

- Substituir policies de `authenticated` por regras reais quando admin do Julio
  existir (Bloco 4)
- Auth Hook com `app_role` no JWT (Leva 3 do schema, ainda adiada)
- Spec #3a: Server Actions com service_role pra leitura/escrita server-side

---

## 2026-06-17 — CRM: leitura privilegiada via Server Action findPersonByPhone (Spec #3a)

### Adicionado

- `src/lib/supabase/admin.ts` — cliente Supabase com service_role, protegido por
  `import 'server-only'`
- `src/lib/utils/phone.ts` — `normalizePhone()` e `isValidBrazilianPhone()`,
  funções puras
- `src/app/actions/people.ts` — Server Action `findPersonByPhone(rawPhone)` com
  discriminated union `FindPersonResult` (found / not_found / invalid_phone /
  error)
- `src/app/%5F%5Fhealth/HealthClient.tsx` — Client Component com input + botão
  pra testar busca por telefone
- Validação Zod no input + normalização BR + filtro `deleted_at IS NULL`
- Logs server-side com prefixo `[findPersonByPhone]`

### Modificado

- `src/app/%5F%5Fhealth/page.tsx` — migrado de cliente público pra
  `createAdminClient`. Coerência com decisão #020.
- `.env.example` — adicionado `SUPABASE_SERVICE_ROLE_KEY=`

### Validado

- α (textual): arquivos no lugar, `docs/` intocado, env vars corretas
- β (executável): 11/11 verdes
  - Local: build limpo (`server-only` honrado), 3 cenários de busca respondem
    JSON correto
  - Produção: deploy Vercel verde, 3 cenários respondem em
    `cadastro.flaghaus.art/__health`, log `[__health] supabase ok` visível no
    build da Vercel — service_role confirmada em produção

### Pendente

- Spec #3b: form `/` (renovação retroativa) completo, usando
  `findPersonByPhone` + Server Actions de upsert
- Spec #3c: form `/antes-da-sessao` (anamnese) completo
- Migrar `/__health` pra rota dinâmica (ou remover) quando houver dado real no
  banco — hoje está prerenderizada como estática durante build

---
