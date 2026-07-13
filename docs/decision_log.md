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

## Decision #020 — 2026-06-17

### RLS com deny explícito + acesso aos dados exclusivamente via Server Actions com service_role

**Contexto.** Spec #2 fechou em produção (Next.js + Vercel + Supabase + domínio
`cadastro.flaghaus.art`). A rota `/__health` confirmou conexão Vercel ↔ Supabase
usando a publishable key (`anon`), retornando `count: 0` em `people`. O
comportamento atual — RLS habilitada sem policies — é equivalente a deny-all
implícito para `anon` e `authenticated`. Funciona, mas é ambíguo: o Supabase
Advisor sinaliza "tabela com RLS mas sem policies" como warning, e qualquer
agente futuro (humano ou IA) pode "consertar" criando policy errada por
bem-querer.

Spec #3 vai precisar de leitura e escrita real nas tabelas
(`SELECT * FROM people WHERE phone = :input`, INSERTs em `people`,
`clinical_records`, `consents`, `motivations`). Duas formas honestas de fazer
isso foram avaliadas:

- **(A)** Policy ampla na publishable key — qualquer um com a URL + anon key
  lista clientes. Simples, mas viola LGPD na prática.
- **(B)** Acesso aos dados exclusivamente server-side, via Server Actions
  Next.js usando `SUPABASE_SERVICE_ROLE_KEY` (privada, nunca exposta ao
  browser). RLS continua deny-all pra `anon` e `authenticated`. Cliente browser
  nunca lê/escreve direto no Supabase.

**Decisão.**

Adotada a **opção (B)**:

- Acesso a dados de cliente acontece **somente via Server Actions** server-side
  com `SUPABASE_SERVICE_ROLE_KEY`.
- Cliente browser **nunca** consulta Supabase direto. Cliente browser fala com
  Next.js (Server Action), Next.js fala com Supabase.
- RLS configurada com **deny explícito** pra `anon` e `authenticated`. Migration
  `explicit_deny_anon_authenticated` aplicada — 40 policies (4 por tabela × 10
  tabelas) com regra `false`. Mudança de forma, não de comportamento.
- `service_role` continua com bypass nativo (configuração padrão Supabase).
- Env var `SUPABASE_SERVICE_ROLE_KEY` adicionada em `.env.local` (gitignored) e
  Vercel (Production, Preview, Development).
- A `SUPABASE_SERVICE_ROLE_KEY` **nunca** recebe prefixo `NEXT_PUBLIC_` — esse
  prefixo expõe a var no browser, e essa key não pode chegar lá.

**Justificativa.**

- **LGPD.** Dados pessoais não podem ser listados por qualquer um com a
  publishable key (que é pública por design). Manter `anon` em deny-all garante
  isso.
- **Auditabilidade.** Toda leitura/escrita passa por Server Action, onde dá pra
  logar, validar, e aplicar regras de negócio antes da query. Cliente browser
  não consegue burlar.
- **Zero dívida.** Policies explícitas de deny silenciam advisors e protegem
  contra modificações equivocadas futuras. Quando o admin do Julio existir
  (Bloco 4), as policies de `authenticated` serão substituídas por regras reais
  — momento em que essa substituição vai ser deliberada e versionada.
- **Princípios respeitados.** Incremental (não muda nada existente), modular
  (Server Actions separadas por domínio), zero dívida (intenção explícita, nada
  implícito).

**Implicação prática para Spec #3.**

- Server Actions ficam em `src/app/actions/` ou similar — server-only, sem
  `'use client'`.
- Cliente Supabase server-side passa a usar `SUPABASE_SERVICE_ROLE_KEY` em vez
  de `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` quando a operação envolver dados de
  cliente.
- `src/lib/supabase/server.ts` permanece pra operações públicas; cria
  `src/lib/supabase/admin.ts` (ou similar) pra operações privilegiadas com
  service_role.
- Rota `/__health` será migrada na Spec #3a pra usar o cliente privilegiado
  (pequena melhoria de coerência).

**Fonte de verdade.**

