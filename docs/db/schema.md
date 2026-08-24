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
| unaccent | 1.1 | public |
| uuid-ossp | 1.1 | extensions |

## Enums

- **consent_type**: `procedure`, `lgpd`, `image`, `marketing`, `health`
- **job_status**: `quoted`, `confirmed`, `executed`, `cancelled`, `no_response`
- **lifecycle_stage**: `lead`, `prospect`, `opportunity`, `customer`, `recurring`, `dormant`, `lost`
- **user_role**: `admin`, `viewer`

## Tabelas

### calendar_events

Espelho de eventos das fontes externas + eventos criados pelo CRM (write-through). Propriedade de campo no contrato §6: Google-owned vs CRM-owned.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | source_id | uuid | não |  | Fonte do evento. Par com external_id é a chave do upsert do sync. |
| 3 | external_id | text | não |  | ID do evento no provider. |
| 4 | title | text | sim |  | Google-owned: sobrescrito em todo sync. |
| 5 | description | text | sim |  | Google-owned: sobrescrito em todo sync. Onde o matcher procura telefone. |
| 6 | starts_at | timestamp with time zone | não |  | Google-owned. UTC no banco; conversão pra America/Sao_Paulo em ponto único no app. |
| 7 | ends_at | timestamp with time zone | sim |  | Google-owned. |
| 8 | all_day | boolean | não | false | Google-owned. Evento de dia inteiro. |
| 9 | status | text | não | 'confirmed'::text | Google-owned. Cancelou no Google vira cancelled; a RPC filtra. Nunca DELETE: histórico. |
| 10 | origin | text | não |  | Setado UMA vez (crm no write-through, google no sync pra evento desconhecido) e preservado pelo upsert. Define editable. |
| 11 | creator_email | text | sim |  | Google-owned. Insumo do parser de artista. |
| 12 | category | text | não | 'outros'::text | sessao\|outros. Parser no sync recomputa SÓ se meta_source.category_manual=false. aniversario não mora aqui: é computado na RPC. |
| 13 | artist | text | sim |  | Lowercase, mesmo vocabulário de jobs.artist. Parser recomputa SÓ se meta_source.artist_manual=false. |
| 14 | meta_source | jsonb | não | '{}'::jsonb | Flags de trava do recompute: {artist_manual, category_manual}. CRM-owned. |
| 15 | person_id | uuid | sim |  | Vínculo evento->contato. Matcher só preenche quando NULL; vínculo manual nunca é sobrescrito. |
| 16 | match_source | text | sim |  | phone (matcher automático) \| manual (bandeja/drawer). Auditoria do vínculo. |
| 17 | created_at | timestamp with time zone | não | now() |  |
| 18 | updated_at | timestamp with time zone | não | now() |  |
| 19 | service_type | text | sim |  | tattoo\|piercing, NULL pra evento sem cara de sessão. Mesmo vocabulário de jobs.service_type. Parser no sync recomputa SÓ se meta_source.service_type_manual=false; form do CRM e drawer gravam com flag manual. |

**Constraints**

- `calendar_events_category_check` — CHECK ((category = ANY (ARRAY['sessao'::text, 'outros'::text])))
- `calendar_events_match_source_check` — CHECK ((match_source = ANY (ARRAY['phone'::text, 'manual'::text])))
- `calendar_events_origin_check` — CHECK ((origin = ANY (ARRAY['google'::text, 'crm'::text])))
- `calendar_events_service_type_check` — CHECK ((service_type = ANY (ARRAY['tattoo'::text, 'piercing'::text])))
- `calendar_events_status_check` — CHECK ((status = ANY (ARRAY['confirmed'::text, 'cancelled'::text])))
- `calendar_events_person_id_fkey` — FOREIGN KEY (person_id) REFERENCES people(id)
- `calendar_events_source_id_fkey` — FOREIGN KEY (source_id) REFERENCES calendar_sources(id)
- `calendar_events_pkey` — PRIMARY KEY (id)
- `calendar_events_source_external_unique` — UNIQUE (source_id, external_id)

**Índices**

