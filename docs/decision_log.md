# Decision Log – Flag Haus / Julio Bandeiras

Versão inicial – 08/12/2025

Este documento registra decisões técnicas, operacionais e estratégicas do
projeto, seguindo o formato padrão de entradas numeradas. Cada entrada contém:
**Decisão, Contexto, Motivos e Impacto**.

---

## 001 — 2025-12-08

### Decisão: Adoção do WordPress como Plataforma Oficial do Site

**Contexto**\
Foram avaliadas alternativas: Squarespace, Wix, builders visuais e stack custom.
O projeto demanda escalabilidade, SEO técnico sólido, integrações futuras com
CRM e automações.

**Motivos**

- Maior flexibilidade para crescer no longo prazo.
- Suporte maduro para SEO, blog e integrações.
- Liberdade para customização de tema e automações futuras.
- Ecossistema modular consistente.

**Impacto**

- WordPress define toda a base do projeto.
- Documentação técnica (stack) orientada a WP.
- Facilita CRM leve, agendamentos, blog e automações.

---

## 002 — 2025-12-08

### Decisão: Definição das Páginas MUST HAVE, NICE TO HAVE e FOR LATER

**Contexto**\
Necessidade de estabilizar a arquitetura inicial do site antes de wireframes,
conteúdo e implementação.

**Motivos**\
Criar um escopo claro que permita construção incremental.

**Impacto**\
Base da arquitetura e backlog futuro estabilizados.

**MUST HAVE**

- Home
- Sobre
- Serviços
- Agendamento
- Blog
- Post Individual
- Contato
- Políticas (Privacidade + Termos)

**NICE TO HAVE**

- Serviços detalhados
- Depoimentos
- FAQ
- Landing Pages
- Press

**FOR LATER**

- Área do Cliente
- Loja
- Recursos Avançados
- Dashboard interno
- Formulários Inteligentes

---

## 003 — 2025-12-08

### Decisão: Embedding do Instagram na Home

**Contexto**\
O branding requer movimento, presença e frescor constante. A Home é o espaço
mais lógico.

**Motivos**

- Reforçar presença digital.
- Integrar conteúdo recorrente ao SEO.
- Permitir modularidade do layout.

**Impacto**\
Plugins definidos para avaliação: Smash Balloon ou Spotlight.

---

## 004 — 2025-12-08

### Decisão: Manter Página de Contato no Cabeçalho

**Contexto**\
Mesmo com redundância no rodapé, decisões de UX priorizam acesso rápido.

**Motivos**\
Reduz atrito de conversão e melhora experiência.

**Impacto**\
Contato é item fixo do menu principal.

---

## 005 — 2025-12-08

### Decisão: Políticas Como Links no Rodapé

**Contexto**\
Evitar poluição visual e manter conformidade legal.

**Motivos**\
Fica mais limpo, mais padrão e mais acessível.

**Impacto**\
Rodapé concentra informações institucionais essenciais.

---

## 006 — 2025-12-08

### Decisão: CRM Leve Interno via WordPress (FluentCRM ou Jetpack)

**Contexto**\
O projeto precisa capturar leads, tags, e armazenar contatos básicos para
automações futuras.

**Motivos**

- Leve, direto e já integrado ao WordPress.
- Evita stacks desnecessárias neste momento.
- Integra naturalmente com formulários e agendamento.

**Impacto**\
Supabase fica reservado para etapas avançadas.

---

## 007 — 2025-12-08

### Decisão: Agendamentos via Plugin WP (Amelia / Bookly / Calendly)

**Contexto**\
O site precisa permitir marcações reais, registrar informações e enviar dados
para CRM.

**Motivos**\
WordPress tem plugins sólidos que resolvem tudo sem stack externa.

**Impacto**\
Agendamento vira pilar funcional desde o lançamento.

---

## 008 — 2025-12-08

### Decisão: Padronizar Segurança Mínima (Firewall, 2FA, Backup e Limite de Login)

**Contexto**\
WordPress é alvo de robôs 24/7 e precisa de proteção mesmo sem usuários
externos.

**Motivos**

- Evitar invasão do painel admin.
- Proteger CRM e agendamentos.
- Garantir integridade dos dados.

**Impacto**\
Camada de segurança ativa desde a etapa de testes.

---

## 009 — 2025-12-08

### Decisão: Uso do Metabase como Ferramenta Oficial de Dashboards