Policies vivas no Supabase. Migration registrada via MCP em 17/06/2026. Mudanças
futuras seguem o mesmo padrão: dryrun → aprovação → apply_migration →
verificação.

---

## Decision #021 — 2026-07-05

### Escrita do form /cadastro é atômica via RPC transacional no Postgres

**Contexto.** O submit do `/cadastro` grava em 4 tabelas: `people` (upsert),
`consents` (insert), `motivations` (insert condicional) e `events` (insert).
Fazer isso como 4 chamadas sequenciais do client Supabase abre janela para
estado parcial — pessoa atualizada sem consentimento LGPD gravado, por exemplo,
se a terceira chamada falhar. Isso é dívida técnica direta.

**Decisão.** Toda a escrita acontece numa única função Postgres,
`submit_cadastro(payload jsonb)`, aplicada via migration. A função roda em
transação implícita (bloco plpgsql): ou grava tudo, ou nada. A Server Action
`submitCadastro` valida com Zod, monta o payload e faz uma única chamada
`supabase.rpc('submit_cadastro', ...)`. Nenhum insert direto do client.

**Semântica cravada.** Campo `null` no payload preserva o valor existente.
`extra_data` faz merge (só chaves enviadas atualizam). `identified_at` recebe
`now()` no primeiro cadastro (se null). `lifecycle_stage` não é tocado pelo form
(assunto do admin, Bloco 4). Consentimentos são append-only. Evento gravado:
`form.cadastro_submitted` com `mode` (new/returning) no payload.

**Segurança.** `revoke execute ... from public, anon, authenticated` +
`grant execute ... to service_role`. Só a Server Action (que usa o admin client)
chama a função. Coerente com a decisão #020 (acesso a dados exclusivamente
server-side).

**Justificativa.** Zero dívida (sem estado parcial possível), auditável (um
ponto de escrita), modular (a Server Action não conhece a estrutura das 4
tabelas, só o contrato do payload). Testada via MCP antes da implementação:
insert, upsert com null-preserva e extra_data-merge, consents append-only,
trigger PostGIS sincronizando.

---

## Decision #022 — 2026-07-05

### Telefone canônico é E.164 internacional; primeira dependência de terceiro (libphonenumber-js)

**Contexto.** A #3a normalizava telefone para dígitos BR puros (`^\d{10,11}$`),
assumindo base 100% brasileira. Dois fatos quebram a premissa: (1) a base do
Julio inclui clientes internacionais, e o disparo retroativo precisa alcançá-los
— BR-only os barra no step do telefone; (2) a validação por contagem de dígitos
aceitava números inválidos (ex. `1198334157`, 10 dígitos, passava). Corrigir
depois exigiria migração de dados com risco de duplicata (`11983340447` vs
`+5511983340447` como duas pessoas).

**Decisão.** Formato canônico do telefone passa a ser E.164 (`+5511983340447`).
A validação e a formatação usam `libphonenumber-js` — primeira dependência de
terceiro do projeto. O import é feito pelo subpath `/max` (metadata completa com
padrões nacionais); a metadata `min` valida só comprimento e foi a causa de
números inválidos passarem. `toE164(input, country)` substitui as funções
BR-only. As Server Actions ganham parâmetro `country` (default `BR`). A RPC foi
migrada para aceitar `^\+[1-9]\d{7,14}$`. Seeds migrados para E.164.

**Por que uma dependência.** Validação de telefone por país é um problema
resolvido e cheio de casos-limite (padrões nacionais, tipos de linha,
comprimentos variáveis por país). Reimplementar seria gambiarra com cobertura
pior. O princípio "zero dívida" aqui aponta para usar a lib madura, não contra.

**UI.** Componente `PhoneField` com seletor de país (BR primeiro e default). A
bandeira do país está como emoji derivado do código ISO (sem asset), mas **não
renderiza no Windows/Chrome** — mostra "BR" em vez de 🇧🇷. Substituição por
bandeiras SVG fica anotada para a Spec #3c (junto do refinamento visual). Não é
bloqueante — o seletor funciona, só está feio.