- `idx_calendar_events_person_id` — CREATE INDEX idx_calendar_events_person_id ON public.calendar_events USING btree (person_id)
- `idx_calendar_events_starts_at` — CREATE INDEX idx_calendar_events_starts_at ON public.calendar_events USING btree (starts_at)

**Triggers**

- `trg_calendar_events_updated_at` — CREATE TRIGGER trg_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION set_updated_at()

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

### calendar_sources

Fontes de agenda espelhadas. Plural desde o berço: agenda nova = INSERT, zero refactor.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() |  |
| 2 | provider | text | não |  | v1 só google; check afrouxa por migration quando houver segundo provider. |
| 3 | external_id | text | não |  | Calendar ID no provider. |
| 4 | label | text | não |  | Nome de exibição/log da fonte. |
| 5 | is_active | boolean | não | true | Desligar a fonte sem apagar histórico. |
| 6 | sync_token | text | sim |  | Token de sync incremental do Google. Invalidado (410): limpar e refazer janela cheia (-90d/+400d). |
| 7 | last_synced_at | timestamp with time zone | sim |  | Alimenta o carimbo "Última sincronização" da UI. |
| 8 | created_at | timestamp with time zone | não | now() |  |

**Constraints**

- `calendar_sources_provider_check` — CHECK ((provider = 'google'::text))
- `calendar_sources_pkey` — PRIMARY KEY (id)
- `calendar_sources_provider_external_unique` — UNIQUE (provider, external_id)

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
- `events_cadastro_submission_id_unique` — CREATE UNIQUE INDEX events_cadastro_submission_id_unique ON public.events USING btree (((payload ->> 'submission_id'::text))) WHERE (event_type = 'form.cadastro_submitted'::text)
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
| 18 | scheduled_at | timestamp with time zone | sim |  | Data/hora da sessão. Distinto dos carimbos de transição (confirmed_at etc.). |
| 19 | service_type | text | não | 'tattoo'::text |  |
| 20 | artist | text | não | 'julio'::text |  |

**Constraints**

- `jobs_final_price_non_negative` — CHECK (((final_price IS NULL) OR (final_price >= (0)::numeric)))
- `jobs_quoted_price_non_negative` — CHECK (((quoted_price IS NULL) OR (quoted_price >= (0)::numeric)))
- `jobs_service_type_check` — CHECK ((service_type = ANY (ARRAY['tattoo'::text, 'piercing'::text])))
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
| 17 | tags | text[] | não | '{}'::text[] | Array de SLUGS do catálogo tags. Escrito exclusivamente pelas actions de tag (família A); submit_cadastro, sync e imports nunca tocam. Órfã (slug sem catálogo) é estado legítimo tratado na UI. |

**Constraints**

- `people_email_format` — CHECK (((email IS NULL) OR (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)))
- `people_lat_range` — CHECK (((lat IS NULL) OR ((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))))
- `people_lng_range` — CHECK (((lng IS NULL) OR ((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))))
- `people_phone_not_blank` — CHECK ((length(TRIM(BOTH FROM phone)) > 0))
- `people_pkey` — PRIMARY KEY (id)

**Índices**

- `idx_people_tags_gin` — CREATE INDEX idx_people_tags_gin ON public.people USING gin (tags)
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

### tags

Catálogo de tags de contato. Indireção slug->(name,color) resolvida no render; mudar aqui dispersa em todas as telas sem tocar em contato.

**RLS:** habilitada

**Colunas**

| # | Coluna | Tipo | Nulo | Default | Comentário |
| --- | --- | --- | --- | --- | --- |
| 1 | id | uuid | não | uuid_generate_v7() | PK uuid v7, padrão do projeto. |
| 2 | name | text | não |  | Nome de exibição. MUTÁVEL: rename escreve só aqui e dispersa via indireção. |
| 3 | slug | text | não |  | Identidade da tag. IMUTÁVEL pós-criação (garantido na action, único escritor). Colisão é de slug, não de nome. |
| 4 | color | text | não |  | Hex da paleta fixa (constante única em código, contraste >=4.5:1 provado em teste). |
| 5 | is_active | boolean | não | true | Desativar = soft: bloqueia entrada em contato novo, preserva quem tem, destrava saída no editor. |
| 6 | created_at | timestamp with time zone | não | now() | Auditoria mínima. |

