# Schema — Flag Haus CRM

> Gerado por `npm run moas`. Não editar à mão.
> Fonte da verdade: o banco. Este arquivo é a fotografia dele.

## Extensões

| Extensão | Versão | Schema |
| --- | --- | --- |
| pg_stat_statements | 1.11 | extensions |
| pgcrypto | 1.3 | extensions |
| plpgsql | 1.0 | pg_catalog |
| postgis | 3.3.7 | extensions |
| supabase_vault | 0.3.1 | vault |
| uuid-ossp | 1.1 | extensions |

## Enums

- **consent_type**: `procedure`, `lgpd`, `image`, `marketing`, `health`
- **job_status**: `quoted`, `confirmed`, `executed`, `cancelled`, `no_response`
- **lifecycle_stage**: `lead`, `prospect`, `opportunity`, `customer`, `recurring`, `dormant`, `lost`
- **user_role**: `admin`, `viewer`

## Tabelas

### clinical_records

Anamnese clínica por job/sessão. Append-only. Dados sensíveis LGPD separados de people.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | person_id | uuid | não |  |  |
| 3 | job_id | uuid | sim |  | Referência ao job/sessão. NULL aceito se anamnese preenchida antes do job ser criado. |
| 4 | has_allergies | boolean | sim |  |  |
| 5 | allergies_detail | text | sim |  |  |
| 6 | takes_medication | boolean | sim |  |  |
| 7 | medications_detail | text | sim |  |  |
| 8 | has_diabetes | boolean | sim |  |  |
| 9 | has_skin_condition | boolean | sim |  |  |
| 10 | skin_condition_detail | text | sim |  |  |
| 11 | pregnancy_status | text | sim |  |  |
| 12 | health_notes | text | sim |  |  |
| 13 | recent_substances | text | sim |  |  |
| 14 | filled_at | timestamp with time zone | não | now() | Momento exato da submissão da anamnese — pode ser anterior ou simultânea ao job. |
| 15 | created_at | timestamp with time zone | não | now() |  |

**Constraints**

- `clinical_pregnancy_valid` — CHECK (((pregnancy_status IS NULL) OR (pregnancy_status = ANY (ARRAY['pregnant'::text, 'breastfeeding'::text, 'no'::text, 'prefer_not_say'::text, 'not_applicable'::text]))))
- `clinical_substances_valid` — CHECK (((recent_substances IS NULL) OR (recent_substances = ANY (ARRAY['will_not'::text, 'will'::text, 'discuss_in_session'::text]))))
- `clinical_records_job_id_fkey` — FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
- `clinical_records_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT
- `clinical_records_pkey` — PRIMARY KEY (id)

**Índices**

- `clinical_records_job_id_idx` — CREATE INDEX clinical_records_job_id_idx ON public.clinical_records USING btree (job_id) WHERE (job_id IS NOT NULL)
- `clinical_records_person_id_idx` — CREATE INDEX clinical_records_person_id_idx ON public.clinical_records USING btree (person_id, filled_at DESC)

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### consents

Registro append-only de consentimentos. Cada renovação/revogação é uma linha nova.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | person_id | uuid | não |  |  |
| 3 | job_id | uuid | sim |  |  |
| 4 | consent_type | consent_type | não |  |  |
| 5 | granted | boolean | não |  | true = autorização concedida; false = revogada ou recusada. |
| 6 | valid_until | timestamp with time zone | sim |  | Expiração explícita (ex: LGPD anual). NULL = sem expiração. |
| 7 | source | text | sim |  | Origem do registro: form_anamnese, form_cadastro, admin_manual, etc. |
| 8 | notes | text | sim |  |  |
| 9 | granted_at | timestamp with time zone | não | now() |  |
| 10 | created_at | timestamp with time zone | não | now() |  |
| 11 | policy_version | text | não |  | Versão do texto de consentimento aceito. Ex: "anamnese-v1-2026-07". Texto em docs/legal/. |

**Constraints**

- `consents_job_id_fkey` — FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
- `consents_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT
- `consents_pkey` — PRIMARY KEY (id)

**Índices**