**Justificativa.** Feito agora porque o custo é mínimo (banco só com seeds) e
adiar criaria migração + duplicatas. Incremental (não quebra o que existe —
`findPersonByPhone` segue retrocompatível), modular (PhoneField/toE164 reusáveis
na 3c), zero dívida (formato correto desde o primeiro dado real).

---

## Decision #023 — 2026-07-13

### Geocoding vira cadeia de providers plugáveis; gate de idade obrigatório no `/cadastro`; cidade obrigatória, bairro opcional

**Contexto.** Três problemas apareceram juntos no teste da #3b em produção, e os
três tinham a mesma raiz — dado geográfico e etário sendo tratado como
acessório.

1. **A geolocalização nunca funcionou.** O campo cidade nascia com default
   `'São Paulo'` no state, e `GeoFields` só gravava a cidade retornada pelo
   `reverseGeocode` quando `!city.trim()`. Como `city` nunca estava vazio, o
   retorno do geocoder era descartado silenciosamente. O `"São Paulo"` que
   aparecia na tela era o default, não o resultado da geolocalização. Efeito
   colateral já materializado no banco: o seed `+5511900000003` tinha
   `neighborhood = "São Paulo"` gravado.
2. **A fonte de bairro era incompleta.** Teste empírico sobre 5 coordenadas: a
   BigDataCloud devolve `adminLevel >= 9` apenas para bairros que também são
   subprefeituras (Vila Mariana, Pinheiros). Para República, Sé/Centro e
   Copacabana, não devolve nada nesse nível. O código estava correto — a fonte é
   que não cobria. O Nominatim (OSM) resolveu 5/5 no mesmo teste.
3. **Data de nascimento era opcional.** Insustentável em três eixos: legal
   (tatuagem é maior de 18), LGPD (consentimento de menor é inválido) e produto
   (CRM sem data de nascimento não faz reativação por aniversário nem análise
   etária da base).

**Decisão — geocoding.** `reverseGeocode` passa a ser um orquestrador sobre uma
lista ordenada de providers que implementam a interface `GeoProvider`. Nominatim
é o primário; BigDataCloud, o fallback. Cada provider tem timeout próprio (5s
via `AbortController`); erro ou timeout de um nunca propaga — loga e passa ao
seguinte. O guard `bairro ≠ cidade` é aplicado sobre o resultado de cada
provider, não dentro deles. Trocar, adicionar ou remover fonte não toca em
nenhum componente de UI.

**Decisão — autocomplete.** Bairro e cidade ganham autocomplete via **Photon**
(`photon.komoot.io`), não via Nominatim. A política de uso do Nominatim
desencoraja `search-as-you-type`, e um bloqueio por abuso derrubaria também o
reverse geocoding, que depende do mesmo serviço — providers separados garantem
falhas isoladas. O Photon é feito para type-ahead, usa os mesmos dados OSM
(logo, resultados coerentes com o reverse geocoding) e não exige API key. Google
Places foi descartado: resolveria, mas exige key exposta no client e billing
ativo, para um ganho que o Photon já entrega.

O resultado cru do Photon é inutilizável — `"Repúb"` devolve cinco países,
`"Camp"` devolve um condado do Texas. O filtro por `osm_value` (whitelist
separada para bairro e cidade) é parte obrigatória do adaptador, não um detalhe
de UI. Autocomplete nunca é gate: digitação livre é sempre aceita.

**Decisão — gate de idade.** `birth_date` passa a ser **obrigatório na
aplicação** (front + Zod server-side, com `refine` de idade ≥ 18) e permanece
**nullable no banco**. O step entra logo **após o telefone e o reconhecimento**,
não antes.

- _Por que depois do telefone:_ o eixo do design é "pula o que já tem". Gate
  antes do telefone forçaria todo returning a redigitar uma data que já está no
  banco, quebrando o princípio central por ganho zero. Depois do telefone, o
  returning com data válida passa em silêncio; só quem não tem data é
  perguntado.
- _Por que "sem capturar dado" continua verdadeiro:_ o submit é único, no final,
  via RPC. Ler o telefone (`findPersonByPhone`) não grava nada. Menor de 18
  abandona no gate e o banco nunca soube que ele existiu — comprovado em β (seed
  `...005`: 0 eventos, 0 consentimentos, `updated_at = created_at`).