**Constraints**

- `tags_pkey` — PRIMARY KEY (id)
- `tags_slug_key` — UNIQUE (slug)

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

## Views

### v_person_last_interaction

Precedência customer > operational > admin: edição interna nunca faz cliente parecer engajado.

**Tipo:** view

**Opções:** security_invoker=on

**Colunas**

| # | Coluna | Tipo | Comentário |
| --- | --- | --- | --- |
| 1 | person_id | uuid |  |
| 2 | last_interaction_at | timestamp with time zone |  |
| 3 | last_interaction_class | text |  |
| 4 | last_interaction_label | text |  |

**Definição**

```sql
WITH classified AS (
         SELECT e.person_id,
            e.event_type,
            e.occurred_at,
                CASE
                    WHEN e.event_type ~~ 'form.%'::text THEN 'customer'::text
                    WHEN e.event_type ~~ 'admin.%'::text THEN 'admin'::text
                    ELSE 'operational'::text
                END AS klass
           FROM events e
          WHERE e.person_id IS NOT NULL
        ), ranked AS (
         SELECT DISTINCT ON (classified.person_id, classified.klass) classified.person_id,
            classified.klass,
            classified.event_type,
            classified.occurred_at
           FROM classified
          ORDER BY classified.person_id, classified.klass, classified.occurred_at DESC
        )
 SELECT p.id AS person_id,
    pick.occurred_at AS last_interaction_at,
    pick.klass AS last_interaction_class,
        CASE pick.event_type
            WHEN 'form.cadastro_submitted'::text THEN 'Cadastro enviado'::text
            WHEN 'form.anamnese_submitted'::text THEN 'Anamnese enviada'::text
            WHEN 'admin.geo_backfill'::text THEN 'Localização atualizada'::text
            WHEN 'admin.person_updated'::text THEN 'Ficha editada'::text
            WHEN 'job.created_manual'::text THEN 'Job criado'::text
            ELSE COALESCE(pick.event_type, NULL::text)
        END AS last_interaction_label
   FROM people p
     LEFT JOIN LATERAL ( SELECT r.person_id,
            r.klass,
            r.event_type,
            r.occurred_at
           FROM ranked r
          WHERE r.person_id = p.id
          ORDER BY (
                CASE r.klass
                    WHEN 'customer'::text THEN 1
                    WHEN 'operational'::text THEN 2
                    ELSE 3
                END)
         LIMIT 1) pick ON true
  WHERE p.deleted_at IS NULL
```

**Grants**

| Grantee | Privilégio |
| --- | --- |
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

### v_person_operational_status

Badge da lista admin. Precedência: sessão marcada > agendar > orçamento enviado > orçar > sem resposta > inativo(180d) > cliente > novo. Nunca denormalizar.

**Tipo:** view

**Opções:** security_invoker=on

**Colunas**

| # | Coluna | Tipo | Comentário |
| --- | --- | --- | --- |
| 1 | person_id | uuid |  |
| 2 | operational_status | text |  |
| 3 | is_returning | boolean |  |

**Definição**

