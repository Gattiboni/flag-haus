-- Schema — Flag Haus CRM
-- Gerado por `npm run moas`. Não editar à mão.
--
-- ⚠️ NÃO TESTADO: este arquivo nunca foi executado contra um banco vazio.
--    Reconstrução do schema a partir dele é presumida, não verificada.
--
-- ALVO: um projeto Supabase NOVO e vazio.
-- Requer os roles `anon`, `authenticated`, `service_role` e as extensões
-- do catálogo Supabase. NÃO roda em Postgres vanilla.
--
-- NÃO contém dados. NÃO contém os schemas geridos pelo Supabase
-- (auth, storage, realtime, vault) — apenas o `public`.

set check_function_bodies = off;

-- 1. extensões
create schema if not exists "extensions";
create schema if not exists "vault";
create extension if not exists "pg_stat_statements" with schema "extensions";
create extension if not exists "pgcrypto" with schema "extensions";
create extension if not exists "plpgsql" with schema "pg_catalog";
create extension if not exists "postgis" with schema "extensions";
create extension if not exists "supabase_vault" with schema "vault";
create extension if not exists "uuid-ossp" with schema "extensions";

-- 2. enums
create type "public"."consent_type" as enum ('procedure', 'lgpd', 'image', 'marketing', 'health');
create type "public"."job_status" as enum ('quoted', 'confirmed', 'executed', 'cancelled', 'no_response');
create type "public"."lifecycle_stage" as enum ('lead', 'prospect', 'opportunity', 'customer', 'recurring', 'dormant', 'lost');
create type "public"."user_role" as enum ('admin', 'viewer');

-- 3. funções
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

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
$function$;

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

  v_birth_date := nullif(payload->>'birth_date', '')::date;

  if v_birth_date is not null then
    if extract(year from age(current_date, v_birth_date)) < 18 then
      raise exception 'minor_not_allowed';
    end if;
  end if;

  -- ── LER LOCKS EXISTENTES ─────────────────────────────────────────
  -- Se a pessoa já existe, precisamos saber quais chaves estão travadas
  -- ANTES do upsert, pra remover do payload de entrada os campos que
  -- devem ser mantidos como estão.
  select coalesce(extra_data->'admin_locks', '{}'::jsonb)
  into v_locks
  from public.people
  where phone = v_phone and deleted_at is null;

  v_locks := coalesce(v_locks, '{}'::jsonb);
  v_incoming_extra := coalesce(payload->'extra_data', '{}'::jsonb);

  -- Remove do extra_data recebido as chaves que estão travadas.
  -- Postgres suporta jsonb - text: remove uma chave. Iteramos.
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
    -- colunas diretas: CASE por chave de admin_locks
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
    -- phone não pode ser alterado pelo próprio upsert (é a chave do ON CONFLICT),
    -- mas o CASE fica registrado por simetria; o valor é o mesmo.
    phone = case
      when v_locks ? 'phone' then people.phone
      else people.phone
    end,
    -- lat/lng não são travados (não vieram na §5-bis) — comportamento antigo
    lat  = coalesce(excluded.lat, people.lat),
    lng  = coalesce(excluded.lng, people.lng),
    -- extra_data: merge com o v_incoming_extra JÁ FILTRADO acima
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

  -- ── event ────────────────────────────────────────────────────────
  insert into public.events (person_id, event_type, source, payload)
  values (
    v_person_id,
    'form.cadastro_submitted',
    coalesce(payload->>'source', 'form_cadastro'),
    jsonb_build_object(
      'mode', coalesce(payload->>'mode', 'unknown'),
      'locked_fields_ignored', (select array_agg(k) from jsonb_object_keys(v_locks) k)
    )
  );

  return jsonb_build_object('status', 'ok', 'person_id', v_person_id);
end;
$function$;

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
$function$;

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
$function$;

-- 4. tabelas
create table "public"."clinical_records" (
  "id" uuid default uuid_generate_v7() not null,
  "person_id" uuid not null,
  "job_id" uuid,
  "has_allergies" boolean,
  "allergies_detail" text,
  "takes_medication" boolean,
  "medications_detail" text,
  "has_diabetes" boolean,
  "has_skin_condition" boolean,
  "skin_condition_detail" text,
  "pregnancy_status" text,
  "health_notes" text,
  "recent_substances" text,
  "filled_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."consents" (
  "id" uuid default uuid_generate_v7() not null,
  "person_id" uuid not null,
  "job_id" uuid,
  "consent_type" consent_type not null,
  "granted" boolean not null,
  "valid_until" timestamp with time zone,
  "source" text,
  "notes" text,
  "granted_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null,
  "policy_version" text not null
);

