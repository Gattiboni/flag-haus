## Table `customer_segments_snapshot`

Foto mensal. Populada por pg_cron a partir de junho. Uma linha por pessoa por mês.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `person_id` | `uuid` |  |
| `snapshot_month` | `date` |  |
| `lifecycle_stage` | `lifecycle_stage` |  |
| `rfm_segment` | `text` |  Nullable |
| `ltv` | `numeric` |  Nullable |
| `jobs_count` | `int4` |  |
| `jobs_executed_count` | `int4` |  |
| `recency_days` | `int4` |  Nullable |
| `frequency_count` | `int4` |  Nullable |
| `monetary_total` | `numeric` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `events`

Timeline unificada. Marcos do funil e interações de marketing convivem aqui. event_type discrimina.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `person_id` | `uuid` |  Nullable |
| `anonymous_id` | `text` |  Nullable |
| `job_id` | `uuid` |  Nullable |
| `event_type` | `text` |  |
| `source` | `text` |  Nullable |
| `payload` | `jsonb` |  |
| `occurred_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `identity_links`

Resolve identidade: quando lead anônimo (clique de anúncio) vira pessoa identificada.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `person_id` | `uuid` |  |
| `anonymous_id` | `text` |  |
| `source` | `text` |  Nullable |
| `linked_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `jobs`

Cada orçamento/trabalho/cancelamento do Flag Haus. status discrimina o estado atual.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `person_id` | `uuid` |  |
| `status` | `job_status` |  |
| `quoted_price` | `numeric` |  Nullable |
| `final_price` | `numeric` |  Nullable |
| `quoted_at` | `timestamptz` |  Nullable |
| `confirmed_at` | `timestamptz` |  Nullable |
| `executed_at` | `timestamptz` |  Nullable |
| `cancelled_at` | `timestamptz` |  Nullable |
| `description` | `text` |  Nullable |
| `body_region` | `text` |  Nullable |
| `style` | `text` |  Nullable |
| `size_cm` | `numeric` |  Nullable |
| `extra_data` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `lifecycle_transitions`

Append-only. Cada mudança de people.lifecycle_stage gera linha aqui.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `person_id` | `uuid` |  |
| `from_stage` | `lifecycle_stage` |  Nullable |
| `to_stage` | `lifecycle_stage` |  |
| `changed_by` | `uuid` |  Nullable |
| `reason` | `text` |  Nullable |
| `changed_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `people`

Entidade central. Identidade frouxa: phone obrigatório, demais atributos preenchidos incrementalmente.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `phone` | `text` |  |
| `name` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `birth_date` | `date` |  Nullable |
| `lifecycle_stage` | `lifecycle_stage` |  |
| `vip_flag` | `bool` |  |
| `difficult_flag` | `bool` |  |
| `lat` | `float8` |  Nullable |
| `lng` | `float8` |  Nullable |
| `location` | `geography` |  Nullable |
| `extra_data` | `jsonb` |  |
| `identified_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `deleted_at` | `timestamptz` |  Nullable |

## Table `user_roles`

Mapeia auth.users.id → role. Lido pelo Auth Hook que injeta app_role no JWT.

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  |
| `role` | `user_role` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