```sql
SELECT id AS person_id,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM jobs j
              WHERE j.person_id = p.id AND j.deleted_at IS NULL AND j.status = 'confirmed'::job_status AND j.scheduled_at IS NOT NULL AND j.scheduled_at >= now())) THEN 'sessao_marcada'::text
            WHEN (EXISTS ( SELECT 1
               FROM jobs j
              WHERE j.person_id = p.id AND j.deleted_at IS NULL AND j.status = 'confirmed'::job_status)) THEN 'agendar'::text
            WHEN (EXISTS ( SELECT 1
               FROM jobs j
              WHERE j.person_id = p.id AND j.deleted_at IS NULL AND j.status = 'quoted'::job_status AND j.quoted_price IS NOT NULL)) THEN 'orcamento_enviado'::text
            WHEN (EXISTS ( SELECT 1
               FROM jobs j
              WHERE j.person_id = p.id AND j.deleted_at IS NULL AND j.status = 'quoted'::job_status)) THEN 'orcar'::text
            WHEN (EXISTS ( SELECT 1
               FROM jobs j
              WHERE j.person_id = p.id AND j.deleted_at IS NULL AND j.status = 'no_response'::job_status)) THEN 'sem_resposta'::text
            WHEN NOT (EXISTS ( SELECT 1
               FROM jobs j
              WHERE j.person_id = p.id AND j.deleted_at IS NULL AND (j.status = ANY (ARRAY['quoted'::job_status, 'confirmed'::job_status, 'no_response'::job_status])))) AND COALESCE(( SELECT max(e.occurred_at) AS max
               FROM events e
              WHERE e.person_id = p.id), created_at) < (now() - '180 days'::interval) THEN 'inativo'::text
            WHEN (EXISTS ( SELECT 1
               FROM jobs j
              WHERE j.person_id = p.id AND j.deleted_at IS NULL AND j.status = 'executed'::job_status)) THEN 'cliente'::text
            ELSE 'novo'::text
        END AS operational_status,
    (EXISTS ( SELECT 1
           FROM jobs je
          WHERE je.person_id = p.id AND je.deleted_at IS NULL AND je.status = 'executed'::job_status)) AND (EXISTS ( SELECT 1
           FROM jobs jo
          WHERE jo.person_id = p.id AND jo.deleted_at IS NULL AND (jo.status = ANY (ARRAY['quoted'::job_status, 'confirmed'::job_status, 'no_response'::job_status])))) AS is_returning
   FROM people p
  WHERE deleted_at IS NULL
```

**Grants**

| Grantee | Privilégio |
| --- | --- |
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

### v_admin_cadastros

Contrato da tela /admin/cadastros (Bloco 4). Composta de v_person_operational_status + v_person_last_interaction. Sem dado clínico/consent por design.

**Tipo:** view

**Opções:** security_invoker=on

**Depende de:** `v_person_last_interaction`, `v_person_operational_status`

**Colunas**

| # | Coluna | Tipo | Comentário |
| --- | --- | --- | --- |
| 1 | person_id | uuid |  |
| 2 | name | text |  |
| 3 | name_norm | text |  |
| 4 | phone | text |  |
| 5 | phone_digits | text |  |
| 6 | email | text |  |
| 7 | email_norm | text |  |
| 8 | instagram | text |  |
| 9 | instagram_norm | text |  |
| 10 | preferred_channel | text |  |
| 11 | neighborhood | text |  |
| 12 | is_vip | boolean |  |
| 13 | is_difficult | boolean |  |
| 14 | operational_status | text |  |
| 15 | is_returning | boolean |  |
| 16 | next_session_at | timestamp with time zone |  |
| 17 | last_interaction_at | timestamp with time zone |  |
| 18 | last_interaction_class | text |  |
| 19 | last_interaction_label | text |  |
| 20 | created_at | timestamp with time zone |  |
| 21 | attention_rank | integer |  |

**Definição**