create table "public"."customer_segments_snapshot" (
  "id" uuid default uuid_generate_v7() not null,
  "person_id" uuid not null,
  "snapshot_month" date not null,
  "lifecycle_stage" lifecycle_stage not null,
  "rfm_segment" text,
  "ltv" numeric(10,2),
  "jobs_count" integer default 0 not null,
  "jobs_executed_count" integer default 0 not null,
  "recency_days" integer,
  "frequency_count" integer,
  "monetary_total" numeric(10,2),
  "created_at" timestamp with time zone default now() not null
);

create table "public"."events" (
  "id" uuid default uuid_generate_v7() not null,
  "person_id" uuid,
  "anonymous_id" text,
  "job_id" uuid,
  "event_type" text not null,
  "source" text,
  "payload" jsonb default '{}'::jsonb not null,
  "occurred_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null,
  "actor_id" uuid
);

create table "public"."identity_links" (
  "id" uuid default uuid_generate_v7() not null,
  "person_id" uuid not null,
  "anonymous_id" text not null,
  "source" text,
  "linked_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."jobs" (
  "id" uuid default uuid_generate_v7() not null,
  "person_id" uuid not null,
  "status" job_status default 'quoted'::job_status not null,
  "quoted_price" numeric(10,2),
  "final_price" numeric(10,2),
  "quoted_at" timestamp with time zone,
  "confirmed_at" timestamp with time zone,
  "executed_at" timestamp with time zone,
  "cancelled_at" timestamp with time zone,
  "description" text,
  "body_region" text,
  "style" text,
  "size_cm" numeric(5,1),
  "extra_data" jsonb default '{}'::jsonb not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "deleted_at" timestamp with time zone
);

create table "public"."lifecycle_transitions" (
  "id" uuid default uuid_generate_v7() not null,
  "person_id" uuid not null,
  "from_stage" lifecycle_stage,
  "to_stage" lifecycle_stage not null,
  "changed_by" uuid,
  "reason" text,
  "changed_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."motivations" (
  "id" uuid default uuid_generate_v7() not null,
  "person_id" uuid not null,
  "job_id" uuid,
  "content" text not null,
  "source" text,
  "recorded_at" timestamp with time zone default now() not null,
  "created_at" timestamp with time zone default now() not null
);

create table "public"."people" (
  "id" uuid default uuid_generate_v7() not null,
  "phone" text not null,
  "name" text,
  "email" text,
  "birth_date" date,
  "lifecycle_stage" lifecycle_stage default 'lead'::lifecycle_stage not null,
  "vip_flag" boolean default false not null,
  "difficult_flag" boolean default false not null,
  "lat" double precision,
  "lng" double precision,
  "location" geography(Point,4326),
  "extra_data" jsonb default '{}'::jsonb not null,
  "identified_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "deleted_at" timestamp with time zone
);

create table "public"."user_roles" (
  "id" uuid default uuid_generate_v7() not null,
  "user_id" uuid not null,
  "role" user_role default 'viewer'::user_role not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null
);