**Contexto**\
O Looker foi rejeitado por limitações irritantes e decisões de design absurdas.

**Motivos**

- Metabase é flexível, amigável e escalável.
- Permite embed direto no site WordPress.
- Opera bem com GA4, Meta e CRM.

**Impacto**\
Stack de observabilidade definida para médio prazo.

---

## 010 — 2025-12-08

### Decisão: Estrutura Geral da Stack (Stack.md)

**Contexto**\
Criar documento único que consolida decisões técnicas.

**Motivos**

- Evitar perda de contexto.
- Padronizar evolução do projeto.
- Facilitar onboarding futuro.

**Impacto**\
Arquivo `stack.md` criado e vinculado ao repositório.

---

## 011 — 2025-12-08

### Decisão: Roadmap Técnico em 7 etapas

**Contexto**\
O site precisa se desenvolver incrementalmente sem perder coerência.

**Motivos**\
Definir trajetória realista entre MVP e maturidade.

**Impacto**\
Roadmap oficial: 1) MVP, 2) Landing pages, 3) Área do cliente, 4) Automações, 5)
Supabase, 6) Dashboard, 7) Loja.

---

## 012 — 2025-12-08

### Decisão: Embedding do Instagram como parte da estratégia de SEO

**Contexto**\
Os posts servirão como extensão do blog para reforçar presença e conteúdo
indexável.

**Motivos**

- Atualização orgânica de conteúdo
- Aproveitamento de copies existentes
- Sinergia com imagem FH

**Impacto**\
Home terá seção dinâmica alimentada pelo Instagram.

---

## 013 — 2026-01-25

### Decisão: Migração do domínio e ambiente WP para Hostinger (WordPress.org self‑hosted)

**Contexto**\
O projeto estava sendo configurado em WordPress.com, que exige plano Business
para uso de temas/plugins avançados (ex.: Astra, Elementor, Page Scroll to ID),
limitando a liberdade visual necessária para replicar referências como Saints
Tattoos e Bang Bang. Ao mesmo tempo, o domínio `flaghaus.art` já estava
registrado na Hostinger, mas apenas com DNS e e‑mail configurados, sem
instalação ativa de WordPress.org.

**Motivos**

- Eliminar a dependência de planos pagos do WordPress.com para recursos básicos
  de customização.
- Unificar domínio, hospedagem, DNS, e e‑mail na Hostinger, simplificando
  operação e suporte.
- Permitir uso pleno de tema base leve (Astra) + page builder (Elementor) + CPTs
  e plugins específicos (Instagram, Artistas, agendamento) alinhados à
  arquitetura do projeto.
- Evitar dívida técnica em cima de temas FSE limitados e de ambiente gerenciado
  pelo WordPress.com.

**Impacto**

- Instalação de um novo WordPress.org “limpo” na Hostinger, vinculado ao domínio
  `flaghaus.art`.
- DNS ajustado: registro A `@` apontando para o IP da hospedagem Hostinger
  (`185.245.180.219`), com propagação concluída e site já servindo o novo WP
  (tela padrão “Hello world”).
- WordPress.com deixa de ser o ambiente principal; passa a ser apenas uma conta
  legada, enquanto toda a evolução do site (tema, estrutura de páginas,
  branding, integrações) acontecerá exclusivamente no WordPress.org self‑hosted.
- Liberação de caminho para implementar o layout one‑page dinâmico, seção
  Artistas e embeds de Instagram exatamente como definido na arquitetura e no
  branding book.

---

## 014 — 2026-01-26

### Decisão: Abandono do Gutenberg/Astra para Layout e Motion; Adoção de Elementor + Tema Leve

**Contexto**\
Durante a implementação da Home, tornou-se evidente que a combinação Gutenberg +
Astra impõe restrições estruturais severas para layouts com camadas
independentes, backgrounds animados e motion contínuo. Mesmo soluções
tecnicamente corretas geraram fricção excessiva, baixa previsibilidade e alto
custo cognitivo, especialmente considerando o plano de incorporar múltiplas
animações ao longo do site.

**Motivos**

- Gutenberg não foi projetado para motion complexo nem para separação clara
  entre canvas visual e conteúdo.
- Astra introduz containers e regras implícitas que dificultam controle preciso
  de largura, overflow e camadas.
- O projeto Flag Haus tem motion como linguagem conceitual (tempo, gesto,
  presença), não como ornamento.