- _Por que nullable no banco:_ `lifecycle_stage` já nasce como `'lead'` por
  default, e a finalidade do CRM é fechar o loop contato → orçamento → job. Um
  lead vindo de clique de WhatsApp tem telefone e nada mais. `NOT NULL` em
  `birth_date` proibiria o banco de registrar exatamente o lead que ele foi
  construído para rastrear. O gate garante que ninguém _completa o formulário_
  sem data; o banco continua podendo guardar um lead cru.

**Decisão — cidade obrigatória, bairro opcional.** Cidade é a unidade analítica
mínima da base: bairro sem cidade é ambíguo (há homônimos), e a pergunta de
negócio — quem é de perto, quem vem de longe — se responde na cidade. Bairro é
refinamento dentro dela, e nenhuma fonte de geocoding garante bairro em 100% dos
casos; exigir o que a fonte não entrega convida o usuário a inventar.

**Nota sobre LGPD.** Cogitou-se justificar a obrigatoriedade da cidade pela
LGPD. Não se sustenta, e o argumento é o inverso: a LGPD governa se o dado _pode
ser tratado_ (resolvido pela tabela `consents`), não se ele _deve ser
fornecido_. O princípio da necessidade (Art. 6º, III) empurra para coletar o
mínimo necessário à finalidade, e condicionar o cadastro a um dado dispensável
enfraqueceria a própria validade do consentimento — que precisa ser livre. A
obrigatoriedade da cidade se justifica por **necessidade de produto**, não por
lei.

**Custo aceito.** Nominatim e Photon são serviços comunitários, gratuitos e sem
SLA. O volume atual (uma chamada por preenchimento de formulário, disparada por
clique) está dentro das políticas de uso. Se houver bloqueio, a arquitetura de
adaptadores permite trocar a fonte sem tocar em UI, e o caminho de contingência
é proxiar via Server Action (que permite `User-Agent` identificável). Não é
necessário agora.

**Justificativa.** Incremental — nenhuma migration, nenhuma dependência nova,
`reverseGeocode` mantém a assinatura de consumo. Modular — providers de reverse
geocoding e de autocomplete são adaptadores plugáveis e independentes entre si.
Zero dívida — o dado geográfico e etário nasce correto antes do primeiro
registro real; corrigir depois exigiria limpeza de base e reenvio de formulário
para clientes reais.

---

## Decision #024 — 2026-07-13

### O banco passa a ser versionado por autodescoberta (MOAS); índice único de idempotência em `jobs`

**Contexto.** Ao preparar a Spec #3c, foi preciso consultar o DDL de
`clinical_records` e `jobs` — e não havia onde. O repo não descrevia o banco. A
consulta a `supabase_migrations.schema_migrations` revelou apenas 4 entradas,
todas posteriores a 30/06: o schema base (10 tabelas, 4 enums, PostGIS,
`uuid_generate_v7()`), criado em 27/05, **não existe como migration em lugar
nenhum**. Vive apenas dentro do projeto Supabase.

Some-se a isso que SQL rodado pelo SQL Editor não entra no `schema_migrations` —
só o que passa pelo CLI. Ou seja: cada correção pontual no banco aumentava a
distância entre o repo e a realidade, em silêncio.

**Decisão — MOAS.** Um script Node (`scripts/moas.mjs`) conecta no Postgres,
consulta `pg_catalog`/`information_schema` e emite dois artefatos: `schema.md`
(para ler) e `schema.sql` (para executar). **Zero hardcoding**: o script não
conhece o nome de nenhuma tabela, coluna, função ou tipo — ele pergunta ao banco
o que existe. Tabela nova aparece nos snapshots sem tocar no script.

Um hook de `pre-push` regenera e compara; se divergir, barra o push. Ele **não
commita sozinho** — hook que commita tira do humano o controle do que entra no
repo.

**Determinismo é requisito duro, não detalhe.** Nada de timestamp de geração,
tamanho de tabela, contagem de linhas ou estatística de vacuum nos snapshots.
Tudo isso muda sozinho, sujaria o diff a cada push, e um hook que dispara sempre
é um hook que todos aprendem a ignorar. Só entra o que muda quando **alguém
altera o schema**. Comprovado por hash em runs consecutivos.