-- 5. constraints
alter table "public"."clinical_records" add constraint "clinical_records_pkey" PRIMARY KEY (id);
alter table "public"."clinical_records" add constraint "clinical_pregnancy_valid" CHECK (((pregnancy_status IS NULL) OR (pregnancy_status = ANY (ARRAY['pregnant'::text, 'breastfeeding'::text, 'no'::text, 'prefer_not_say'::text, 'not_applicable'::text]))));
alter table "public"."clinical_records" add constraint "clinical_substances_valid" CHECK (((recent_substances IS NULL) OR (recent_substances = ANY (ARRAY['will_not'::text, 'will'::text, 'discuss_in_session'::text]))));
alter table "public"."consents" add constraint "consents_pkey" PRIMARY KEY (id);
alter table "public"."customer_segments_snapshot" add constraint "customer_segments_snapshot_pkey" PRIMARY KEY (id);
alter table "public"."customer_segments_snapshot" add constraint "snapshot_jobs_count_non_negative" CHECK (((jobs_count >= 0) AND (jobs_executed_count >= 0)));
alter table "public"."customer_segments_snapshot" add constraint "snapshot_ltv_non_negative" CHECK (((ltv IS NULL) OR (ltv >= (0)::numeric)));
alter table "public"."customer_segments_snapshot" add constraint "snapshot_month_first_day" CHECK ((snapshot_month = (date_trunc('month'::text, (snapshot_month)::timestamp with time zone))::date));
alter table "public"."events" add constraint "events_pkey" PRIMARY KEY (id);
alter table "public"."events" add constraint "events_event_type_not_blank" CHECK ((length(TRIM(BOTH FROM event_type)) > 0));
alter table "public"."events" add constraint "events_has_identifier" CHECK (((person_id IS NOT NULL) OR (anonymous_id IS NOT NULL)));
alter table "public"."identity_links" add constraint "identity_links_pkey" PRIMARY KEY (id);
alter table "public"."identity_links" add constraint "identity_links_anonymous_id_not_blank" CHECK ((length(TRIM(BOTH FROM anonymous_id)) > 0));
alter table "public"."jobs" add constraint "jobs_pkey" PRIMARY KEY (id);
alter table "public"."jobs" add constraint "jobs_final_price_non_negative" CHECK (((final_price IS NULL) OR (final_price >= (0)::numeric)));
alter table "public"."jobs" add constraint "jobs_quoted_price_non_negative" CHECK (((quoted_price IS NULL) OR (quoted_price >= (0)::numeric)));
alter table "public"."jobs" add constraint "jobs_size_non_negative" CHECK (((size_cm IS NULL) OR (size_cm >= (0)::numeric)));
alter table "public"."lifecycle_transitions" add constraint "lifecycle_transitions_pkey" PRIMARY KEY (id);
alter table "public"."lifecycle_transitions" add constraint "lifecycle_transitions_stages_differ" CHECK (((from_stage IS NULL) OR (from_stage <> to_stage)));
alter table "public"."motivations" add constraint "motivations_pkey" PRIMARY KEY (id);
alter table "public"."motivations" add constraint "motivations_content_not_blank" CHECK ((length(TRIM(BOTH FROM content)) > 0));
alter table "public"."people" add constraint "people_pkey" PRIMARY KEY (id);
alter table "public"."people" add constraint "people_email_format" CHECK (((email IS NULL) OR (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text)));
alter table "public"."people" add constraint "people_lat_range" CHECK (((lat IS NULL) OR ((lat >= ('-90'::integer)::double precision) AND (lat <= (90)::double precision))));
alter table "public"."people" add constraint "people_lng_range" CHECK (((lng IS NULL) OR ((lng >= ('-180'::integer)::double precision) AND (lng <= (180)::double precision))));
alter table "public"."people" add constraint "people_phone_not_blank" CHECK ((length(TRIM(BOTH FROM phone)) > 0));
alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY (id);
alter table "public"."clinical_records" add constraint "clinical_records_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
alter table "public"."clinical_records" add constraint "clinical_records_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT;
alter table "public"."consents" add constraint "consents_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
alter table "public"."consents" add constraint "consents_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT;
alter table "public"."customer_segments_snapshot" add constraint "customer_segments_snapshot_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;
alter table "public"."events" add constraint "events_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
alter table "public"."events" add constraint "events_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;
alter table "public"."identity_links" add constraint "identity_links_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;
alter table "public"."jobs" add constraint "jobs_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE RESTRICT;
alter table "public"."lifecycle_transitions" add constraint "lifecycle_transitions_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;
alter table "public"."motivations" add constraint "motivations_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
alter table "public"."motivations" add constraint "motivations_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