- Necessidade de preservar liberdade criativa futura sem lock-in rígido de
  animação.
- Redução deliberada de custo emocional e dívida técnica já nas primeiras etapas
  do projeto.

**Decisão**

- Adotar **Elementor como engine principal de layout**.
- Utilizar **tema Hello Elementor** como base neutra, sem estilos ou containers
  opinativos.
- Abandonar definitivamente Gutenberg para construção de layout da Home e
  páginas principais.
- Tratar motion como camada independente do conteúdo, garantindo flexibilidade e
  iteração futura.

**Impacto**

- Conteúdo textual foi extraído e documentado separadamente, preservando 100% do
  material.
- Layout e animações passam a ser reconstruídos sobre base previsível e
  escalável.
- O projeto ganha liberdade para evoluir visualmente sem reestruturações
  recorrentes.
- Redução significativa de risco de refatorações forçadas ao longo do roadmap.

---

## 2026-05-27 — CRM Flag Haus: decisões arquiteturais do schema base

### Contexto

Construção incremental do schema do CRM Flag Haus em Supabase hosted, projeto
`inuboxnkbtkvtxbupmqb`. Base para questionário de anamnese, página admin, e ETL
futuro com Google Ads.

### Decisões tomadas

**Entidade cliente: tabela única `people` com `lifecycle_stage`**

- Padrão consolidado em CRMs modernos (HubSpot, Attio, Folk) — pesquisa de
  benchmark feita em 26/05.
- Evita duplicação lead→cliente, simplifica FKs, permite análise longitudinal.
- Identidade frouxa: apenas `phone` obrigatório, demais atributos preenchidos
  incrementalmente.

**UUIDs v7 via função SQL pure (não extensão)**

- Extensão `pg_uuidv7` não disponível no Supabase hosted (em fila há +2 anos).
- Função `public.uuid_generate_v7()` implementada em SQL puro, performance
  equivalente.
- v7 escolhido sobre v4 pela ordenação temporal (melhor performance de índice
  B-tree).

**ENUMs Postgres (não TEXT + CHECK)**

- Decisão de rigidez: ENUM mostra intenção no schema, custo zero.
- Trade-off aceito: migration obrigatória pra adicionar valor novo (alinhado com
  "incremental sem dívida").
- Aplicado em `lifecycle_stage`, `job_status`, `user_role`. NÃO aplicado em
  `event_type` (mudaria muito).

**Geolocalização: dupla representação `lat/lng` + `geography`**

- PostGIS ativado desde o início, evita migração futura.
- Coluna `location` populada por trigger a partir de lat/lng.
- Mantém compatibilidade com ferramentas que esperam float, habilita queries
  espaciais (ST_DWithin, ST_Distance).

**`on delete` diferenciado por natureza da tabela**

- `jobs` → RESTRICT (negócio, protegido contra apagamento acidental).
- `lifecycle_transitions`, `identity_links`, `customer_segments_snapshot` →
  CASCADE (logs subordinados).
- `events` → SET NULL (histórico sobrevive ao apagamento pra análise temporal).

**`events` como tabela unificada (não separar funil de marketing)**

- Discriminador `event_type` com convenção `namespace.action` (ex:
  `funnel.first_contact`, `marketing.ad_click`).
- Payload livre em JSONB.
- Append-only (sem updated_at/deleted_at).
- Fronteira entre funil e marketing é ambígua na prática — separar criaria
  reconciliação desnecessária.

**Sem FK explícita de `user_roles.user_id` pra `auth.users`**

- Tabela `auth` é território Supabase, refator deles quebraria FK.
- Padrão recomendado pela própria doc Supabase.

**Sem trigger automático de `lifecycle_transitions`**

- Magia escondida descartada — inserção será explícita pela aplicação.
- Permite registrar `changed_by` e `reason` com contexto da camada de aplicação.

**Identificadores publicáveis vs sensíveis**

- Publishable key é segura por design, pode aparecer em frontend/docs.
- Direct connection string com senha = credencial root, deve ficar em `.env`
  (gitignored).
- Atualmente registrada com placeholder `[YOUR-PASSWORD]`.

**RLS habilitada sem policies (Leva 3 adiada)**

- 7 tabelas com `enable row level security` mas sem policies = banco fechado pra
  todos.