- `consents_job_id_idx` — CREATE INDEX consents_job_id_idx ON public.consents USING btree (job_id, granted_at DESC) WHERE (job_id IS NOT NULL)
- `consents_person_type_granted_idx` — CREATE INDEX consents_person_type_granted_idx ON public.consents USING btree (person_id, consent_type, granted_at DESC)
- `consents_type_granted_idx` — CREATE INDEX consents_type_granted_idx ON public.consents USING btree (consent_type, granted_at DESC)

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### customer_segments_snapshot

Foto mensal. Populada por pg_cron a partir de junho. Uma linha por pessoa por mês.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | person_id | uuid | não |  |  |
| 3 | snapshot_month | date | não |  | Primeiro dia do mês (garantido por constraint). Ex: 2026-06-01. |
| 4 | lifecycle_stage | lifecycle_stage | não |  |  |
| 5 | rfm_segment | text | sim |  | TEXT por enquanto. ENUM quando segmentação RFM estiver definida. |
| 6 | ltv | numeric(10,2) | sim |  |  |
| 7 | jobs_count | integer | não | 0 |  |
| 8 | jobs_executed_count | integer | não | 0 |  |
| 9 | recency_days | integer | sim |  |  |
| 10 | frequency_count | integer | sim |  |  |
| 11 | monetary_total | numeric(10,2) | sim |  |  |
| 12 | created_at | timestamp with time zone | não | now() |  |

**Constraints**

- `snapshot_jobs_count_non_negative` — CHECK (((jobs_count >= 0) AND (jobs_executed_count >= 0)))
- `snapshot_ltv_non_negative` — CHECK (((ltv IS NULL) OR (ltv >= (0)::numeric)))
- `snapshot_month_first_day` — CHECK ((snapshot_month = (date_trunc('month'::text, (snapshot_month)::timestamp with time zone))::date))
- `customer_segments_snapshot_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
- `customer_segments_snapshot_pkey` — PRIMARY KEY (id)

**Índices**

- `snapshot_month_stage_idx` — CREATE INDEX snapshot_month_stage_idx ON public.customer_segments_snapshot USING btree (snapshot_month DESC, lifecycle_stage)
- `snapshot_person_month_desc_idx` — CREATE INDEX snapshot_person_month_desc_idx ON public.customer_segments_snapshot USING btree (person_id, snapshot_month DESC)
- `snapshot_person_month_unique` — CREATE UNIQUE INDEX snapshot_person_month_unique ON public.customer_segments_snapshot USING btree (person_id, snapshot_month)

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### events

Timeline unificada. Marcos do funil e interações de marketing convivem aqui. event_type discrimina.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | person_id | uuid | sim |  | NULL se evento ainda anônimo. Quando vier identificação, criar identity_link em vez de UPDATE aqui. |
| 3 | anonymous_id | text | sim |  | ID de tracking pré-identificação. Resolvido via identity_links em queries. |
| 4 | job_id | uuid | sim |  |  |
| 5 | event_type | text | não |  | Convenção: namespace.action. Ex: funnel.first_contact, marketing.ad_click, job.quote_sent. |
| 6 | source | text | sim |  | Canal: whatsapp, google_ads, instagram, web, manual. |
| 7 | payload | jsonb | não | '{}'::jsonb | Atributos específicos do event_type. Ex: marketing.ad_click → {campaign_id, keyword, cost}. |
| 8 | occurred_at | timestamp with time zone | não | now() |  |
| 9 | created_at | timestamp with time zone | não | now() |  |
| 10 | actor_id | uuid | sim |  | auth.users.id de quem executou a ação, quando originada do admin. Null quando originada de formulário público. |

**Constraints**

- `events_event_type_not_blank` — CHECK ((length(TRIM(BOTH FROM event_type)) > 0))
- `events_has_identifier` — CHECK (((person_id IS NOT NULL) OR (anonymous_id IS NOT NULL)))
- `events_job_id_fkey` — FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
- `events_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
- `events_pkey` — PRIMARY KEY (id)

**Índices**