```sql
SELECT p.id AS person_id,
    p.name,
    f_norm(p.name) AS name_norm,
    p.phone,
    regexp_replace(p.phone, '\D'::text, ''::text, 'g'::text) AS phone_digits,
    p.email,
    lower(p.email) AS email_norm,
    p.extra_data ->> 'instagram'::text AS instagram,
    NULLIF(replace(f_norm(p.extra_data ->> 'instagram'::text), '@'::text, ''::text), ''::text) AS instagram_norm,
    p.extra_data ->> 'preferred_channel'::text AS preferred_channel,
    p.extra_data ->> 'neighborhood'::text AS neighborhood,
    p.vip_flag AS is_vip,
    p.difficult_flag AS is_difficult,
    s.operational_status,
    s.is_returning,
    ns.next_session_at,
    li.last_interaction_at,
    li.last_interaction_class,
    li.last_interaction_label,
    p.created_at,
        CASE s.operational_status
            WHEN 'orcar'::text THEN 1
            WHEN 'agendar'::text THEN 2
            WHEN 'orcamento_enviado'::text THEN 3
            WHEN 'sem_resposta'::text THEN 4
            WHEN 'sessao_marcada'::text THEN 5
            WHEN 'novo'::text THEN 6
            WHEN 'cliente'::text THEN 7
            WHEN 'inativo'::text THEN 8
            ELSE 9
        END AS attention_rank
   FROM people p
     JOIN v_person_operational_status s ON s.person_id = p.id
     JOIN v_person_last_interaction li ON li.person_id = p.id
     LEFT JOIN LATERAL ( SELECT min(j.scheduled_at) AS next_session_at
           FROM jobs j
          WHERE j.person_id = p.id AND j.deleted_at IS NULL AND (j.status = ANY (ARRAY['quoted'::job_status, 'confirmed'::job_status])) AND j.scheduled_at >= now()) ns ON true
  WHERE p.deleted_at IS NULL
```

**Grants**

| Grantee | Privilégio |
| --- | --- |
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

### calendar_events_between(p_start timestamp with time zone, p_end timestamp with time zone)

```sql
CREATE OR REPLACE FUNCTION public.calendar_events_between(p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS TABLE(event_id uuid, kind text, title text, starts_at timestamp with time zone, ends_at timestamp with time zone, all_day boolean, category text, origin text, editable boolean, artist text, service_type text, person_id uuid, person_name text, person_phone text, person_tags text[], meta jsonb)
 LANGUAGE sql
 STABLE
AS $function$
  select
    e.id as event_id,
    'event'::text as kind,
    e.title,
    e.starts_at,
    e.ends_at,
    e.all_day,
    e.category,
    e.origin,
    (e.origin = 'crm') as editable,
    e.artist,
    e.service_type,
    e.person_id,
    p.name as person_name,
    p.phone as person_phone,
    p.tags as person_tags,
    jsonb_build_object(
      'description', e.description,
      'creator_email', e.creator_email,
      'match_source', e.match_source,
      'flags', e.meta_source
    ) as meta
  from public.calendar_events e
  join public.calendar_sources s on s.id = e.source_id and s.is_active
  left join public.people p on p.id = e.person_id and p.deleted_at is null
  where e.status = 'confirmed'
    and e.starts_at < p_end
    and coalesce(e.ends_at, e.starts_at) >= p_start

  union all

  select
    null::uuid as event_id,
    'birthday'::text as kind,
    'Aniversário — ' || p.name as title,
    b.occ_start as starts_at,
    b.occ_start + interval '1 day' as ends_at,
    true as all_day,
    'aniversario'::text as category,
    'birthday'::text as origin,
    false as editable,
    null::text as artist,
    null::text as service_type,
    p.id as person_id,
    p.name as person_name,
    p.phone as person_phone,
    p.tags as person_tags,
    '{}'::jsonb as meta
  from public.people p
  cross join generate_series(
    extract(year from (p_start at time zone 'America/Sao_Paulo'))::int,
    extract(year from (p_end   at time zone 'America/Sao_Paulo'))::int
  ) as y
  cross join lateral (
    select (
      (p.birth_date + make_interval(years => y - extract(year from p.birth_date)::int))::date::timestamp
    ) at time zone 'America/Sao_Paulo' as occ_start
  ) b
  where p.deleted_at is null
    and p.birth_date is not null
    and b.occ_start < p_end
    and b.occ_start + interval '1 day' >= p_start
$function$
```

Grants: postgres → EXECUTE, service_role → EXECUTE

### f_norm(t text)

```sql
CREATE OR REPLACE FUNCTION public.f_norm(t text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE PARALLEL SAFE
AS $function$ select lower(public.unaccent(coalesce(t,''))) $function$
```

Grants: anon → EXECUTE, authenticated → EXECUTE, postgres → EXECUTE, PUBLIC → EXECUTE, service_role → EXECUTE

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

### submit_anamnese(payload jsonb)