- Estado seguro pra continuar desenvolvimento solo.
- Adiamento consciente porque não há página admin nem usuários adicionais ainda
  — RLS protege contra terceiros, não contra o desenvolvedor solo.
- Leva 3 (policies + Auth Hook + cadastro de usuários) será atacada quando a
  página admin entrar (Bloco 4 do plano de junho).

### Não-decisões (deixadas em aberto)

- Critérios automáticos de transição entre lifecycle stages (ex: "lead → dormant
  após N dias sem evento"). Será definido quando houver volume mínimo de dados
  reais.
- Segmentação RFM concreta. `rfm_segment` está como TEXT por enquanto, vira ENUM
  quando os cortes estiverem cravados.
- Política de retenção/anonimização (LGPD). Soft delete via `deleted_at` está
  pronto; processo de anonimização pós-X meses fica pra depois.

### Fonte de verdade

SQL fonte vive no Supabase. Não versionado localmente por decisão consciente
(evita drift entre dois lugares).

---

## 2026-05-27 — Leva 0007: dados clínicos, consentimentos e motivações em tabelas separadas

### Contexto

Após aprovação do copy v2 dos questionários (`/anamnese` e `/cadastro`), foi
necessário decidir como persistir três naturezas distintas de dado: clínico
(sensível LGPD), consentimentos (registro legal), e motivações declaradas
(qualitativo). O princípio "incremental + zero dívida" exigiu decidir entre
enriquecer `extra_data` em `people` ou criar tabelas dedicadas.

### Decisões tomadas

**`clinical_records` como tabela separada de `people`**

- LGPD art. 5º trata dado de saúde como sensível — separação física tem vantagem
  regulatória clara (justificativa de coleta, retenção e apagamento mais
  auditável).
- Wide table com colunas nomeadas em vez de JSONB único: poucos campos (10),
  conhecidos, e auditoria se beneficia de tipos explícitos.
- Uma linha por anamnese preenchida = uma linha por job. Cliente recorrente
  acumula histórico (saúde muda entre sessões).
- `job_id` nullable: anamnese pode ser preenchida antes do job ser formalmente
  criado.
- Append-only (sem `updated_at`, sem `deleted_at`). LGPD: apagamento via
  processo explícito, não soft delete trivial.
- `on delete restrict` em `person_id`: protege contra apagamento acidental,
  exige fluxo deliberado de anonimização.

**`consents` como tabela única com discriminador**

- Uma tabela só (não uma por tipo), com ENUM `consent_type` ∈ {procedure, lgpd,
  image, marketing}.
- Append-only: cada renovação, revogação ou nova autorização vira linha nova.
  Consentimento atual = mais recente por `(person_id, consent_type)`.
- `granted BOOLEAN`: revogação também é evento registrado, não delete.
- `valid_until` nullable: comporta consentimentos eternos (procedure, marketing)
  e com expiração (LGPD anual recomendada).
- `job_id` nullable: procedure sempre tem job, marketing/lgpd nunca têm, image
  varia.
- `on delete restrict` em `person_id`: mesma lógica de clinical — registro legal
  sobrevive.

**`motivations` como tabela separada com `on delete cascade`**

- Diferente de clinical e consents — motivação é dado declarativo, não registro
  legal.
- `cascade` faz sentido: morre com a pessoa quando apagamento real acontece.
- Append-only: cliente recorrente acumula motivações ao longo da vida.
- `recorded_at` separado de `created_at`: permite registro retroativo via admin
  (motivação declarada em conversa, registrada depois).
- Sem schema interno no `content` por enquanto — texto livre. Quando houver
  massa crítica, considerar categorização / embedding / RAG.

**Não-decisão: `people.extra_data` permanece sem schema definido a priori**

- Tentativa de definir chave-por-chave agora foi descartada como
  overengineering.
- Convenção: backend grava em snake_case conforme campos do form v2.
- Promoção para colunas dedicadas só quando: (a) virar consulta frequente, (b)
  padrão de uso estabilizar, (c) houver volume suficiente pra justificar índice.
- Frente futura: RAG/embeddings sobre `extra_data` quando massa permitir.

**Padrão de `source` em texto livre (não ENUM) em `consents` e `motivations`**

- Origens podem crescer organicamente (futuras integrações: bot WhatsApp,
  importação manual, etc).
- Convenção documentada nos comments da coluna; ENUM seria rigidez sem ganho.

**Padrão de relacionamento com `jobs`**

- `clinical_records.job_id` → `on delete set null` (histórico clínico sobrevive
  a job apagado).
- `consents.job_id` → `on delete set null` (consentimento sobrevive).
- `motivations.job_id` → `on delete set null` (motivação sobrevive ao job, mas
  morre com pessoa).

### Fonte de verdade

SQL fonte no Supabase. Copy aprovado em `docs/copy_anamnese_v2_consolidado.md`.

---

## 2026-05-31 — Features pendentes de Ativação de Base

Capturadas via feedback de Julio e Amanda no grupo durante revisão dos preview
HTMLs dos questionários:

- **Desconto de aniversário**: cliente recebe gatilho automatizado no mês do
  aniversário. Depende de `birth_date` populado e camada de automação (Frente 4
  do plano de junho).
- **Programa de fidelidade por contagem**: desconto a cada N tatuagens
  executadas. Depende de `jobs.status = 'executed'` populado e contagem por
  `person_id`.

**Decisão:** não implementar agora. Capturar como gatilhos da Frente 4 (Ativação
de Base), a ser destravada após CRM populado e admin operacional. Risco
mitigado: arquitetura atual já comporta os dois sem refator.

---

# Decision #015 — 2026-06-17

## Stack de aplicação migra para Next.js + Vercel; WordPress entra em modo legado

### Contexto

A decisão #014 (08/12/2025) consolidou Elementor + Hello Elementor como engine
de layout do site Flag Haus, rodando em WordPress hospedado na Hostinger. A
decisão #006 (anterior) reservou Supabase para fases avançadas e CRM leve via
FluentCRM/Jetpack.

Entre janeiro e maio/2026, três coisas aconteceram em paralelo:

1. **O tema real divergiu da decisão.** Audit do servidor (10/02/2026,
   `system-info-flaghaus.art-10-02-2026.txt`) confirmou Astra 4.12.1 rodando em
   produção, não Hello Elementor. A decisão #014 não foi executada.
2. **O CRM avançou em Supabase nativo.** Entre 27/05 e 31/05, foi construído
   schema completo (10 tabelas + ENUMs + RLS habilitada) no Supabase hosted
   `inuboxnkbtkvtxbupmqb` — não em FluentCRM. Decision_log dessa fase documenta
   o avanço.
3. **Os formulários `/antes-da-sessao` e `/cadastro` precisam de UX que
   WordPress + plugins não entregam sem hack.** Lógica "telefone como chave +
   pula o que já tem" exige lookup server-side em Supabase, validação Zod, e
   fluxo multi-step com state — combinação que Fluent Forms ou similar não
   comporta sem solução paliativa.

A decisão #014 está superada na prática. Mantê-la como vigente é dívida
documental.

### Decisão

A partir desta entrada:

- **Aplicação canônica = Next.js 15 (App Router, TypeScript) deployed via
  Vercel.**
- **Domínio operacional do CRM = `cadastro.flaghaus.art`** (subdomínio Vercel
  via CNAME no DNS Hostinger).
- **WordPress (`flaghaus.art`) entra em modo legado.** Permanece no ar como hoje
  (Astra + Elementor + plugins atuais), sem refator, sem migração forçada. Será
  substituído incrementalmente quando cada peça migrada justificar o esforço.
- **Tema "Hello Elementor" sai do plano.** Astra fica como está enquanto
  WordPress estiver no ar; nenhuma migração de tema vai ser feita.
- **Decisão #014 fica registrada como histórica e superada.** Não é apagada — o
  histórico importa pra entender por que chegamos aqui.

### Implicação prática

- Repo `Gattiboni/flag-haus` passa a hospedar aplicação Next.js além da
  documentação.
- DNS Hostinger ganha CNAME `cadastro` apontando pra Vercel.
- WordPress continua editável pelo Julio/Alan via painel, sem mudança.
- Migração progressiva do site institucional pra Next.js é pauta aberta, sem
  prazo. Cada peça que justifique migrar (página de captura, blog, portfólio
  dinâmico) vira decisão própria quando chegar a hora.

### Custo aceito

- Manter duas "casas" técnicas (WordPress + Next.js) durante a transição.
- Gerenciar dois deploys distintos (Hostinger pra WP, Vercel pra app).

Mitigação: a separação física protege uma casa quando a outra mexer. Quando o
WordPress for ser substituído de vez, Next.js já estará maduro pra absorver
tudo.

### Fonte de verdade

Aplicação: `src/` do repo `Gattiboni/flag-haus`. Documentação operacional:
`readme.md` do repo (atualizado nessa mesma data).

---

# Decision #016 — 2026-06-17

## CRM canônico é Supabase nativo; FluentCRM/Jetpack sai do plano

### Contexto

A decisão #006 (08/12/2025) escolheu CRM leve via WordPress (FluentCRM ou
Jetpack CRM), com Supabase reservado para "etapas avançadas". O racional na
época era evitar complexidade prematura.