-- 6. índices
CREATE INDEX clinical_records_job_id_idx ON public.clinical_records USING btree (job_id) WHERE (job_id IS NOT NULL);
CREATE INDEX clinical_records_person_id_idx ON public.clinical_records USING btree (person_id, filled_at DESC);
CREATE INDEX consents_job_id_idx ON public.consents USING btree (job_id, granted_at DESC) WHERE (job_id IS NOT NULL);
CREATE INDEX consents_person_type_granted_idx ON public.consents USING btree (person_id, consent_type, granted_at DESC);
CREATE INDEX consents_type_granted_idx ON public.consents USING btree (consent_type, granted_at DESC);
CREATE INDEX snapshot_month_stage_idx ON public.customer_segments_snapshot USING btree (snapshot_month DESC, lifecycle_stage);
CREATE INDEX snapshot_person_month_desc_idx ON public.customer_segments_snapshot USING btree (person_id, snapshot_month DESC);
CREATE UNIQUE INDEX snapshot_person_month_unique ON public.customer_segments_snapshot USING btree (person_id, snapshot_month);
CREATE INDEX events_anonymous_id_occurred_at_idx ON public.events USING btree (anonymous_id, occurred_at DESC) WHERE (anonymous_id IS NOT NULL);
CREATE INDEX events_event_type_idx ON public.events USING btree (event_type, occurred_at DESC);
CREATE INDEX events_job_id_idx ON public.events USING btree (job_id, occurred_at DESC) WHERE (job_id IS NOT NULL);
CREATE INDEX events_person_id_occurred_at_idx ON public.events USING btree (person_id, occurred_at DESC) WHERE (person_id IS NOT NULL);
CREATE INDEX events_source_idx ON public.events USING btree (source, occurred_at DESC) WHERE (source IS NOT NULL);
CREATE UNIQUE INDEX identity_links_anonymous_id_unique ON public.identity_links USING btree (anonymous_id);
CREATE INDEX identity_links_person_id_idx ON public.identity_links USING btree (person_id);
CREATE INDEX jobs_executed_at_idx ON public.jobs USING btree (executed_at DESC) WHERE ((deleted_at IS NULL) AND (executed_at IS NOT NULL));
CREATE INDEX jobs_person_id_idx ON public.jobs USING btree (person_id) WHERE (deleted_at IS NULL);
CREATE INDEX jobs_status_idx ON public.jobs USING btree (status) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX jobs_submission_id_unique ON public.jobs USING btree (((extra_data ->> 'submission_id'::text))) WHERE ((extra_data ? 'submission_id'::text) AND (deleted_at IS NULL));
CREATE INDEX lifecycle_transitions_person_id_idx ON public.lifecycle_transitions USING btree (person_id, changed_at DESC);
CREATE INDEX lifecycle_transitions_to_stage_idx ON public.lifecycle_transitions USING btree (to_stage, changed_at DESC);
CREATE INDEX motivations_job_id_idx ON public.motivations USING btree (job_id) WHERE (job_id IS NOT NULL);
CREATE INDEX motivations_person_id_idx ON public.motivations USING btree (person_id, recorded_at DESC);
CREATE INDEX people_email_idx ON public.people USING btree (lower(email)) WHERE ((deleted_at IS NULL) AND (email IS NOT NULL));
CREATE INDEX people_lifecycle_stage_idx ON public.people USING btree (lifecycle_stage) WHERE (deleted_at IS NULL);
CREATE INDEX people_location_gix ON public.people USING gist (location) WHERE ((deleted_at IS NULL) AND (location IS NOT NULL));
CREATE UNIQUE INDEX people_phone_unique ON public.people USING btree (phone) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX user_roles_user_id_unique ON public.user_roles USING btree (user_id);

-- 7. triggers
CREATE TRIGGER jobs_set_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER people_set_updated_at BEFORE UPDATE ON public.people FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER people_sync_location BEFORE INSERT OR UPDATE OF lat, lng ON public.people FOR EACH ROW EXECUTE FUNCTION sync_people_location();
CREATE TRIGGER user_roles_set_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. row level security
alter table "public"."clinical_records" enable row level security;
alter table "public"."consents" enable row level security;
alter table "public"."customer_segments_snapshot" enable row level security;
alter table "public"."events" enable row level security;
alter table "public"."identity_links" enable row level security;
alter table "public"."jobs" enable row level security;
alter table "public"."lifecycle_transitions" enable row level security;
alter table "public"."motivations" enable row level security;
alter table "public"."people" enable row level security;
alter table "public"."user_roles" enable row level security;

-- 9. policies
create policy "deny_anon_select" on "public"."clinical_records"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."clinical_records"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."clinical_records"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."clinical_records"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."consents"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."consents"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."consents"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."consents"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."customer_segments_snapshot"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."customer_segments_snapshot"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."customer_segments_snapshot"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."customer_segments_snapshot"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."events"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."events"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."events"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."events"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."identity_links"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."identity_links"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."identity_links"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."identity_links"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."jobs"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."jobs"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."jobs"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."jobs"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."lifecycle_transitions"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."lifecycle_transitions"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."lifecycle_transitions"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."lifecycle_transitions"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."motivations"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."motivations"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."motivations"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."motivations"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."people"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."people"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."people"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."people"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_anon_select" on "public"."user_roles"
  as permissive
  for select
  to 
  using (false);
create policy "deny_anon_write" on "public"."user_roles"
  as permissive
  for all
  to 
  using (false)
  with check (false);
create policy "deny_authenticated_select" on "public"."user_roles"
  as permissive
  for select
  to 
  using (false);
create policy "deny_authenticated_write" on "public"."user_roles"
  as permissive
  for all
  to 
  using (false)
  with check (false);