- `events_anonymous_id_occurred_at_idx` — CREATE INDEX events_anonymous_id_occurred_at_idx ON public.events USING btree (anonymous_id, occurred_at DESC) WHERE (anonymous_id IS NOT NULL)
- `events_event_type_idx` — CREATE INDEX events_event_type_idx ON public.events USING btree (event_type, occurred_at DESC)
- `events_job_id_idx` — CREATE INDEX events_job_id_idx ON public.events USING btree (job_id, occurred_at DESC) WHERE (job_id IS NOT NULL)
- `events_person_id_occurred_at_idx` — CREATE INDEX events_person_id_occurred_at_idx ON public.events USING btree (person_id, occurred_at DESC) WHERE (person_id IS NOT NULL)
- `events_source_idx` — CREATE INDEX events_source_idx ON public.events USING btree (source, occurred_at DESC) WHERE (source IS NOT NULL)

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### identity_links

Resolve identidade: quando lead anônimo (clique de anúncio) vira pessoa identificada.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | person_id | uuid | não |  |  |
| 3 | anonymous_id | text | não |  | ID gerado no frontend/tracking antes da identificação. Pode haver múltiplos por pessoa. |
| 4 | source | text | sim |  | Origem do anonymous_id: google_ads, instagram, web_session, etc. |
| 5 | linked_at | timestamp with time zone | não | now() |  |
| 6 | created_at | timestamp with time zone | não | now() |  |

**Constraints**

- `identity_links_anonymous_id_not_blank` — CHECK ((length(TRIM(BOTH FROM anonymous_id)) > 0))
- `identity_links_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
- `identity_links_pkey` — PRIMARY KEY (id)

**Índices**

- `identity_links_anonymous_id_unique` — CREATE UNIQUE INDEX identity_links_anonymous_id_unique ON public.identity_links USING btree (anonymous_id)
- `identity_links_person_id_idx` — CREATE INDEX identity_links_person_id_idx ON public.identity_links USING btree (person_id)

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### jobs

Cada orçamento/trabalho/cancelamento do Flag Haus. status discrimina o estado atual.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | person_id | uuid | não |  |  |
| 3 | status | job_status | não | 'quoted'::job_status | quoted \| confirmed \| executed \| cancelled \| no_response — fluxo definido em ENUM job_status. |
| 4 | quoted_price | numeric(10,2) | sim |  | Valor orçado inicialmente. |
| 5 | final_price | numeric(10,2) | sim |  | Valor efetivamente pago (pode divergir do orçado). |
| 6 | quoted_at | timestamp with time zone | sim |  |  |
| 7 | confirmed_at | timestamp with time zone | sim |  |  |
| 8 | executed_at | timestamp with time zone | sim |  |  |
| 9 | cancelled_at | timestamp with time zone | sim |  |  |
| 10 | description | text | sim |  |  |
| 11 | body_region | text | sim |  |  |
| 12 | style | text | sim |  |  |
| 13 | size_cm | numeric(5,1) | sim |  |  |
| 14 | extra_data | jsonb | não | '{}'::jsonb |  |
| 15 | created_at | timestamp with time zone | não | now() |  |
| 16 | updated_at | timestamp with time zone | não | now() |  |
| 17 | deleted_at | timestamp with time zone | sim |  |  |

**Constraints**

- `jobs_final_price_non_negative` — CHECK (((final_price IS NULL) OR (final_price >= (0)::numeric)))
- `jobs_quoted_price_non_negative` — CHECK (((quoted_price IS NULL) OR (quoted_price >= (0)::numeric)))
- `jobs_size_non_negative` — CHECK (((size_cm IS NULL) OR (size_cm >= (0)::numeric)))
- `jobs_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT
- `jobs_pkey` — PRIMARY KEY (id)

**Índices**