Entre 26/05 e 31/05/2026, o CRM avançou em Supabase nativo, não em FluentCRM.
Foram construídas 10 tabelas (people, jobs, lifecycle_transitions,
identity_links, events, user_roles, customer_segments_snapshot,
clinical_records, consents, motivations) com ENUMs, função UUIDv7 SQL pura,
PostGIS, triggers de updated_at, e RLS habilitada (sem policies, adiadas
conscientemente pra fase do admin).

A motivação foi:

- **Modelagem rica do domínio.** Cliente recorrente, anamnese por sessão,
  consentimentos por categoria, ativação de base por RFM, snapshot mensal da
  carteira — nada disso cabe em FluentCRM sem hack significativo.
- **Auditabilidade LGPD.** Dados clínicos em tabela separada
  (`clinical_records`), consentimentos append-only (`consents`) — estrutura que
  protege o estúdio juridicamente. Plugin CRM em WordPress não entrega essa
  separação física.
- **Integração futura com Google Ads.** O schema comporta resolução
  `anonymous_id ↔ person_id` via `identity_links`, preparando ETL futuro do
  Google Ads. FluentCRM não tem essa arquitetura de identidade frouxa.

### Decisão

A partir desta entrada:

- **CRM canônico do Flag Haus = banco Postgres em Supabase hosted
  (`inuboxnkbtkvtxbupmqb`).**