-- 10. grants
revoke all on table "public"."clinical_records" from public, anon, authenticated, service_role;
grant delete on table "public"."clinical_records" to anon;
grant insert on table "public"."clinical_records" to anon;
grant maintain on table "public"."clinical_records" to anon;
grant references on table "public"."clinical_records" to anon;
grant select on table "public"."clinical_records" to anon;
grant trigger on table "public"."clinical_records" to anon;
grant truncate on table "public"."clinical_records" to anon;
grant update on table "public"."clinical_records" to anon;
grant delete on table "public"."clinical_records" to authenticated;
grant insert on table "public"."clinical_records" to authenticated;
grant maintain on table "public"."clinical_records" to authenticated;
grant references on table "public"."clinical_records" to authenticated;
grant select on table "public"."clinical_records" to authenticated;
grant trigger on table "public"."clinical_records" to authenticated;
grant truncate on table "public"."clinical_records" to authenticated;
grant update on table "public"."clinical_records" to authenticated;
grant delete on table "public"."clinical_records" to postgres;
grant insert on table "public"."clinical_records" to postgres;
grant maintain on table "public"."clinical_records" to postgres;
grant references on table "public"."clinical_records" to postgres;
grant select on table "public"."clinical_records" to postgres;
grant trigger on table "public"."clinical_records" to postgres;
grant truncate on table "public"."clinical_records" to postgres;
grant update on table "public"."clinical_records" to postgres;
grant delete on table "public"."clinical_records" to service_role;
grant insert on table "public"."clinical_records" to service_role;
grant maintain on table "public"."clinical_records" to service_role;
grant references on table "public"."clinical_records" to service_role;
grant select on table "public"."clinical_records" to service_role;
grant trigger on table "public"."clinical_records" to service_role;
grant truncate on table "public"."clinical_records" to service_role;
grant update on table "public"."clinical_records" to service_role;
revoke all on table "public"."consents" from public, anon, authenticated, service_role;
grant delete on table "public"."consents" to anon;
grant insert on table "public"."consents" to anon;
grant maintain on table "public"."consents" to anon;
grant references on table "public"."consents" to anon;
grant select on table "public"."consents" to anon;
grant trigger on table "public"."consents" to anon;
grant truncate on table "public"."consents" to anon;
grant update on table "public"."consents" to anon;
grant delete on table "public"."consents" to authenticated;
grant insert on table "public"."consents" to authenticated;
grant maintain on table "public"."consents" to authenticated;
grant references on table "public"."consents" to authenticated;
grant select on table "public"."consents" to authenticated;
grant trigger on table "public"."consents" to authenticated;
grant truncate on table "public"."consents" to authenticated;
grant update on table "public"."consents" to authenticated;
grant delete on table "public"."consents" to postgres;
grant insert on table "public"."consents" to postgres;
grant maintain on table "public"."consents" to postgres;
grant references on table "public"."consents" to postgres;
grant select on table "public"."consents" to postgres;
grant trigger on table "public"."consents" to postgres;
grant truncate on table "public"."consents" to postgres;
grant update on table "public"."consents" to postgres;
grant delete on table "public"."consents" to service_role;
grant insert on table "public"."consents" to service_role;
grant maintain on table "public"."consents" to service_role;
grant references on table "public"."consents" to service_role;
grant select on table "public"."consents" to service_role;
grant trigger on table "public"."consents" to service_role;
grant truncate on table "public"."consents" to service_role;
grant update on table "public"."consents" to service_role;
revoke all on table "public"."customer_segments_snapshot" from public, anon, authenticated, service_role;
grant delete on table "public"."customer_segments_snapshot" to anon;
grant insert on table "public"."customer_segments_snapshot" to anon;
grant maintain on table "public"."customer_segments_snapshot" to anon;
grant references on table "public"."customer_segments_snapshot" to anon;
grant select on table "public"."customer_segments_snapshot" to anon;
grant trigger on table "public"."customer_segments_snapshot" to anon;
grant truncate on table "public"."customer_segments_snapshot" to anon;
grant update on table "public"."customer_segments_snapshot" to anon;
grant delete on table "public"."customer_segments_snapshot" to authenticated;
grant insert on table "public"."customer_segments_snapshot" to authenticated;
grant maintain on table "public"."customer_segments_snapshot" to authenticated;
grant references on table "public"."customer_segments_snapshot" to authenticated;
grant select on table "public"."customer_segments_snapshot" to authenticated;
grant trigger on table "public"."customer_segments_snapshot" to authenticated;
grant truncate on table "public"."customer_segments_snapshot" to authenticated;
grant update on table "public"."customer_segments_snapshot" to authenticated;
grant delete on table "public"."customer_segments_snapshot" to postgres;
grant insert on table "public"."customer_segments_snapshot" to postgres;
grant maintain on table "public"."customer_segments_snapshot" to postgres;
grant references on table "public"."customer_segments_snapshot" to postgres;
grant select on table "public"."customer_segments_snapshot" to postgres;
grant trigger on table "public"."customer_segments_snapshot" to postgres;
grant truncate on table "public"."customer_segments_snapshot" to postgres;
grant update on table "public"."customer_segments_snapshot" to postgres;
grant delete on table "public"."customer_segments_snapshot" to service_role;
grant insert on table "public"."customer_segments_snapshot" to service_role;
grant maintain on table "public"."customer_segments_snapshot" to service_role;
grant references on table "public"."customer_segments_snapshot" to service_role;
grant select on table "public"."customer_segments_snapshot" to service_role;
grant trigger on table "public"."customer_segments_snapshot" to service_role;
grant truncate on table "public"."customer_segments_snapshot" to service_role;
grant update on table "public"."customer_segments_snapshot" to service_role;
revoke all on table "public"."events" from public, anon, authenticated, service_role;
grant delete on table "public"."events" to anon;
grant insert on table "public"."events" to anon;
grant maintain on table "public"."events" to anon;
grant references on table "public"."events" to anon;
grant select on table "public"."events" to anon;
grant trigger on table "public"."events" to anon;
grant truncate on table "public"."events" to anon;
grant update on table "public"."events" to anon;
grant delete on table "public"."events" to authenticated;
grant insert on table "public"."events" to authenticated;
grant maintain on table "public"."events" to authenticated;
grant references on table "public"."events" to authenticated;
grant select on table "public"."events" to authenticated;
grant trigger on table "public"."events" to authenticated;
grant truncate on table "public"."events" to authenticated;
grant update on table "public"."events" to authenticated;
grant delete on table "public"."events" to postgres;
grant insert on table "public"."events" to postgres;
grant maintain on table "public"."events" to postgres;
grant references on table "public"."events" to postgres;
grant select on table "public"."events" to postgres;
grant trigger on table "public"."events" to postgres;
grant truncate on table "public"."events" to postgres;
grant update on table "public"."events" to postgres;
grant delete on table "public"."events" to service_role;
grant insert on table "public"."events" to service_role;
grant maintain on table "public"."events" to service_role;
grant references on table "public"."events" to service_role;
grant select on table "public"."events" to service_role;
grant trigger on table "public"."events" to service_role;
grant truncate on table "public"."events" to service_role;
grant update on table "public"."events" to service_role;
revoke all on table "public"."identity_links" from public, anon, authenticated, service_role;
grant delete on table "public"."identity_links" to anon;
grant insert on table "public"."identity_links" to anon;
grant maintain on table "public"."identity_links" to anon;
grant references on table "public"."identity_links" to anon;
grant select on table "public"."identity_links" to anon;
grant trigger on table "public"."identity_links" to anon;
grant truncate on table "public"."identity_links" to anon;
grant update on table "public"."identity_links" to anon;
grant delete on table "public"."identity_links" to authenticated;
grant insert on table "public"."identity_links" to authenticated;
grant maintain on table "public"."identity_links" to authenticated;
grant references on table "public"."identity_links" to authenticated;
grant select on table "public"."identity_links" to authenticated;
grant trigger on table "public"."identity_links" to authenticated;
grant truncate on table "public"."identity_links" to authenticated;
grant update on table "public"."identity_links" to authenticated;
grant delete on table "public"."identity_links" to postgres;
grant insert on table "public"."identity_links" to postgres;
grant maintain on table "public"."identity_links" to postgres;
grant references on table "public"."identity_links" to postgres;
grant select on table "public"."identity_links" to postgres;
grant trigger on table "public"."identity_links" to postgres;
grant truncate on table "public"."identity_links" to postgres;
grant update on table "public"."identity_links" to postgres;
grant delete on table "public"."identity_links" to service_role;
grant insert on table "public"."identity_links" to service_role;
grant maintain on table "public"."identity_links" to service_role;
grant references on table "public"."identity_links" to service_role;
grant select on table "public"."identity_links" to service_role;
grant trigger on table "public"."identity_links" to service_role;
grant truncate on table "public"."identity_links" to service_role;
grant update on table "public"."identity_links" to service_role;
revoke all on table "public"."jobs" from public, anon, authenticated, service_role;
grant delete on table "public"."jobs" to anon;
grant insert on table "public"."jobs" to anon;
grant maintain on table "public"."jobs" to anon;
grant references on table "public"."jobs" to anon;
grant select on table "public"."jobs" to anon;
grant trigger on table "public"."jobs" to anon;
grant truncate on table "public"."jobs" to anon;
grant update on table "public"."jobs" to anon;
grant delete on table "public"."jobs" to authenticated;
grant insert on table "public"."jobs" to authenticated;
grant maintain on table "public"."jobs" to authenticated;
grant references on table "public"."jobs" to authenticated;
grant select on table "public"."jobs" to authenticated;
grant trigger on table "public"."jobs" to authenticated;
grant truncate on table "public"."jobs" to authenticated;
grant update on table "public"."jobs" to authenticated;
grant delete on table "public"."jobs" to postgres;
grant insert on table "public"."jobs" to postgres;
grant maintain on table "public"."jobs" to postgres;
grant references on table "public"."jobs" to postgres;
grant select on table "public"."jobs" to postgres;
grant trigger on table "public"."jobs" to postgres;
grant truncate on table "public"."jobs" to postgres;
grant update on table "public"."jobs" to postgres;
grant delete on table "public"."jobs" to service_role;
grant insert on table "public"."jobs" to service_role;
grant maintain on table "public"."jobs" to service_role;
grant references on table "public"."jobs" to service_role;
grant select on table "public"."jobs" to service_role;
grant trigger on table "public"."jobs" to service_role;
grant truncate on table "public"."jobs" to service_role;
grant update on table "public"."jobs" to service_role;
revoke all on table "public"."lifecycle_transitions" from public, anon, authenticated, service_role;
grant delete on table "public"."lifecycle_transitions" to anon;
grant insert on table "public"."lifecycle_transitions" to anon;
grant maintain on table "public"."lifecycle_transitions" to anon;
grant references on table "public"."lifecycle_transitions" to anon;
grant select on table "public"."lifecycle_transitions" to anon;
grant trigger on table "public"."lifecycle_transitions" to anon;
grant truncate on table "public"."lifecycle_transitions" to anon;
grant update on table "public"."lifecycle_transitions" to anon;
grant delete on table "public"."lifecycle_transitions" to authenticated;
grant insert on table "public"."lifecycle_transitions" to authenticated;
grant maintain on table "public"."lifecycle_transitions" to authenticated;
grant references on table "public"."lifecycle_transitions" to authenticated;
grant select on table "public"."lifecycle_transitions" to authenticated;
grant trigger on table "public"."lifecycle_transitions" to authenticated;
grant truncate on table "public"."lifecycle_transitions" to authenticated;
grant update on table "public"."lifecycle_transitions" to authenticated;
grant delete on table "public"."lifecycle_transitions" to postgres;
grant insert on table "public"."lifecycle_transitions" to postgres;
grant maintain on table "public"."lifecycle_transitions" to postgres;
grant references on table "public"."lifecycle_transitions" to postgres;
grant select on table "public"."lifecycle_transitions" to postgres;
grant trigger on table "public"."lifecycle_transitions" to postgres;
grant truncate on table "public"."lifecycle_transitions" to postgres;
grant update on table "public"."lifecycle_transitions" to postgres;
grant delete on table "public"."lifecycle_transitions" to service_role;
grant insert on table "public"."lifecycle_transitions" to service_role;
grant maintain on table "public"."lifecycle_transitions" to service_role;
grant references on table "public"."lifecycle_transitions" to service_role;
grant select on table "public"."lifecycle_transitions" to service_role;
grant trigger on table "public"."lifecycle_transitions" to service_role;
grant truncate on table "public"."lifecycle_transitions" to service_role;
grant update on table "public"."lifecycle_transitions" to service_role;
revoke all on table "public"."motivations" from public, anon, authenticated, service_role;
grant delete on table "public"."motivations" to anon;
grant insert on table "public"."motivations" to anon;
grant maintain on table "public"."motivations" to anon;
grant references on table "public"."motivations" to anon;
grant select on table "public"."motivations" to anon;
grant trigger on table "public"."motivations" to anon;
grant truncate on table "public"."motivations" to anon;
grant update on table "public"."motivations" to anon;
grant delete on table "public"."motivations" to authenticated;
grant insert on table "public"."motivations" to authenticated;
grant maintain on table "public"."motivations" to authenticated;
grant references on table "public"."motivations" to authenticated;
grant select on table "public"."motivations" to authenticated;
grant trigger on table "public"."motivations" to authenticated;
grant truncate on table "public"."motivations" to authenticated;
grant update on table "public"."motivations" to authenticated;
grant delete on table "public"."motivations" to postgres;
grant insert on table "public"."motivations" to postgres;
grant maintain on table "public"."motivations" to postgres;
grant references on table "public"."motivations" to postgres;
grant select on table "public"."motivations" to postgres;
grant trigger on table "public"."motivations" to postgres;
grant truncate on table "public"."motivations" to postgres;
grant update on table "public"."motivations" to postgres;
grant delete on table "public"."motivations" to service_role;
grant insert on table "public"."motivations" to service_role;
grant maintain on table "public"."motivations" to service_role;
grant references on table "public"."motivations" to service_role;
grant select on table "public"."motivations" to service_role;
grant trigger on table "public"."motivations" to service_role;
grant truncate on table "public"."motivations" to service_role;
grant update on table "public"."motivations" to service_role;
revoke all on table "public"."people" from public, anon, authenticated, service_role;
grant delete on table "public"."people" to anon;
grant insert on table "public"."people" to anon;
grant maintain on table "public"."people" to anon;
grant references on table "public"."people" to anon;
grant select on table "public"."people" to anon;
grant trigger on table "public"."people" to anon;
grant truncate on table "public"."people" to anon;
grant update on table "public"."people" to anon;
grant delete on table "public"."people" to authenticated;
grant insert on table "public"."people" to authenticated;
grant maintain on table "public"."people" to authenticated;
grant references on table "public"."people" to authenticated;
grant select on table "public"."people" to authenticated;
grant trigger on table "public"."people" to authenticated;
grant truncate on table "public"."people" to authenticated;
grant update on table "public"."people" to authenticated;
grant delete on table "public"."people" to postgres;
grant insert on table "public"."people" to postgres;
grant maintain on table "public"."people" to postgres;
grant references on table "public"."people" to postgres;
grant select on table "public"."people" to postgres;
grant trigger on table "public"."people" to postgres;
grant truncate on table "public"."people" to postgres;
grant update on table "public"."people" to postgres;
grant delete on table "public"."people" to service_role;
grant insert on table "public"."people" to service_role;
grant maintain on table "public"."people" to service_role;
grant references on table "public"."people" to service_role;
grant select on table "public"."people" to service_role;
grant trigger on table "public"."people" to service_role;
grant truncate on table "public"."people" to service_role;
grant update on table "public"."people" to service_role;
revoke all on table "public"."user_roles" from public, anon, authenticated, service_role;
grant delete on table "public"."user_roles" to anon;
grant insert on table "public"."user_roles" to anon;
grant maintain on table "public"."user_roles" to anon;
grant references on table "public"."user_roles" to anon;
grant select on table "public"."user_roles" to anon;
grant trigger on table "public"."user_roles" to anon;
grant truncate on table "public"."user_roles" to anon;
grant update on table "public"."user_roles" to anon;
grant delete on table "public"."user_roles" to authenticated;
grant insert on table "public"."user_roles" to authenticated;
grant maintain on table "public"."user_roles" to authenticated;
grant references on table "public"."user_roles" to authenticated;
grant select on table "public"."user_roles" to authenticated;
grant trigger on table "public"."user_roles" to authenticated;
grant truncate on table "public"."user_roles" to authenticated;
grant update on table "public"."user_roles" to authenticated;
grant delete on table "public"."user_roles" to postgres;
grant insert on table "public"."user_roles" to postgres;
grant maintain on table "public"."user_roles" to postgres;
grant references on table "public"."user_roles" to postgres;
grant select on table "public"."user_roles" to postgres;
grant trigger on table "public"."user_roles" to postgres;
grant truncate on table "public"."user_roles" to postgres;
grant update on table "public"."user_roles" to postgres;
grant delete on table "public"."user_roles" to service_role;
grant insert on table "public"."user_roles" to service_role;
grant maintain on table "public"."user_roles" to service_role;
grant references on table "public"."user_roles" to service_role;
grant select on table "public"."user_roles" to service_role;
grant trigger on table "public"."user_roles" to service_role;
grant truncate on table "public"."user_roles" to service_role;
grant update on table "public"."user_roles" to service_role;