- `jobs_executed_at_idx` — CREATE INDEX jobs_executed_at_idx ON public.jobs USING btree (executed_at DESC) WHERE ((deleted_at IS NULL) AND (executed_at IS NOT NULL))
- `jobs_person_id_idx` — CREATE INDEX jobs_person_id_idx ON public.jobs USING btree (person_id) WHERE (deleted_at IS NULL)
- `jobs_status_idx` — CREATE INDEX jobs_status_idx ON public.jobs USING btree (status) WHERE (deleted_at IS NULL)
- `jobs_submission_id_unique` — CREATE UNIQUE INDEX jobs_submission_id_unique ON public.jobs USING btree (((extra_data ->> 'submission_id'::text))) WHERE ((extra_data ? 'submission_id'::text) AND (deleted_at IS NULL))

**Triggers**

- `jobs_set_updated_at` — CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at()

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### lifecycle_transitions

Append-only. Cada mudança de people.lifecycle_stage gera linha aqui.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | person_id | uuid | não |  |  |
| 3 | from_stage | lifecycle_stage | sim |  | NULL na primeira transição (criação do registro). Não-nulo a partir da segunda. |
| 4 | to_stage | lifecycle_stage | não |  |  |
| 5 | changed_by | uuid | sim |  | auth.users.id de quem fez a mudança. NULL se foi automação. |
| 6 | reason | text | sim |  | Texto livre opcional. Ex: "tatuou primeira vez", "sem resposta há 30 dias". |
| 7 | changed_at | timestamp with time zone | não | now() |  |
| 8 | created_at | timestamp with time zone | não | now() |  |

**Constraints**

- `lifecycle_transitions_stages_differ` — CHECK (((from_stage IS NULL) OR (from_stage <> to_stage)))
- `lifecycle_transitions_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
- `lifecycle_transitions_pkey` — PRIMARY KEY (id)

**Índices**

- `lifecycle_transitions_person_id_idx` — CREATE INDEX lifecycle_transitions_person_id_idx ON public.lifecycle_transitions USING btree (person_id, changed_at DESC)
- `lifecycle_transitions_to_stage_idx` — CREATE INDEX lifecycle_transitions_to_stage_idx ON public.lifecycle_transitions USING btree (to_stage, changed_at DESC)

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### motivations

Histórico append-only de motivações declaradas pelo cliente.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | person_id | uuid | não |  |  |
| 3 | job_id | uuid | sim |  | Vincula a um job específico quando a motivação foi declarada na anamnese. |
| 4 | content | text | não |  | Texto livre da motivação. Sem schema interno por enquanto. |
| 5 | source | text | sim |  |  |
| 6 | recorded_at | timestamp with time zone | não | now() |  |
| 7 | created_at | timestamp with time zone | não | now() |  |

**Constraints**

- `motivations_content_not_blank` — CHECK ((length(TRIM(BOTH FROM content)) > 0))
- `motivations_job_id_fkey` — FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
- `motivations_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
- `motivations_pkey` — PRIMARY KEY (id)

**Índices**

- `motivations_job_id_idx` — CREATE INDEX motivations_job_id_idx ON public.motivations USING btree (job_id) WHERE (job_id IS NOT NULL)
- `motivations_person_id_idx` — CREATE INDEX motivations_person_id_idx ON public.motivations USING btree (person_id, recorded_at DESC)

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### people

Entidade central. Identidade frouxa: phone obrigatório, demais atributos preenchidos incrementalmente.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | phone | text | não |  |  |
| 3 | name | text | sim |  |  |
| 4 | email | text | sim |  |  |
| 5 | birth_date | date | sim |  |  |
| 6 | lifecycle_stage | lifecycle_stage | não | 'lead'::lifecycle_stage | Estágio atual do cliente. Histórico de mudanças vive em lifecycle_transitions. |
| 7 | vip_flag | boolean | não | false |  |
| 8 | difficult_flag | boolean | não | false |  |
| 9 | lat | double precision | sim |  |  |
| 10 | lng | double precision | sim |  |  |
| 11 | location | geography(Point,4326) | sim |  | Auto-populada por trigger a partir de lat/lng. Use ST_Distance, ST_DWithin para queries geoespaciais. |
| 12 | extra_data | jsonb | não | '{}'::jsonb | Staging JSONB pra atributos ainda não estruturados. Promover pra coluna quando virar consulta frequente. |
| 13 | identified_at | timestamp with time zone | sim |  |  |
| 14 | created_at | timestamp with time zone | não | now() |  |
| 15 | updated_at | timestamp with time zone | não | now() |  |
| 16 | deleted_at | timestamp with time zone | sim |  |  |