```sql
CREATE OR REPLACE FUNCTION public.submit_anamnese(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_phone         text;
  v_submission_id text;
  v_birth_date    date;
  v_person_id     uuid;
  v_job_id        uuid;
  v_consent       jsonb;
  v_motivation    text;
  v_clinical      jsonb;
  v_locks         jsonb;
  v_incoming_extra jsonb;
begin
  -- ── validações ────────────────────────────────────────────────────
  v_phone := payload->>'phone';
  if v_phone is null or v_phone !~ '^\+[1-9]\d{7,14}$' then
    raise exception 'invalid_phone';
  end if;

  v_submission_id := payload->>'submission_id';
  if v_submission_id is null or v_submission_id !~
     '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception 'invalid_submission_id';
  end if;

  v_birth_date := (payload->>'birth_date')::date;
  if v_birth_date is null then
    raise exception 'birth_date_required';
  end if;

  if extract(year from age(current_date, v_birth_date)) < 18 then
    raise exception 'minor_not_allowed';
  end if;

  -- ── LER LOCKS EXISTENTES ─────────────────────────────────────────
  select coalesce(extra_data->'admin_locks', '{}'::jsonb)
  into v_locks
  from public.people
  where phone = v_phone and deleted_at is null;

  v_locks := coalesce(v_locks, '{}'::jsonb);
  v_incoming_extra := coalesce(payload->'extra_data', '{}'::jsonb);

  v_incoming_extra := v_incoming_extra - array(
    select jsonb_object_keys(v_locks)
    intersect
    select jsonb_object_keys(v_incoming_extra)
  );

  -- ── people (upsert com locks) ────────────────────────────────────
  insert into public.people (phone, name, email, birth_date, lat, lng, extra_data, identified_at)
  values (
    v_phone,
    nullif(payload->>'name', ''),
    nullif(payload->>'email', ''),
    v_birth_date,
    (payload->>'lat')::double precision,
    (payload->>'lng')::double precision,
    v_incoming_extra,
    now()
  )
  on conflict (phone) where (deleted_at is null)
  do update set
    name = case
      when v_locks ? 'name' then people.name
      else coalesce(nullif(excluded.name, ''), people.name)
    end,
    email = case
      when v_locks ? 'email' then people.email
      else coalesce(nullif(excluded.email, ''), people.email)
    end,
    birth_date = case
      when v_locks ? 'birth_date' then people.birth_date
      else coalesce(excluded.birth_date, people.birth_date)
    end,
    phone = case
      when v_locks ? 'phone' then people.phone
      else people.phone
    end,
    lat  = coalesce(excluded.lat, people.lat),
    lng  = coalesce(excluded.lng, people.lng),
    extra_data    = people.extra_data || excluded.extra_data,
    identified_at = coalesce(people.identified_at, now())
  returning id into v_person_id;

  -- ── job (idempotente via submission_id) ───────────────────────────
  insert into public.jobs (person_id, body_region, extra_data)
  values (
    v_person_id,
    nullif(trim(coalesce(payload->>'body_region', '')), ''),
    jsonb_build_object('submission_id', v_submission_id, 'created_by', 'form_anamnese')
  )
  on conflict ((extra_data ->> 'submission_id'))
    where (extra_data ? 'submission_id' and deleted_at is null)
  do nothing
  returning id into v_job_id;

  if v_job_id is null then
    select id into v_job_id
    from public.jobs
    where extra_data ->> 'submission_id' = v_submission_id
      and deleted_at is null;

    return jsonb_build_object(
      'status', 'ok', 'person_id', v_person_id,
      'job_id', v_job_id, 'duplicate', true
    );
  end if;

  -- ── clinical_records ──────────────────────────────────────────────
  v_clinical := coalesce(payload->'clinical', '{}'::jsonb);

  insert into public.clinical_records (
    person_id, job_id,
    has_allergies, allergies_detail,
    takes_medication, medications_detail,
    has_diabetes,
    has_skin_condition, skin_condition_detail,
    pregnancy_status, health_notes, recent_substances
  )
  values (
    v_person_id, v_job_id,
    (v_clinical->>'has_allergies')::boolean,
    nullif(trim(coalesce(v_clinical->>'allergies_detail', '')), ''),
    (v_clinical->>'takes_medication')::boolean,
    nullif(trim(coalesce(v_clinical->>'medications_detail', '')), ''),
    (v_clinical->>'has_diabetes')::boolean,
    (v_clinical->>'has_skin_condition')::boolean,
    nullif(trim(coalesce(v_clinical->>'skin_condition_detail', '')), ''),
    nullif(v_clinical->>'pregnancy_status', ''),
    nullif(trim(coalesce(v_clinical->>'health_notes', '')), ''),
    nullif(v_clinical->>'recent_substances', '')
  );

  -- ── consents ──────────────────────────────────────────────────────
  for v_consent in select * from jsonb_array_elements(coalesce(payload->'consents', '[]'::jsonb))
  loop
    if (v_consent->>'policy_version') is null then
      raise exception 'consent_policy_version_required';
    end if;

    insert into public.consents (person_id, job_id, consent_type, granted, valid_until, source, policy_version)
    values (
      v_person_id,
      case when (v_consent->>'type') in ('procedure', 'health') then v_job_id else null end,
      (v_consent->>'type')::public.consent_type,
      (v_consent->>'granted')::boolean,
      case when v_consent ? 'valid_months'
           then now() + make_interval(months => (v_consent->>'valid_months')::int)
           else null end,
      coalesce(payload->>'source', 'form_anamnese'),
      v_consent->>'policy_version'
    );
  end loop;

  -- ── motivation ────────────────────────────────────────────────────
  v_motivation := nullif(trim(coalesce(payload->>'motivation', '')), '');
  if v_motivation is not null then
    insert into public.motivations (person_id, job_id, content, source)
    values (v_person_id, v_job_id, v_motivation, coalesce(payload->>'source', 'form_anamnese'));
  end if;

  -- ── event ─────────────────────────────────────────────────────────
  insert into public.events (person_id, job_id, event_type, source, payload)
  values (
    v_person_id, v_job_id,
    'form.anamnese_submitted',
    coalesce(payload->>'source', 'form_anamnese'),
    jsonb_build_object(
      'mode', coalesce(payload->>'mode', 'unknown'),
      'locked_fields_ignored', (select array_agg(k) from jsonb_object_keys(v_locks) k)
    )
  );

  return jsonb_build_object(
    'status', 'ok', 'person_id', v_person_id,
    'job_id', v_job_id, 'duplicate', false
  );
end;
$function$
```

