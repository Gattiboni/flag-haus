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

## 2026-07-05 — CRM: form /cadastro completo — wizard 18 steps + E.164 (Spec #3b)

### Adicionado

- `src/app/(cadastro)/CadastroForm.tsx` — orquestrador client do wizard (18
  steps, estado único via `useState`, submit imperativo com `useTransition`)
- `src/app/(cadastro)/page.tsx` — Server Component passa
  `getPersonProfileByPhone` e `submitCadastro` como props (padrão #3a)
- `src/components/form/StepShell.tsx` — moldura do step (header, contador
  renumerado por steps visíveis, nav)
- `src/components/form/OptionPills.tsx` — grupo de opções estilo pill,
  controlado
- `src/components/form/ConfirmField.tsx` — confirmação leve com edição inline
  (confirmar/corrigir sem tela extra)
- `src/components/form/GeoFields.tsx` — bairro/cidade sempre editáveis + botão
  de geolocalização
- `src/components/form/PhoneField.tsx` — seletor de país (BR default/primeiro) +
  input de telefone com validação por país
- `src/lib/utils/geo.ts` — `reverseGeocode()` client-side via BigDataCloud (sem
  API key); bairro extraído de `administrative.adminLevel >= 9`, city de
  `adminLevel === 8`, guard bairro ≠ cidade
- Server Actions em `src/app/actions/people.ts` (mesmo arquivo, padrão #3a
  preservado):
  - `getPersonProfileByPhone(rawPhone, country='BR')` — perfil completo +
    `extra_data` + estado dos consentimentos (lgpd vigente? opt-in atual?),
    decide o que pular/confirmar/perguntar
  - `submitCadastro(payload)` — valida com Zod, monta payload, chama a RPC
    transacional

### Modificado

- `src/lib/utils/phone.ts` — substituído:
  `normalizePhone`/`isValidBrazilianPhone` removidos; agora
  `toE164(input, country)` via `libphonenumber-js/max`. Todos os call sites
  atualizados
- `findPersonByPhone` — ganhou parâmetro `country='BR'`, usa E.164
  (retrocompatível com chamada de 1 argumento em `/__health`)

### Banco (via MCP — migrations e seeds)

- Migration `rpc_submit_cadastro` — função transacional
  `submit_cadastro(payload jsonb)`: upsert `people` (null preserva, `extra_data`
  merge) + insert `consents` + insert `motivations` (se houver) + insert
  `events`, tudo-ou-nada. Execução restrita a `service_role`
- Migration `rpc_submit_cadastro_e164` — regex do phone de `^\d{10,11}$` para
  `^\+[1-9]\d{7,14}$` (formato canônico E.164)
- Seeds de teste: `+5511900000001` (perfil completo, returning com pulos
  máximos) e `+5511900000003` (perfil parcial, testa regra por-campo). Marcados
  `extra_data.seed = true`

### Dependência nova

- `libphonenumber-js@^1.13.8` — primeira dependência de terceiro do projeto.
  Import via subpath `/max` (metadata completa com padrões nacionais; a `min`
  valida só comprimento)

### Decisões de mecânica

- Telefone canônico E.164 internacional (base do Julio inclui clientes de fora
  do BR)
- Submit único no final via RPC transacional (1 leitura no telefone + 1 escrita
  no fechamento; zero insert direto do client)
- Regra de pulo é por campo, não por modo: returning com campo vazio pergunta
  normalmente
- LGPD do `/cadastro` usa versão curta (sem a frase de saúde — o form não coleta
  saúde; a frase pertence ao `/antes-da-sessao`)
- Geolocalização é progressive enhancement: campos manuais sempre visíveis;
  lat/lng invisível; falha/negação segue para digitação manual

### Validado

- α: arquivos no lugar, `findPersonByPhone` intacta, escrita só via RPC, `docs/`
  intocado
- β (local): build limpo; fluxo novo completo grava nas 4 tabelas em E.164;
  returning completo (`...001`) renumera para 13 steps e conclui; returning
  parcial (`...003`) pergunta tudo incl. LGPD; validações de telefone por país
  (`1198334157` rejeitado, `11983340447` → `+5511983340447`, US →
  `+12025550123`); geo com bairro ≠ cidade (Vila Mariana ok, centro SP → bairro
  vazio + city São Paulo); offline/retry preserva respostas
- Banco (via MCP): submits confirmados nas 4 tabelas, formato 100% E.164, seeds
  preservados, registros de teste limpos

### Pendente

- Spec #3c: form `/antes-da-sessao` (anamnese) — nasce com
  PhoneField/GeoFields/pipeline prontos
- Refinamento visual (branding book + wireframe pra aprovação) — combinado para
  a 3c
- Bandeiras SVG no PhoneField (emoji não renderiza no Windows/Chrome — mostra
  "BR")
- Remover `console.debug` do geo.ts na 3c
- Endurecer validação BR para exigir celular de 11 dígitos? (aberto — a lib
  aceita fixo de 10 dígitos como válido)
- Migrar `/__health` para dinâmica ou remover antes do lançamento

---

## 2026-07-13 — CRM: gate de idade + cadeia de geocoding + autocomplete (Spec #3b-fix)

### Adicionado

- `src/lib/utils/age.ts` — funções puras `calculateAge()` (anos completos,
  `today` injetável, `null` em data inexistente) e `isEligibleAge()` (data real,
  não-futura, ≤ 120 anos, ≥ 18 anos). Sem biblioteca de data nova — `Date`
  nativo
- `src/lib/utils/geo.ts` — arquitetura de adaptadores plugáveis:
  - Tipos `GeoResult` e `GeoProvider` exportados
  - Provider `nominatim` (**primário**) —
    `suburb ?? neighbourhood ??
    city_district` para bairro;
    `city ?? town ?? municipality` para cidade
  - Provider `bigdatacloud` (**fallback**) — lógica anterior preservada na
    íntegra (`adminLevel >= 9` / `=== 8`)
  - `reverseGeocode()` orquestra em ordem, aplica o guard `bairro ≠ cidade` em
    cada resultado, retorna o primeiro com bairro; senão o primeiro com cidade;
    senão `{null, null}`. Erro/timeout de um provider vira `console.warn` e
    passa ao próximo — nunca propaga. Timeout de 5s por provider via
    `AbortController`
- `src/lib/utils/geo.ts` — `searchPlaces(query, kind, bias?, signal?)` +
  `PlaceSuggestion`: autocomplete via **Photon** (`photon.komoot.io`, dados OSM,
  sem API key). Filtro client-side por `osm_value` (whitelist separada para
  bairro e cidade), dedupe por `(name + state + country)`, cap de 5 sugestões,
  viés geográfico (lat/lng do geo, ou São Paulo por padrão), timeout 4s, falha →
  array vazio
- `src/components/form/GeoFields.tsx` — subcomponente `AutocompleteInput`
  reutilizado nos dois campos: debounce de 300ms a partir de 3 caracteres,
  `AbortController` por tecla, dropdown na paleta Flag Haus, navegação por
  teclado (↑ ↓ Enter Esc), clique-fora fecha, indicador de carregamento, zero
  resultados não abre dropdown. Digitação livre sempre permitida — autocomplete
  nunca é gate
- `src/app/(cadastro)/CadastroForm.tsx` — step de **gate de idade** (data de
  nascimento obrigatória) posicionado logo após o telefone e o reconhecimento;
  tela de bloqueio terminal para menores de 18 (sem avançar, sem voltar, sem
  escrita)
- Tecla **Enter avança o step**, reutilizando os mesmos handlers do botão
  (`handleNext`, `handlePhoneNext`, `handleGateNext`, `handleLocationNext`) —
  zero duplicação de validação. Ignorado em `<textarea>`. Não avança quando o
  dropdown do autocomplete está aberto (coordenação via `e.defaultPrevented`)

### Modificado

- `src/app/(cadastro)/CadastroForm.tsx`:
  - O step de data de nascimento (antes opcional, posicionado adiante no wizard)
    **migrou** para logo após o reconhecimento. Não duplicou — o antigo foi
    removido, junto de `formatDateBR` e `isFilled(6)`, que só serviam a ele
  - Campo cidade nasce **vazio** (antes tinha default `'São Paulo'` no state)
  - Hidratação do returning: `city: p.extra.city ?? ''` (antes injetava
    `'São Paulo'`)
  - `isFilled(7)` passa a exigir bairro **e** cidade para usar o atalho de
    confirmação
  - `buildPayload` envia `extra.city` incondicionalmente
  - Estado ganha `birthError`, `cityError`, `blocked`; `submitLockRef`
    (síncrono) protege contra submit duplo
- `src/components/form/GeoFields.tsx` — placeholder do bairro deixa de ser
  `"Vila Mariana"` (um bairro real, que parecia campo preenchido) e passa a ser
  `"Seu bairro"`; campo cidade ganha placeholder `"Sua cidade"` e atributo
  `required`
- `src/app/actions/people.ts`:
  - `birth_date` deixa de ser `.nullable()` no `cadastroPayloadSchema` e ganha
    `.refine(isEligibleAge)` — obrigatório, com gate de idade ≥ 18 validado
    **server-side**
  - `extra_data` ganha `.refine()` exigindo `city` não-vazia. `neighborhood`
    permanece opcional
- `src/lib/utils/geo.ts` — removidos todos os `console.debug` (pendência herdada
  da #3b)

### Banco

- Nenhuma migration. `birth_date` permanece **nullable** no schema (obrigatório
  apenas na aplicação — ver decision #023)
- Seeds de teste adicionados: `+5511900000004` (sem `birth_date`, exercita o
  gate) e `+5511900000005` (16 anos, exercita o bloqueio). Marcados
  `extra_data.seed = true`
- Correção de dado: `extra_data.neighborhood` do seed `+5511900000003` estava
  gravado como `"São Paulo"` — efeito do default de cidade que impedia o
  geocoding de escrever. Removido

### Bugs corrigidos

- **Geolocalização nunca preencheu cidade.** O campo nascia com default
  `'São Paulo'` no state, e `GeoFields` só gravava a cidade do `reverseGeocode`
  quando `!city.trim()`. Como `city` nunca estava vazio, o retorno do geocoder
  era descartado silenciosamente. O "São Paulo" visível na tela era o default,
  não o resultado da geolocalização
- **Bairro não era resolvido em boa parte de São Paulo.** A BigDataCloud não
  devolve `adminLevel >= 9` para República, Sé/Centro nem Copacabana — só para
  bairros que também são subprefeituras (Vila Mariana, Pinheiros). O código
  estava correto; a fonte é que era incompleta
- **`cityError` era invisível.** O `<GeoFields>` tem dois locais de
  renderização. A prop `cityError` chegava apenas no ramo `isFilled(7)` —
  justamente aquele em que a validação nunca dispara. O ramo do formulário
  completo, onde a validação sempre roda, recebia `undefined`, e
  `{cityError && <p>…}` era sempre falso. O avanço era barrado sem nenhuma
  mensagem na tela

### Validado

- α (textual): `reverseGeocode` e providers existentes intactos; escrita segue
  só via RPC; nenhuma migration; nenhuma dependência nova; `docs/` intocado
- β (executável): 6/6 verdes
  - Returning completo (`...001`) — gate pulado, submit conclui, `birth_date`
    intacto, `updated_at` avança, eventos incrementam
  - Returning sem `birth_date` (`...004`) — gate aparece, data capturada e
    gravada
  - Returning menor (`...005`) — bloqueio dispara logo após o telefone;
    `updated_at = created_at`, **0 eventos, 0 consentimentos** (nada gravado)
  - **Cadastro novo do zero** (`+5511983340484`) — registro criado, bairro
    `"República"`, cidade `"São Paulo"`, 1 evento
  - Cidade vazia — não avança **e o erro aparece na tela**
  - Enter avança em campo de texto; quebra linha em `<textarea>`; seleciona
    sugestão (sem avançar) com o dropdown aberto
  - Autocomplete: `"rep"` → `"República — São Paulo"`; seleção de bairro
    preenche a cidade quando vazia
  - Geo negado — campos vazios com placeholder, sem `"São Paulo"` fantasma
- Nota de teste: geolocalização em desktop tem precisão de ±2000m (Wi-Fi/IP, não
  GPS). Coordenadas da República resolveram para Glicério — o provider está
  correto; a coordenada é que está torta. Validação com GPS real depende de
  teste em celular, em produção

### Pendente

- Teste de geolocalização em celular (GPS real) em `cadastro.flaghaus.art`
- Limpar registros de teste do banco (`+5511983340484`) — seeds `...001`,
  `...003`, `...004`, `...005` devem ser mantidos
- Spec #3c: form `/antes-da-sessao` (anamnese) — nasce com `PhoneField`,
  `GeoFields` (agora com autocomplete), gate de idade e pipeline E.164 prontos
- Refinamento visual (branding book + wireframe para aprovação) — combinado para
  a 3c
- Bandeiras SVG no `PhoneField` (emoji não renderiza no Windows/Chrome)
- Endurecer validação BR para exigir celular de 11 dígitos? (aberto)
- Migrar `/__health` para rota dinâmica ou remover antes do lançamento
- `npm audit` — 2 vulns moderadas transitivas, revisar
- Nominatim e Photon são serviços comunitários sem SLA. Em caso de bloqueio por
  volume, o caminho é proxiar via Server Action (permite `User-Agent` próprio) —
  não é necessário no volume atual

---

## 2026-07-13 — MOAS: inventário e snapshot do banco (autodescoberta)

### Adicionado

- `scripts/moas.mjs` — script Node que se conecta ao Postgres do Supabase,
  descobre o schema por autodescoberta (zero hardcoding de nomes de tabela,
  coluna, função ou tipo) e emite dois artefatos versionados
- `docs/db/schema.md` — inventário legível do schema `public`: extensões, enums,
  tabelas com colunas/constraints/índices/triggers/policies/grants, funções com
  corpo completo, migrations registradas
- `docs/db/schema.sql` — DDL executável, ordenado por dependência, para recriar
  o schema `public` num projeto Supabase novo
- `.githooks/pre-push` — bloqueia o push quando o schema do banco diverge do
  snapshot commitado. Não commita sozinho: avisa e barra
- `.gitattributes` — fixa `eol=lf` nos dois snapshots. Sem isso, o
  `core.autocrlf` do Windows reescreveria os arquivos no checkout e o hook
  divergiria em todo push, virando alarme falso
- `certs/prod-ca-2021.crt` — CA do Supabase (público), usada para verificação
  TLS completa (cadeia + hostname)
- `npm run moas` e `npm run moas:check`
- `pg@^8.22.0` em `devDependencies` — única dependência nova

### Corrigido

- `submission_id` em `jobs.extra_data` ganhou índice único parcial
  (`jobs_submission_id_unique`), impedindo job duplicado por reenvio do
  formulário. Aplicado no banco e registrado em `schema_migrations`

### Validado

- β 13/13 verdes pelo comando real (sem wrapper): determinismo por hash em runs
  consecutivos, `moas:check` exit 0/1 correto, CA ausente = erro fatal sem
  fallback, zero vazamento de credencial nos snapshots, `submit_cadastro` com
  corpo completo, 40 policies, 10 tabelas, PostGIS filtrado, `npm run build`
  passando

### Pendente

- **Teste 14 — replay do `schema.sql` contra um banco vazio: NÃO EXECUTADO.**
  Dispensado por decisão do Alan (custo/benefício não fecha num projeto sem
  massa de dado). O `schema.sql` é **presumido, não verificado** — o próprio
  arquivo declara isso no cabeçalho. Enquanto não for executado, o gerador de
  DDL não tem prova de correção.

---

## 2026-07-13 — CRM: form /antes-da-sessao (anamnese) — wizard 31 steps (Spec #3c)

- Wizard de 31 steps + tela de bloqueio de menor: gate de idade, anamnese de
  saúde (região do corpo, alergias, medicação, diabetes, pele, gravidez com 5
  opções, saúde geral, últimas 24h), consentimentos e cadastro com "pula o que
  já tem" por campo.
- Rota via route group: `src/app/(anamnese)/antes-da-sessao/page.tsx`;
  placeholder antigo removido.
- Server Action `submitAnamnese` (Zod + `service_role`) e leitura de perfil
  `getAnamneseProfileByPhone` — estado de consents append-only lido sempre pela
  linha mais recente.
- RPC transacional `submit_anamnese` (escrita atômica em `people`, `jobs`,
  `clinical_records`, `consents`, `motivations`, `events`) — testada 9/9 antes
  do front, com idempotência por `submission_id` e índice único parcial.
- Consentimento de dados de saúde como step destacado
  (`consent_type = 'health'`, LGPD Art. 11, I); `policy_version` obrigatório em
  todo consent; textos congelados em `docs/legal/consentimento_anamnese_v1.md`;
  constante única `POLICY_VERSION_ANAMNESE` em `src/lib/legal/policy.ts`.
- Copy v3 substitui o v2 (renomeado `_VENCIDO`); job nasce vazio (status default
  `quoted`, preços/timestamps null).
- Componentes 100% herdados do `/cadastro` sem fork; zero dependência nova;
  `/cadastro` intocado.
- β §14: 1–14 verdes (agente de navegador + verificação SQL; 5 execuções
  acidentais serviram de stress test do skip). Teste 7 visual aceito por
  camadas. **Pendente não-impeditivo:** testes 15/17 (Enter/autocomplete +
  celular real em produção).
- Docs: decisão #025, plano consolidado v4.

**Impacto:**

- Bloco 3 funcionalmente completo — os dois formulários públicos no ar
  escrevendo no Supabase.
- Caminho crítico passa ao Bloco 4 (admin): pré-condição definida para envolver
  o Julio (admin navegável em produção).

**Responsável:** Gattiboni (validação) · Claudinho (spec/arquitetura) · Codinho
(implementação)

---

## 2026-07-15 — CRM: emenda visual do `<PersonEdit>` — lápis/cadeado condicional

### Alterado

- `src/components/admin/PersonEdit.tsx` refatorado do modelo "12 inputs
  abertos + 12 cadeados livres" para modelo **leitura por padrão**:
  - Cada campo editável renderiza `LABEL / valor formatado / ✎`
  - Clique no ✎ vira aquele campo em modo edição inline com Salvar/Cancelar;
    outras linhas permanecem em leitura
  - 🔒 (oxblood) substitui o ✎ **apenas** em campos com entrada em
    `people.extra_data.admin_locks`
  - Clique no 🔒 abre menu dropdown (`role="menu"`, fecha em Esc e clique fora)
    com "Editar" e "Destravar"
- Formatação em modo leitura: `formatDateBR` para data, `formatPhoneBR` para
  telefone, rótulo do select (não o valor cru), `"—"` em `--granite` para vazio
- Botão global "Salvar" no rodapé removido — Salvar/Cancelar vivem na linha em
  edição
- Um editor por vez: abrir ✎ em outro campo fecha o anterior e descarta o
  rascunho
- Salvar sem mudança não chama o servidor (evita lock espúrio + evita disparar
  `confirm()` do telefone à toa)
- `<label>` virou `<div>` + `<span>`; inputs em edição ganharam `aria-label`
  para preservar nome acessível

### Não alterado

- Server Actions `updatePerson` e `unlockField` — comportamento e assinatura
  idênticos
- Server Action `submit_cadastro`/`submit_anamnese` (Emenda C, respeita
  `admin_locks`)
- Aviso do "fantasma do upsert" ao editar telefone — mantido, agora dispara
  dentro do fluxo do ✎

### Validado

- Build limpo: `tsc --noEmit`, `eslint`, `next build` — todos sem erro
- β manual (6/6 verdes) — Marina em `/admin/people/{id}`:
  1. Todos os campos editáveis mostram ✎, nenhum 🔒 (Marina não tem
     `admin_locks`)
  2. Clicar ✎ do email → linha vira input + Salvar/Cancelar, outras linhas
     permanecem em leitura
  3. Salvar novo email → volta pra leitura, linha agora mostra 🔒 no lugar do ✎
  4. Clicar 🔒 → menu com "Editar" e "Destravar" aparece corretamente
  5. Clicar "Destravar" → `confirm()` dispara, aceita → linha volta a mostrar ✎
  6. Menu do 🔒 fecha em Esc e clique fora — comportamento correto

### Dívida técnica rastreada

- Ao salvar telefone digitado como "11 99999-8888", a linha exibe essa forma até
  o próximo carregamento, quando `revalidatePath` traz o E.164 do servidor.
  Corrigir exigiria sincronizar estado com props ou mexer no retorno da Server
  Action — proibido pela emenda. Aceito como dívida cosmética
- Bloco 4 admin permanece em desenvolvimento; falta apenas #4d (job manual) para
  fechar o bloco funcional; refatoração visual completa via design system entra
  como spec seguinte

**Impacto:**

- Modelo de interação lápis/cadeado aprovado e em produção — modelo apropriado
  para escala de `admin_locks` (raro em condição real; frequente = ruído)
- Bloco 4 caminho crítico: #4d (job manual) + Spec #4c-visual (integração design
  system)

**Responsável:** Gattiboni (validação) · Claudinho (spec/arquitetura) · Codinho
(implementação)

---

## 2026-07-15 — CRM: Adoção do Design System Flag Haus (Spec #4c-visual)

### Adicionado

- **Tokens CSS (5 camadas)** em `src/styles/tokens/`: colors, typography,
  spacing, surfaces, semantic. Consumidos por `src/app/globals.css` via
  `@import` direto (Turbopack não iça `@import` aninhado).
  `src/styles/styles.css` mantido como entry point portátil.
- **Fontes** via `next/font/google` no `layout.tsx`: Inter (headings,
  `-0.01em`), Lato (corpo), Bebas Neue (letreiro "FLAG HAUS").
- **10 componentes UI** em `src/components/ui/`: Button, Input, Select,
  Textarea, Checkbox, RadioGroup, Card + CardHeader, Badge, Alert, Dialog.
  Barrel `index.ts` re-exporta os 10 com tipos; componentes client (`Input`,
  `Select`, `Textarea`, `Checkbox`, `RadioGroup`, `Dialog`) e server (`Card`,
  `CardHeader`, `Badge`, `Alert`, `Button`) coexistem no mesmo barrel — a
  fronteira só se cria onde o componente é usado.
- **Escala de espaçamento** exposta ao Tailwind com prefixo `fh-` via `@theme`
  em `globals.css`: `p-fh-5`, `border-fh-subtle`, `rounded-fh-md`. Não inventa
  valor — apelida token. Prefixo evita colisão com a escala default do Tailwind.
- **Dep nova:** `lucide-react` (versão pinada) — ícones consistentes com a
  fineline da marca (stroke 1.5px).
- **Assets:** `public/brand/` com 3 PNGs oficiais do FH monogram
  (onyx-on-whisper, white-on-onyx, wordmark-lockup-dark).
- **Docs:** `docs/design-system/` com README adaptado + SKILL.md + `adoption.md`
  (regra em vigor).

### Alterado (refactor visual completo)

- **Form público:** `/` (cadastro) e `/antes-da-sessao` (anamnese wizard 31
  steps) consumindo componentes UI. `OptionPills` reescrito internamente como
  `RadioGroup` (API preservada, ~20 chamadas nos wizards intocadas).
- **Admin:** `/admin` (fila), `/admin/jobs/[id]`, `/admin/people/[id]`,
  `/admin/buscar`, `/admin/login`. Wrapper raiz com `data-density="compact"`.
- **`<PersonEdit>`:** ícones ✎/🔒 via `lucide-react`, botões e inputs via
  componentes UI, dropdown do 🔒 estilizado com tokens, `confirm()` do destravar
  substituído por `<Dialog variant="danger">` com foco automático no botão de
  confirmar, fechamento em Esc, devolução de foco ao cadeado. `confirm()` nativo
  do telefone permanece — substituição exigiria reestruturar o fluxo síncrono
  (dívida rastreada).
- **Hierarquia de alerta clínico na anamnese:** alergia é o único
  `<Alert variant="critical">` (Oxblood pleno, `role="alert"`, ícone
  `AlertTriangle`). Medicação, diabetes, pele, gravidez viram `warning`
  (Terracota). Consent de saúde do step 15 recebeu modificador novo
  `.fh-card--accent` (borda oxblood 1.5px) — não usa `critical` pra não gastar o
  orçamento 10/90 duas vezes.
- **Badge de status do job:** usa nomes do enum (`quoted`, `confirmed`,
  `no_response`, `executed`, `cancelled`), com rótulos UX ("A orçar",
  "Confirmado" etc). Aparece no detalhe do job e na lista de jobs da pessoa; não
  na fila (lá o status é editável e os grupos já separam).
- **`/__health`:** refatorado pra consumir tokens novos (usava vars
  `--onyx`/`--paper` que sumiram; dívida rastreada anterior).
- **ESLint:** `_reference/**` adicionado aos ignores.

### Não alterado

- Server Actions (todas), RPCs, schema — intocados.
- Modelo lápis/cadeado do `<PersonEdit>` (decisão #026) — comportamento
  idêntico, apenas visual atualizado.
- Regras da Emenda C (RPCs respeitam `admin_locks`) — intocadas.
- Route groups, middleware/proxy, wizard state, validação Zod, gate de idade —
  intocados.

### Validado

- α: `tsc --noEmit`, `next build`, `eslint` (2 erros pré-existentes em
  `CadastroForm.tsx:157-158`, não introduzidos por esta spec), grep de hex
  hardcoded / box-shadow / gradient / blur em `src/` — zero regressões, zero
  violações da regra de adoção.
- `npm run moas:check` passa — banco intocado, `docs/db/` limpo.
- β manual (Alan no navegador, 13 passos da §5.3 da spec + varredura estética):
  - Form público: wizard completo funciona, radio group substituindo pill valida
    sem regressão de UX
  - Admin: densidade compact visivelmente mais apertada que o form público
  - Job da Marina: alerta crítico de alergia impossível de ignorar (Oxblood
    pleno)
  - `<PersonEdit>`: lápis vira input inline ao clicar, salvar volta pra
    leitura + cadeado aparece, menu do cadeado com Editar/Destravar, Dialog
    custom no destravar (foco automático, Esc fecha, foco volta ao cadeado)
  - Focus outline sólido 2px onyx em toda tela ao Tab — nunca brilho
- Testes secundários pelo Comet: complementaram varredura sistemática (rodada 14
  do roteiro pedia login bloqueado propositalmente pra testar
  `<Alert critical>`).

### Dívidas rastreadas (não bloqueantes)

- `window.confirm` do telefone no `<PersonEdit>` permanece nativo — substituição
  exigiria reestruturar fluxo síncrono do `handleSave`
- Logo em SVG vetorial (Julio ainda não mandou)
- 2 erros de ESLint pré-existentes em `CadastroForm.tsx:157-158`
  (react-hooks/refs, mutação de ref no render)
- Neue Einstellung: se comprada no futuro, swap trivial em
  `tokens/typography.css` + `layout.tsx`

**Impacto:**

- Bloco 4 fecha visualmente pronto pra apresentação ao Julio (falta apenas #4d —
  job manual — pra fechar o bloco funcional)
- Regra de adoção em vigor: qualquer JSX/estilo novo daqui pra frente consome
  tokens e componentes do design system; componente inexistente = pausa e
  reporta, não improvisa

**Responsável:** Gattiboni (validação) · Claudinho (spec/arquitetura) · Codinho
(implementação)

---

## 2026-07-20 — CRM: idempotência real no /cadastro (Emenda D) — fix de bug em produção

### Contexto

Bug em produção descoberto 2026-07-19 (~22:55 BRT): submits do `/cadastro`
falhavam com mensagem "Não deu pra salvar" no step 18. Reportado pelo Julio
(esposa dele tentou se cadastrar) e reproduzido pelo Alan. Log do Postgres
identificou a causa em 30 segundos: `raise exception 'invalid_submission_id'` na
`submit_cadastro`, linha 21 — validação órfã deixada pela Emenda C, que copiou a
checagem da `submit_anamnese` sem que o front implementasse o campo.

Rota decidida: implementar idempotência real no `/cadastro` espelhando o padrão
da anamnese. Alinhado com a decisão #023 (idempotência como padrão para submits
públicos). Alternativa descartada: remover a validação e viver sem idempotência
no cadastro, o que criaria exceção conceitual.

### Adicionado

- **Banco (via MCP):** índice único parcial
  `events_cadastro_submission_id_unique` em `public.events` sobre
  `((payload->>'submission_id'))` filtrado por
  `event_type = 'form.cadastro_submitted'`. Chaves NULL não colidem em Postgres,
  então events antigos sem submission_id não são afetados. Anamnese usa
  event_type diferente, também sem conflito.
- **Front (`src/app/(cadastro)/CadastroForm.tsx`):**
  `const [submissionId] =
  useState(() => crypto.randomUUID())` gerado uma vez
  no mount. Injetado em `buildPayload()` como `submission_id: submissionId`.
  UUID preso ao mount → "tenta de novo" após erro reusa o mesmo id (efeito
  desejado). F5 gera id novo (idem anamnese).
- **Server Action (`src/app/actions/people.ts`):** campo
  `submission_id: z.string().uuid()` no `cadastroPayloadSchema`, repassado no
  payload da RPC. Dicionário `RPC_EXCEPTIONS` + função `translateRpcError()`
  espelhando o padrão da `anamnese.ts:213-227`. Aplicado no ramo de erro da RPC
  — resultado: `error.message` cru do Postgres nunca mais vai direto pro client,
  sempre uma string controlada.

### Alterado

- **RPC `submit_cadastro` (via MCP):** curto-circuito idempotente logo após a
  validação de `submission_id` e antes de qualquer read/write em `people`. Se já
  existe event `form.cadastro_submitted` com aquele `submission_id`, retorna
  `{status:'ok', person_id:<existente>, duplicate:true}` sem re-executar upsert,
  consents, motivations ou event. O INSERT final em `events` agora inclui
  `submission_id` no `payload` (permite o curto-circuito funcionar em requests
  subsequentes).
- **`handleSubmit` do CadastroForm:** lê `r.message` / `r.reason` do retorno da
  action com fallback pro texto genérico atual. Sem essa leitura, o dicionário
  de mensagens ficaria morto (dívida evitada durante o α do Codinho —
  divergência D3 da spec).

### Não alterado

- `submit_anamnese`, `AnamneseForm`, `anamnese.ts` — intocados. Padrão original
  preservado; o cadastro se alinhou a ele.
- Regras da Emenda C (RPCs respeitam `admin_locks`) — intocadas.
- Schema das tabelas (`people`, `events`, `consents`, `motivations`) — intocado.
  Apenas RPC + índice.

### Validado

- α (Codinho): `tsc --noEmit` limpo, `next build` compilou em 8.2s,
  `npm run lint` com os 2 erros pré-existentes de `CadastroForm.tsx`
  (react-hooks/refs, dívida rastreada anterior). Diff final: 37 inserções, 5
  deleções → ~22 linhas líquidas. Grep confirmou simetria com anamnese (6 → 11
  ocorrências de `submission_id|submissionId`).
- β (Comet + MCP):
  - **Rodada 1** — cadastro normal (Comet, `localhost:3001`): pessoa nova "João
    Silva Teste" gravou 1 people + 1 event com `submission_id` no payload + 2
    consents. Tela final "Pronto. Cadastro atualizado."
  - **Rodada 2** — idempotência (Claude via MCP, 2 calls com mesmo
    `submission_id`): primeira retorna `{status:'ok', person_id:X}`, segunda
    retorna `{status:'ok', person_id:X, duplicate:true}`. Contagem pós-testes: 1
    people, 1 event, 1 consent, 1 motivation (zero duplicação).
  - **Rodada 3** — paralelismo (Comet, 2 abas normais em `localhost:3001`): "Ana
    Paralela A" e "Beatriz Paralela B" gravaram como pessoas distintas com
    `submission_id` distintos, nenhuma com `duplicate`.
- Pessoas de teste removidas pós-validação (4 pessoas, 4 events, 7 consents, 2
  motivations deletados via MCP).

### Migrations aplicadas via MCP (histórico honesto)

1. `emenda_d_idempotencia_cadastro` — índice + RPC nova. Erro no primeiro
   design: campo de retorno chamado `idempotent` (divergia do padrão `duplicate`
   da anamnese).
2. `emenda_d_rename_idempotent_to_duplicate` — padroniza campo com anamnese.
   Decisão do Alan durante o α do Codinho: consistência entre os dois forms
   públicos vale mais que semântica isolada.
3. `emenda_d_fix_ambiguous_payload` — corrige `payload->>'submission_id'` para
   `events.payload->>'submission_id'` no SELECT interno de idempotência. Erro
   descoberto durante β Rodada 1: `payload` é ambíguo (parâmetro da função +
   coluna de `public.events`). Log do Postgres deu o diagnóstico em uma linha.

### Dívidas rastreadas (não relacionadas à Emenda D)

- Trigger `sync_people_location` usa tipo `geography` sem qualificar schema.
  Quebra em chamadas com search_path restrito (ex: MCP direto sem `extensions`).
  Não afeta produção — o front sempre envia lat/lng num contexto onde o trigger
  encontra o tipo. Dívida real, prioridade baixa.
- Repo ainda não tem `supabase/migrations/` versionado. Migrations agora ficam
  no schema `supabase_migrations` do próprio Supabase (via MCP). Divergência de
  versionamento a resolver depois.

### Impacto

- Bug crítico em produção resolvido. `/cadastro` volta a funcionar
  ponta-a-ponta.
- Cadastro agora tem idempotência real: duplo submit ou refresh no meio do envio
  não duplica consents/events/motivations.
- Padrão de mensagens de erro no `/cadastro` alinhado com anamnese
  (`RPC_EXCEPTIONS` + `translateRpcError()`).

**Responsável:** Gattiboni (validação + aplicação SQL via MCP orquestrado por
Claudinho) · Claudinho (spec, correção dos bugs de SQL, execução das migrations
via MCP, roteiros β) · Codinho (implementação código de aplicação)

---