- **FluentCRM, Jetpack CRM, e similares saem definitivamente do plano.** Mesmo
  no curto prazo.
- **Decisão #006 fica registrada como histórica e superada.** Mantida no log pra
  contexto.

### Implicação prática

- Qualquer dado de cliente (cadastro, anamnese, consentimento, motivação, job)
  vive no Supabase.
- Página admin do Julio (Bloco 4 do plano de junho) será aplicação web própria
  conectada ao Supabase via RLS — não plugin WordPress.
- Reativação de base, automações, e features futuras (voucher aniversário,
  fidelidade) serão construídas como camadas sobre o Supabase, não como
  funcionalidades de plugin.

### Sobre o site institucional

WordPress continua sendo o que é hoje (vitrine institucional). Eventual captura
de leads pelo site WordPress não precisa virar dado FluentCRM — pode disparar
webhook pra endpoint Next.js que escreve no Supabase. Decisão de como/quando
ligar essa ponte fica em aberto até justificar.

### Fonte de verdade

Schema: `docs/schema_supabase_*.md` (dumps datados). Documentação de tabelas:
comentários SQL nas próprias tabelas + `changelog.md`.

---

# Decision #017 — 2026-06-17

## Supabase é estado presente do projeto, não fase futura

### Contexto

Documentos de stack e arquitetura redigidos em dezembro/2025 (`docs/stack.md`
§8.3, `docs/arquitetura.md` §9) tratam Supabase como "fase futura, fora do MVP".
Esses textos ficaram desatualizados após a construção do schema CRM (27/05/2026
em diante).

O graphify rodado em 17/06/2026 detectou essa contradição como AMBIGUIDADE entre
documentos:

- `stack.md` e `arquitetura.md` (dez/2025): Supabase como horizonte
- `decision_log.md` e `changelog.md` (mai/2026): Supabase como sistema
  operacional, com 10 tabelas construídas e RLS habilitada

Mantém-se a documentação desatualizada e o projeto cresce com duas versões da
verdade.

### Decisão

A partir desta entrada:

- **Supabase é estado presente do projeto, não fase futura.**
- **`docs/stack.md` e `docs/arquitetura.md` serão revisados** para refletir o
  estado real. A revisão pode ser feita em PR específico, sem urgência, mas
  precisa acontecer antes do próximo onboarding de qualquer pessoa (humana ou
  IA) ao projeto.