**Constraints**

- `people_email_format` — CHECK (((email IS NULL) OR (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)))
- `people_lat_range` — CHECK (((lat IS NULL) OR ((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))))
- `people_lng_range` — CHECK (((lng IS NULL) OR ((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))))
- `people_phone_not_blank` — CHECK ((length(TRIM(BOTH FROM phone)) > 0))
- `people_pkey` — PRIMARY KEY (id)

**Índices**

- `people_email_idx` — CREATE INDEX people_email_idx ON public.people USING btree (lower(email)) WHERE ((deleted_at IS NULL) AND (email IS NOT NULL))
- `people_lifecycle_stage_idx` — CREATE INDEX people_lifecycle_stage_idx ON public.people USING btree (lifecycle_stage) WHERE (deleted_at IS NULL)
- `people_location_gix` — CREATE INDEX people_location_gix ON public.people USING gist (location) WHERE ((deleted_at IS NULL) AND (location IS NOT NULL))
- `people_phone_unique` — CREATE UNIQUE INDEX people_phone_unique ON public.people USING btree (phone) WHERE (deleted_at IS NULL)

**Triggers**

- `people_set_updated_at` — CREATE TRIGGER people_set_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION set_updated_at()
- `people_sync_location` — CREATE TRIGGER people_sync_location BEFORE INSERT OR UPDATE OF lat, lng ON public.people FOR EACH ROW EXECUTE FUNCTION sync_people_location()

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

### user_roles

Mapeia auth.users.id → role. Lido pelo Auth Hook que injeta app_role no JWT.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | user_id | uuid | não |  | auth.users.id. Sem FK explícita: tabela auth é gerenciada pelo Supabase, FK criaria acoplamento frágil. |
| 3 | role | user_role | não | 'viewer'::user_role |  |
| 4 | created_at | timestamp with time zone | não | now() |  |
| 5 | updated_at | timestamp with time zone | não | now() |  |

**Constraints**

- `user_roles_pkey` — PRIMARY KEY (id)

**Índices**

- `user_roles_user_id_unique` — CREATE UNIQUE INDEX user_roles_user_id_unique ON public.user_roles USING btree (user_id)

**Triggers**

- `user_roles_set_updated_at` — CREATE TRIGGER user_roles_set_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION set_updated_at()

**Policies**

| Nome | Comando | Roles | Using | With check |
| --- | --- | --- | --- | --- |
| deny_anon_select | SELECT |  | false |  |
| deny_anon_write | ALL |  | false | false |
| deny_authenticated_select | SELECT |  | false |  |
| deny_authenticated_write | ALL |  | false | false |

**Grants**

| Grantee | Privilégio |
| --- | --- |
| anon | DELETE |
| anon | INSERT |
| anon | MAINTAIN |
| anon | REFERENCES |
| anon | SELECT |
| anon | TRIGGER |
| anon | TRUNCATE |
| anon | UPDATE |
| authenticated | DELETE |
| authenticated | INSERT |
| authenticated | MAINTAIN |
| authenticated | REFERENCES |
| authenticated | SELECT |
| authenticated | TRIGGER |
| authenticated | TRUNCATE |
| authenticated | UPDATE |
| postgres | DELETE |
| postgres | INSERT |
| postgres | MAINTAIN |
| postgres | REFERENCES |
| postgres | SELECT |
| postgres | TRIGGER |
| postgres | TRUNCATE |
| postgres | UPDATE |
| service_role | DELETE |
| service_role | INSERT |
| service_role | MAINTAIN |
| service_role | REFERENCES |
| service_role | SELECT |
| service_role | TRIGGER |
| service_role | TRUNCATE |
| service_role | UPDATE |

## Funções