**Decisão — `.mjs`, não `.ts`.** TypeScript exigiria uma segunda dependência
(`tsx`) ou type-stripping experimental. O script vive fora do app e não
compartilha tipo nenhum com `src/`. Uma dependência (`pg`), em
`devDependencies`, e só.

**Decisão — TLS verificado (`verify-full`).** O que trafega é a senha do
superuser do banco. `sslmode=no-verify` encripta mas não verifica a identidade
do servidor — aceitar MITM invisível para economizar cinco linhas não passa em
"zero dívida". A CA (`certs/prod-ca-2021.crt`, pública) é pinada via
`ssl: { ca }`. CA ausente é **erro fatal, sem fallback**: degradar segurança em
silêncio é a gambiarra clássica.

_Achado técnico:_ incluir `?sslmode=require` na connection string faz o `pg`
construir um objeto `ssl` próprio que **sobrepõe** o `{ ca }` passado em código,
caindo nas CAs do sistema — onde a raiz do Supabase não está. O parâmetro que
deveria reforçar a verificação, na prática a enfraquecia. O script remove os
parâmetros de SSL da URL em runtime e deixa o `{ ca }` mandar sozinho.

**Decisão — índice único de idempotência.** A Spec #3c cria um `job` a cada
submit da anamnese. Sem chave de idempotência, um reenvio (retry de rede, aba
reaberta) criaria job duplicado, `clinical_record` duplicado e consent
`procedure` duplicado — e o lock síncrono do client (#023) só cobre
duplo-clique.

Descartada a heurística "reusa job em `quoted` das últimas 24h" (constante
mágica = gambiarra). Adotado `submission_id`: uuid gerado no mount do
formulário, gravado em `jobs.extra_data.submission_id`, com índice único parcial
(`jobs_submission_id_unique`,
`where extra_data ? 'submission_id' and deleted_at
is null`). Mesmo formulário
reenviado → mesmo id → mesmo job. Link reaberto de propósito → id novo → job
novo, que é o comportamento correto.

O índice é a **garantia**; o **comportamento** (`on conflict do nothing` +
recuperar o job existente) vem na RPC da #3c.

**Alvo do `schema.sql`.** Não é um Postgres vanilla — os `grant` referenciam
`anon`, `authenticated` e `service_role`, e as extensões vêm do catálogo
Supabase. O alvo é **um projeto Supabase novo e vazio**, que é o cenário real de
desastre. O cabeçalho do arquivo declara isso.

**Custo aceito — o `schema.sql` nunca foi executado.** O teste de replay foi
dispensado: num projeto sem massa de dado, o custo operacional não se paga.
Consequência assumida: o **gerador de DDL não tem prova de correção**. A
reconstrução de `create table`, `create policy` e dos grants a partir do
catálogo é código plausível, não código verificado. O arquivo declara isso no
cabeçalho ("NÃO TESTADO"), e a pendência está aberta no changelog. Quando houver
dado real no banco — ou antes de qualquer migração de projeto — o replay deixa
de ser opcional.

**Justificativa.** Incremental: o script vive fora do app, não é importado por
`src/`, não entra no build; removê-lo é deletar dois arquivos e uma linha do
`package.json`. Modular: coleta, emissão e gatilho são camadas independentes, e
adicionar uma seção ao inventário é adicionar um objeto numa lista, sem tocar no
motor. Zero dívida: o snapshot é determinístico, o TLS é verificado, o índice
resolve idempotência sem constante mágica — e a única lacuna (o replay não
testado) está declarada em vez de escondida.

---

## Decision #025 — 2026-07-13

### Decisão: Spec #3c — formulário `/antes-da-sessao` (anamnese) implementado, testado e fechado

**Contexto**
Segundo formulário público do CRM. Cobre gate de idade, anamnese de saúde, consentimentos e cadastro, e cria um `job` por submissão. O copy v2 (27/05) e a spec original foram escritos antes das tabelas dedicadas (`clinical_records`, `consents`, `motivations`) e antes das pesquisas de LGPD — ambos estavam parcialmente vencidos no momento da implementação.

**Decisões consolidadas**

1. **Copy v3 substitui o v2.** O v2 contradizia a implementação em 8 pontos (rota, gate de idade, região do corpo, gravidez com 5 opções, documento CPF/RG/CNH, consentimento de saúde, mapeamento de tabelas, `policy_version`). Arquivo renomeado para `_VENCIDO`.
2. **Rota real: `src/app/(anamnese)/antes-da-sessao/page.tsx`.** A spec pedia `(anamnese)/page.tsx`, mas route group não vira segmento de URL e colidiria com o `/cadastro` na raiz. Divergência identificada pelo executor, aprovada pelo arquiteto.
3. **O job nasce vazio.** `status` default (`quoted`), `body_region`, `extra_data.submission_id`; preços e timestamps null. `quoted_at = now()` seria mentira (o orçamento ocorreu no WhatsApp). Preenchimento posterior é do admin (Bloco 4).
4. **`body_region` coletado** — obrigação da vigilância sanitária de SP (registro do procedimento com local do corpo) e contexto para a pergunta de pele.
5. **Consentimento de dados de saúde é step próprio e destacado** (`consent_type = 'health'`, borda de destaque). Tatuador não é profissional de saúde → Art. 11, II, "f" não se aplica; a única base legal é consentimento específico e destacado (Art. 11, I). Cláusula embutida no LGPD genérico não satisfaz a lei.
6. **Todo consent grava `policy_version`** (Art. 8º, §2º — ônus do controlador de provar qual texto foi aceito). Texto congelado em `docs/legal/consentimento_anamnese_v1.md` (`anamnese-v1-2026-07`); constante única em `src/lib/legal/policy.ts`. Mudança de texto = v2 do documento, nunca edição.
7. **Escopo dos consents:** `procedure` e `health` são por sessão (gravam `job_id`, nunca pulados); `lgpd` (12 meses), `image` e `marketing` são da pessoa (`job_id` null, pulados/confirmados se já respondidos).
8. **Idempotência por `submission_id`** gerado no mount (`crypto.randomUUID()`), gravado em `jobs.extra_data`, com índice único parcial. Reenvio da mesma instância → `duplicate: true`, zero escrita. F5/reabertura → uuid novo → job novo (correto: repreencher 31 steps é ato intencional). `sessionStorage` rejeitado — complexidade sem cenário que a justifique.
9. **Leitura de estado em tabelas append-only:** sempre `order by created_at desc limit 1`. Validado por armadilha deliberada no seed (7 linhas de `marketing`, a mais recente `granted = false`) — o formulário exibiu o estado correto.
10. **Steps de cadastro para recorrente: confirmação leve, não sumiço** (precedente do `/cadastro`); saúde (steps 4–11) e consents de sessão nunca são pulados. `submit_cadastro` ganhou `coalesce` de `policy_version` como ponte (dívida rastreada: o form `/cadastro` ainda não envia a versão).

**Validação**
- RPC `submit_anamnese`: 9/9 verde, incluindo idempotência, antes de qualquer código de front.
- β §14: testes 1–14 verdes — UI executada por agente de navegador (Comet) com transcrição literal + verificação SQL por `source`/`submission_id`. Execução acidental de 5 ciclos pelo agente funcionou como stress test: consents de pessoa gravados 1× em 5, consents de sessão 5× em 5, sem exceção.
- Teste 7 (duplo-clique, visual): aceito por camadas — RPC idempotente + lock síncrono do padrão #3b-fix. Sem re-verificação visual.
- Testes 15 e 17 (Enter/autocomplete + celular real em produção): **pendentes, não-impeditivos.**

**Impacto**
- Bloco 3 funcionalmente completo: dois formulários públicos escrevendo nas 6 tabelas via RPCs transacionais.
- Bloco 4 (admin) vira o próximo passo de código e entra no caminho crítico: listas e templates só vão ao Julio com o admin navegável em produção.

---

_(Novas entradas devem seguir este mesmo formato.)_