revoke all on function "public"."set_updated_at"() from public, anon, authenticated, service_role;
grant execute on function "public"."set_updated_at"() to anon;
grant execute on function "public"."set_updated_at"() to authenticated;
grant execute on function "public"."set_updated_at"() to postgres;
grant execute on function "public"."set_updated_at"() to public;
grant execute on function "public"."set_updated_at"() to service_role;
revoke all on function "public"."submit_anamnese"(payload jsonb) from public, anon, authenticated, service_role;
grant execute on function "public"."submit_anamnese"(payload jsonb) to postgres;
grant execute on function "public"."submit_anamnese"(payload jsonb) to service_role;
revoke all on function "public"."submit_cadastro"(payload jsonb) from public, anon, authenticated, service_role;
grant execute on function "public"."submit_cadastro"(payload jsonb) to postgres;
grant execute on function "public"."submit_cadastro"(payload jsonb) to service_role;
revoke all on function "public"."sync_people_location"() from public, anon, authenticated, service_role;
grant execute on function "public"."sync_people_location"() to anon;
grant execute on function "public"."sync_people_location"() to authenticated;
grant execute on function "public"."sync_people_location"() to postgres;
grant execute on function "public"."sync_people_location"() to public;
grant execute on function "public"."sync_people_location"() to service_role;
revoke all on function "public"."uuid_generate_v7"() from public, anon, authenticated, service_role;
grant execute on function "public"."uuid_generate_v7"() to anon;
grant execute on function "public"."uuid_generate_v7"() to authenticated;
grant execute on function "public"."uuid_generate_v7"() to postgres;
grant execute on function "public"."uuid_generate_v7"() to public;
grant execute on function "public"."uuid_generate_v7"() to service_role;