### set_updated_at()

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
```

Grants: anon → EXECUTE, authenticated → EXECUTE, postgres → EXECUTE, PUBLIC → EXECUTE, service_role → EXECUTE

### submit_cadastro(payload jsonb)

```sql
CREATE OR REPLACE FUNCTION public.submit_cadastro(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_phone text;
  v_person_id uuid;
  v_consent jsonb;
  v_motivation text;
begin
  v_phone := payload->>'phone';
  if v_phone is null or v_phone !~ '^\+[1-9]\d{7,14}$' then
    raise exception 'invalid_phone';
  end if;

  insert into public.people (phone, name, email, birth_date, lat, lng, extra_data, identified_at)
  values (
    v_phone,
    nullif(payload->>'name', ''),
    nullif(payload->>'email', ''),
    (payload->>'birth_date')::date,
    (payload->>'lat')::double precision,
    (payload->>'lng')::double precision,
    coalesce(payload->'extra_data', '{}'::jsonb),
    now()
  )
  on conflict (phone) where (deleted_at is null)
  do update set
    name       = coalesce(nullif(excluded.name, ''), people.name),
    email      = coalesce(nullif(excluded.email, ''), people.email),
    birth_date = coalesce(excluded.birth_date, people.birth_date),
    lat        = coalesce(excluded.lat, people.lat),
    lng        = coalesce(excluded.lng, people.lng),
    extra_data = people.extra_data || coalesce(excluded.extra_data, '{}'::jsonb),
    identified_at = coalesce(people.identified_at, now())
  returning id into v_person_id;

  for v_consent in select * from jsonb_array_elements(coalesce(payload->'consents', '[]'::jsonb))
  loop
    insert into public.consents (person_id, consent_type, granted, valid_until, source)
    values (
      v_person_id,
      (v_consent->>'type')::public.consent_type,
      (v_consent->>'granted')::boolean,
      case when v_consent ? 'valid_months'
           then now() + make_interval(months => (v_consent->>'valid_months')::int)
           else null end,
      coalesce(payload->>'source', 'form_cadastro')
    );
  end loop;

  v_motivation := nullif(trim(coalesce(payload->>'motivation', '')), '');
  if v_motivation is not null then
    insert into public.motivations (person_id, content, source)
    values (v_person_id, v_motivation, coalesce(payload->>'source', 'form_cadastro'));
  end if;

  insert into public.events (person_id, event_type, source, payload)
  values (
    v_person_id,
    'form.cadastro_submitted',
    coalesce(payload->>'source', 'form_cadastro'),
    jsonb_build_object('mode', coalesce(payload->>'mode', 'unknown'))
  );

  return jsonb_build_object('status', 'ok', 'person_id', v_person_id);
end;
$function$
```

Grants: postgres → EXECUTE, service_role → EXECUTE

### sync_people_location()

```sql
CREATE OR REPLACE FUNCTION public.sync_people_location()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.lat is not null and new.lng is not null then
    new.location = st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  else
    new.location = null;
  end if;
  return new;
end;
$function$
```

Grants: anon → EXECUTE, authenticated → EXECUTE, postgres → EXECUTE, PUBLIC → EXECUTE, service_role → EXECUTE

### uuid_generate_v7()

```sql
CREATE OR REPLACE FUNCTION public.uuid_generate_v7()
 RETURNS uuid
 LANGUAGE sql
AS $function$
  select encode(
    set_bit(
      set_bit(
        overlay(
          uuid_send(gen_random_uuid())
          placing substring(
            int8send(floor(extract(epoch from clock_timestamp()) * 1000)::bigint)
            from 3
          )
          from 1 for 6
        ),
        52, 1
      ),
      53, 1
    ),
    'hex'
  )::uuid;
$function$
```

Grants: anon → EXECUTE, authenticated → EXECUTE, postgres → EXECUTE, PUBLIC → EXECUTE, service_role → EXECUTE

## Migrations registradas

_Referência — a fonte da verdade do DDL é `schema.sql`._

| Version | Name |
| --- | --- |
| 20260630044336 | explicit_deny_anon_authenticated |
| 20260705144518 | rpc_submit_cadastro |
| 20260705154434 | rpc_submit_cadastro_e164 |
| 20260713000000 | jobs_submission_id_unique |
| 20260713010000 | consent_health_policy_version_event_actor |