- **Quando houver conflito entre `stack.md`/`arquitetura.md` (dez/2025) e
  `decision_log.md` (mai/2026 em diante), o decision_log prevalece** até a
  revisão dos primeiros.

### Implicação prática

- Onboarding de qualquer novo agente (Claudinho-arquiteto em nova sessão,
  contratado, etc.) começa por `decision_log.md` e `changelog.md`, não pelos
  docs antigos de stack.
- Próxima revisão substancial de `stack.md` deve incluir: seção "Banco e
  backend" cobrindo Supabase, seção "Aplicação" cobrindo Next.js (decisão #015),
  e remoção/atualização de §8.3.
- README do projeto (já atualizado nessa data) já reflete a realidade — usar
  como referência rápida.

### Custo aceito

- Documentos antigos ficam desatualizados temporariamente, com aviso explícito
  (esta entrada serve como aviso oficial).
- Risco mitigado: agentes que consultem o decision_log antes dos docs de stack
  vão pegar a versão correta.

### Fonte de verdade

Estado real: `docs/decision_log.md` + `docs/changelog.md` + `readme.md` raiz.
Estado documentado a revisar: `docs/stack.md`, `docs/arquitetura.md`.

---

# Decision log — entradas novas

**Cola no topo de `docs/decision_log.md`, abaixo do header existente, na ordem
em que aparecem aqui.**

---

## Decision #015 — 2026-06-17

### Stack de aplicação migra para Next.js + Vercel; WordPress entra em modo legado

**Contexto.** A decisão #014 (08/12/2025) consolidou Elementor + Hello Elementor
como engine de layout, rodando em WordPress hospedado na Hostinger. Entre
janeiro e maio/2026, três coisas aconteceram em paralelo: (1) audit do servidor
(10/02/2026) confirmou Astra 4.12.1 rodando, não Hello Elementor — decisão #014
não foi executada; (2) o CRM avançou em Supabase nativo entre 27/05 e 31/05 (10
tabelas + RLS); (3) os formulários `/antes-da-sessao` e `/cadastro` precisam de
UX que WordPress + plugins não entregam sem hack (lookup server-side em
Supabase, validação Zod, multi-step com state). Decisão #014 está superada na
prática.

**Decisão.**

- Aplicação canônica = Next.js 15+ (App Router, TypeScript) deployed via Vercel.
- Domínio operacional do CRM = `cadastro.flaghaus.art` (subdomínio Vercel via
  CNAME no DNS Hostinger).
- WordPress (`flaghaus.art`) entra em modo legado: permanece no ar como hoje
  (Astra + Elementor + plugins atuais), sem refator, sem migração forçada.
  Substituído incrementalmente quando cada peça migrada justificar o esforço.
- Tema "Hello Elementor" sai do plano. Astra fica enquanto WordPress estiver no
  ar.
- Decisão #014 fica registrada como histórica e superada. Não é apagada.

**Implicação prática.** Repo `Gattiboni/flag-haus` passa a hospedar aplicação
Next.js além da documentação. DNS Hostinger ganha CNAME `cadastro` apontando pra
Vercel. Migração progressiva do site institucional pra Next.js é pauta aberta,
sem prazo.

**Custo aceito.** Duas "casas" técnicas (WordPress + Next.js) durante a
transição. Mitigação: separação física protege uma casa quando a outra mexer.

**Fonte de verdade.** Aplicação: `src/` do repo. Documentação operacional:
`readme.md`.

---

## Decision #016 — 2026-06-17

### CRM canônico é Supabase nativo; FluentCRM/Jetpack sai do plano

**Contexto.** A decisão #006 escolheu CRM leve via WordPress (FluentCRM ou
Jetpack CRM), com Supabase reservado para "etapas avançadas". Entre 26/05 e
31/05/2026, o CRM avançou em Supabase nativo, não em FluentCRM — 10 tabelas com
ENUMs, função UUIDv7 SQL pura, PostGIS, RLS habilitada. Motivações: modelagem
rica do domínio (lifecycle stages, anamnese por job, consentimentos por
categoria, RFM), auditabilidade LGPD (dados clínicos em tabela separada,
consentimentos append-only), e preparação pra integração futura com Google Ads
(resolução `anonymous_id ↔ person_id` via `identity_links`).

**Decisão.**

- CRM canônico do Flag Haus = banco Postgres em Supabase hosted
  (`inuboxnkbtkvtxbupmqb`).