Grants: postgres → EXECUTE, service_role → EXECUTE

### submit_cadastro(payload jsonb)

```sql
CREATE OR REPLACE FUNCTION public.submit_cadastro(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
  v_phone         text;
  v_submission_id text;
  v_birth_date    date;
  v_person_id     uuid;
  v_locks         jsonb;
  v_incoming_extra jsonb;
  v_consent       jsonb;
  v_motivation    text;
begin
  -- ── validações ────────────────────────────────────────────────────
  v_phone := payload->>'phone';
  if v_phone is null or v_phone !~ '^\+[1-9]\d{7,14}$' then
    raise exception 'invalid_phone';
  end if;

  v_submission_id := payload->>'submission_id';
  if v_submission_id is null or v_submission_id !~
     '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception 'invalid_submission_id';
  end if;

  -- ── idempotência (curto-circuito antes de qualquer write) ────────
  -- events.payload qualificado: 'payload' também é parâmetro da função.
  v_person_id := null;
  select person_id into v_person_id
  from public.events
  where event_type = 'form.cadastro_submitted'
    and events.payload->>'submission_id' = v_submission_id
  limit 1;

  if v_person_id is not null then
    return jsonb_build_object(
      'status', 'ok',
      'person_id', v_person_id,
      'duplicate', true
    );
  end if;

  -- ── validação de idade ───────────────────────────────────────────
  v_birth_date := nullif(payload->>'birth_date', '')::date;

  if v_birth_date is not null then
    if extract(year from age(current_date, v_birth_date)) < 18 then
      raise exception 'minor_not_allowed';
    end if;
  end if;

  -- ── LER LOCKS EXISTENTES ─────────────────────────────────────────
  select coalesce(extra_data->'admin_locks', '{}'::jsonb)
  into v_locks
  from public.people
  where phone = v_phone and deleted_at is null;

  v_locks := coalesce(v_locks, '{}'::jsonb);
  v_incoming_extra := coalesce(payload->'extra_data', '{}'::jsonb);

  v_incoming_extra := v_incoming_extra - array(
    select jsonb_object_keys(v_locks)
    intersect
    select jsonb_object_keys(v_incoming_extra)
  );

  -- ── people (upsert com locks) ────────────────────────────────────
  insert into public.people (phone, name, email, birth_date, lat, lng, extra_data, identified_at)
  values (
    v_phone,
    nullif(payload->>'name', ''),
    nullif(payload->>'email', ''),
    v_birth_date,
    (payload->>'lat')::double precision,
    (payload->>'lng')::double precision,
    v_incoming_extra,
    now()
  )
  on conflict (phone) where (deleted_at is null)
  do update set
    name = case
      when v_locks ? 'name' then people.name
      else coalesce(nullif(excluded.name, ''), people.name)
    end,
    email = case
      when v_locks ? 'email' then people.email
      else coalesce(nullif(excluded.email, ''), people.email)
    end,
    birth_date = case
      when v_locks ? 'birth_date' then people.birth_date
      else coalesce(excluded.birth_date, people.birth_date)
    end,
    phone = case
      when v_locks ? 'phone' then people.phone
      else people.phone
    end,
    lat  = coalesce(excluded.lat, people.lat),
    lng  = coalesce(excluded.lng, people.lng),
    extra_data    = people.extra_data || excluded.extra_data,
    identified_at = coalesce(people.identified_at, now())
  returning id into v_person_id;

  -- ── consents (append-only) ───────────────────────────────────────
  for v_consent in select * from jsonb_array_elements(coalesce(payload->'consents', '[]'::jsonb))
  loop
    insert into public.consents (person_id, consent_type, granted, valid_until, source, policy_version)
    values (
      v_person_id,
      (v_consent->>'type')::public.consent_type,
      (v_consent->>'granted')::boolean,
      case when v_consent ? 'valid_months'
           then now() + make_interval(months => (v_consent->>'valid_months')::int)
           else null end,
      coalesce(payload->>'source', 'form_cadastro'),
      coalesce(v_consent->>'policy_version', 'cadastro-v1-2026-07')
    );
  end loop;

  -- ── motivation (append-only, job_id null pro /cadastro) ─────────
  v_motivation := nullif(trim(coalesce(payload->>'motivation', '')), '');
  if v_motivation is not null then
    insert into public.motivations (person_id, job_id, content, source)
    values (v_person_id, null, v_motivation, coalesce(payload->>'source', 'form_cadastro'));
  end if;

  -- ── event (com submission_id no payload) ─────────────────────────
  insert into public.events (person_id, event_type, source, payload)
  values (
    v_person_id,
    'form.cadastro_submitted',
    coalesce(payload->>'source', 'form_cadastro'),
    jsonb_build_object(
      'mode', coalesce(payload->>'mode', 'unknown'),
      'locked_fields_ignored', (select array_agg(k) from jsonb_object_keys(v_locks) k),
      'submission_id', v_submission_id
    )
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
| 20260720033902 | emenda_d_idempotencia_cadastro |
| 20260720034258 | emenda_d_rename_idempotent_to_duplicate |
| 20260720041048 | emenda_d_fix_ambiguous_payload |
| 20260720045409 | emenda_d_restore_original_header |
| 20260810013341 | add_scheduled_at_and_admin_views |
| 20260810020309 | fix_views_security_and_attention_rank |
| 20260810185522 | add_label_job_created_manual |
| 20260818040603 | add_service_type_and_artist_to_jobs |
| 20260819034439 | add_tags_foundation |
| 20260819034656 | add_calendar_mirror |
| 20260823232828 | add_service_type_to_calendar_events |
