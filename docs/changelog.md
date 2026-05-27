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