- FluentCRM, Jetpack CRM, e similares saem definitivamente do plano.
- Decisão #006 fica registrada como histórica e superada.

**Implicação prática.** Qualquer dado de cliente vive no Supabase. Página admin
do Julio será aplicação web própria conectada via RLS — não plugin WordPress.
Reativação de base, automações, e features futuras (voucher aniversário,
fidelidade) serão camadas sobre o Supabase.

**Sobre o site institucional.** WordPress continua vitrine institucional.
Eventual captura de leads pelo site WP pode disparar webhook pra endpoint
Next.js que escreve no Supabase — decisão de quando ligar essa ponte fica em
aberto.

**Fonte de verdade.** Schema: `docs/schema_supabase_*.md`. Documentação de
tabelas: comentários SQL + `changelog.md`.

---

## Decision #017 — 2026-06-17

### Supabase é estado presente do projeto, não fase futura

**Contexto.** `docs/stack.md` §8.3 e `docs/arquitetura.md` §9 (ambos de
dez/2025) tratam Supabase como "fase futura, fora do MVP". Esses textos ficaram
desatualizados após a construção do schema CRM (27/05/2026 em diante). Graphify
rodado em 17/06/2026 detectou a contradição.

**Decisão.**

- Supabase é estado presente do projeto, não fase futura.
- `docs/stack.md` e `docs/arquitetura.md` serão revisados pra refletir o estado
  real. Sem urgência, mas antes do próximo onboarding de qualquer pessoa (humana
  ou IA) ao projeto.
- Quando houver conflito entre `stack.md`/`arquitetura.md` (dez/2025) e
  `decision_log.md` (mai/2026 em diante), o decision_log prevalece até a
  revisão.

**Implicação prática.** Onboarding começa por `decision_log.md` e
`changelog.md`, não pelos docs antigos. Próxima revisão de `stack.md` inclui:
seção "Banco e backend" (Supabase), seção "Aplicação" (Next.js, decisão #015),
remoção/atualização de §8.3.

**Fonte de verdade.** Estado real: `decision_log.md` + `changelog.md` +
`readme.md` raiz. A revisar: `stack.md`, `arquitetura.md`.

---

## Decision #018 — 2026-06-17

### Tailwind v4 adotado (em vez de v3 da spec literal)

**Contexto.** Spec #2 (T6) escreveu `globals.css` com sintaxe Tailwind v3
(`@tailwind base/components/utilities` + `@layer base`).
`create-next-app@latest` instalou Tailwind v4 — estável corrente, alinhado com
pedido da spec ("usar a estável corrente"). Códigos v3 e v4 são incompatíveis na
linha de import. Codinho topou na divergência durante execução e parou pra
decisão.

**Decisão.** Adaptar `globals.css` pra v4: primeira linha vira
`@import "tailwindcss";`. CSS vars, paleta, fontes, e estilos base dentro de
`@layer base { ... }` ficam idênticos em conteúdo. Resultado visual idêntico ao
planejado.

**Justificativa.** Coerência com a spec (estável corrente), zero dívida de
upgrade futuro, sem impacto visual. Erro estava na sintaxe literal da spec —
corrigido aqui sem alterar arquitetura.

**Anotação de processo.** Para Spec #3 em diante, validar versão atual de cada
dependência antes de escrever sintaxe específica.

---

## Decision #019 — 2026-06-17

### Rota `/__health` implementada via pasta `%5F%5Fhealth`

**Contexto.** Spec #2 (T7) definiu rota `/__health` com pasta de mesmo nome.
Next.js App Router trata pasta com underscore inicial como _private folder_
(excluída do roteamento) — resultando em 404. Codinho topou na execução e parou
pra decisão.

**Decisão.** Pasta no disco renomeada para `%5F%5Fhealth` (URL-encode do
underscore literal — mecanismo oficial Next.js). URL pública continua exatamente
`/__health`. DNS, critério de aceite, e documentação não mudam.

**Justificativa.** Mantém URL acordada na spec, sem retrabalho em documentação.
Sinalização "rota técnica" via duplo underscore é preservada. Resolução é
mecanismo documentado, não hack.

**Anotação de processo.** Para Spec #3 em diante, validar convenções de
roteamento do Next.js (underscores, parênteses, colchetes) antes de escrever
caminhos de pasta.

---

_(Novas entradas devem seguir este mesmo formato.)_
