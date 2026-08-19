# Contrato de dados — Calendário + Tags (v1)

**Projeto:** CRM Flag Haus · **Data:** 19/08/2026 · **Status:** em revisão (Alan)
**Guia de escopo:** `funcionalidades_calendario_tags_flag_haus.md` (23 itens)
**Referência normativa de tags:** doc de mecânica de tags (CRUD, cascateamento e invariantes) já salvo em `docs/` — em qualquer conflito entre este contrato e aquele doc, aquele doc manda na mecânica de tags.
**Formato:** de-para auditável. SQL não versiona; as migrations são aplicadas via MCP após dry run aprovado, batidas contra este documento.

---

## 1. Princípios do desenho

1. **Fonte única de leitura:** o front consome UMA RPC (`calendar_events_between`). Nunca consulta o Google direto, nunca monta a agenda de fontes paralelas.
2. **Google é a fonte da verdade da agenda.** O espelho local existe pra leitura rápida, vínculo com o CRM e atribuição. No sync, o Google sobrescreve o espelho — sem merge, sem conflito.
3. **Write-through:** criar/editar pelo admin escreve NO Google primeiro; o espelho reflete na sequência. Falhou no Google, nada persiste local (zero evento fantasma).
4. **Cadeado protege os campos do Google, não o evento inteiro.** Metadados do CRM (vínculo de pessoa, artista, categoria corrigida) são editáveis em QUALQUER evento — eles moram no espelho e nunca escrevem no Google.
5. **Fuso:** toda resolução de data/janela em `America/Sao_Paulo` (fixo, Brasil sem DST desde 2019), na fonte E no front. O Google devolve RFC3339/UTC; a conversão é ponto único, mesmo padrão do `admin/_ui/format.ts`.
6. **Um escritor por coluna** (princípio herdado): `people.tags` só é escrita pelas actions de tag; campos Google-owned só pelo sync; campos CRM-owned só pelas actions do calendário.

---

## 2. Catálogo `tags` (tabela nova)

| Coluna | Tipo | Default / Check | Regra e motivo |
|---|---|---|---|
| `id` | uuid PK | `uuid_generate_v7()` | Padrão do projeto. |
| `name` | text NOT NULL | — | Exibição. MUTÁVEL: rename escreve só aqui e dispersa via indireção. |
| `slug` | text NOT NULL UNIQUE | — | **Identidade. IMUTÁVEL pós-criação.** Colisão é de slug, não de nome (mensagem de erro fala em slug). Gerado por UMA função canônica de normalização, módulo compartilhado. |
| `color` | text NOT NULL | — | Hex da paleta fixa (§10). Criação inline usa cor automática da paleta (menos usada; empate pela ordem). |
| `is_active` | boolean NOT NULL | `true` | Desativar = soft: bloqueia ENTRADA em contato novo, preserva quem tem, destrava SAÍDA (removível como órfã no editor). |
| `created_at` | timestamptz NOT NULL | `now()` | Auditoria mínima. |

Sem coluna `grupo` no v1 (ponto de extensão nomeado; adicionar depois é migration trivial). Sem tabela de junção, por decisão herdada da origem.

## 3. `people.tags` (coluna nova)

| Coluna | Tipo | Default / Check | Regra e motivo |
|---|---|---|---|
| `tags` | text[] NOT NULL | `'{}'` | Array de SLUGS, nunca nome/cor. Índice GIN. Sem FK: órfã é estado legítimo tratado na UI, não constraint. |

Escritores: **só as actions de tag** (família A do doc normativo). `submit_cadastro`, sync do calendário e qualquer import NUNCA tocam esta coluna. Validação na escrita: slug precisa existir E estar ativo pra ENTRAR; pra SAIR vale qualquer slug (órfão/desativado incluídos) — é a regra que evita o save travado.

## 4. `calendar_sources` (tabela nova)

| Coluna | Tipo | Default / Check | Regra e motivo |
|---|---|---|---|
| `id` | uuid PK | `uuid_generate_v7()` | — |
| `provider` | text NOT NULL | check `= 'google'` | v1 só Google; check afrouxa por migration quando houver segundo provider. |
| `external_id` | text NOT NULL | — | O calendar ID do Google. UNIQUE junto com `provider`. |
| `label` | text NOT NULL | — | "Horarios Flag Haus". Exibição/log. |
| `is_active` | boolean NOT NULL | `true` | Desligar uma fonte sem apagar histórico. |
| `sync_token` | text NULL | — | Token de sync incremental do Google. Invalidado (410) → limpa e refaz janela cheia. |
| `last_synced_at` | timestamptz NULL | — | Alimenta o carimbo "Última sincronização" da UI. |
| `created_at` | timestamptz NOT NULL | `now()` | — |

Plural desde o berço: agenda nova no futuro = INSERT, zero refactor.

## 5. `calendar_events` (tabela nova)

| Coluna | Tipo | Default / Check | Dono da escrita | Regra e motivo |
|---|---|---|---|---|
| `id` | uuid PK | `uuid_generate_v7()` | — | — |
| `source_id` | uuid NOT NULL → `calendar_sources` | — | sync | UNIQUE junto com `external_id`: chave do upsert. |
| `external_id` | text NOT NULL | — | sync/write-through | ID do evento no Google. |
| `title` | text NULL | — | **Google** | Sobrescrito em todo sync. |
| `description` | text NULL | — | **Google** | Idem. É onde o matcher procura telefone. |
| `starts_at` | timestamptz NOT NULL | — | **Google** | UTC no banco; conversão pra America/Sao_Paulo no ponto único. |
| `ends_at` | timestamptz NULL | — | **Google** | — |
| `all_day` | boolean NOT NULL | `false` | **Google** | Evento de dia inteiro (Férias). |
| `status` | text NOT NULL | check `in ('confirmed','cancelled')` | **Google** | Cancelou no Google → `cancelled` no sync; a RPC filtra. Nada de DELETE: histórico. |
| `origin` | text NOT NULL | check `in ('google','crm')` | criação | Setado UMA vez: `crm` no write-through, `google` no sync pra evento desconhecido. Upsert PRESERVA o existente. Define `editable`. |
| `creator_email` | text NULL | — | **Google** | Insumo do parser de artista (le.bodypiercer@ → lethicia). |
| `category` | text NOT NULL | check `in ('sessao','outros')` | sync (auto) / CRM (manual) | Parser no sync (§9). `aniversario` NÃO mora aqui — é computado na RPC. Correção manual trava o recompute (§6). |
| `artist` | text NULL | — | sync (auto) / CRM (manual) | Lowercase, mesmo vocabulário de `jobs.artist`. Parser no sync (§9); correção manual trava o recompute. |
| `meta_source` | jsonb NOT NULL | `'{}'` | CRM | Flags de trava do recompute: `{artist_manual: bool, category_manual: bool}`. Sync recomputa artista/categoria SÓ quando a flag correspondente é falsa. |
| `person_id` | uuid NULL → `people` | — | matcher (auto) / CRM (manual) | O vínculo evento→contato. Matcher só preenche quando NULL; vínculo manual NUNCA é sobrescrito pelo matcher. |
| `match_source` | text NULL | check `in ('phone','manual')` | idem | Auditoria do vínculo — β e bandeja dependem disso. |
| `created_at` / `updated_at` | timestamptz NOT NULL | `now()` / trigger | — | `set_updated_at()` existente. |

Índices além dos UNIQUE: `starts_at` (janela da RPC) e `person_id` (ficha futura).

## 6. Propriedade dos campos — a tabela que evita briga de escrita

| Campo | Sync sobrescreve? | CRM edita? | Observação |
|---|---|---|---|
| title, description, starts_at, ends_at, all_day, status, creator_email | **Sempre** | Só via write-through (origin=crm), que escreve no Google e o sync confirma | "Google vence". |
| origin | Nunca (preserva) | Nunca | Imutável pós-criação. |
| artist, category | Só se flag `*_manual` = false | Sim, de qualquer evento (seta a flag) | Metadado CRM: não escreve no Google, cadeado não se aplica. |
| person_id, match_source | Matcher só preenche NULL | Sim (vincular/desvincular na bandeja/drawer) | Manual > automático, sempre. |

## 7. Retorno da RPC `calendar_events_between(p_start, p_end)`

Parâmetros em date/timestamptz; janela resolvida em America/Sao_Paulo. Retorna espelho (status ≠ cancelled, fonte ativa) ∪ aniversários. Uma linha por evento:

| Campo | Tipo | Origem | Regra |
|---|---|---|---|
| `event_id` | uuid NULL | calendar_events.id | NULL pra aniversário (não é linha de tabela). |
| `kind` | text | derivado | `'event'` ou `'birthday'`. |
| `title` | text | espelho / montado | Aniversário: "Aniversário — {nome}". |
| `starts_at` / `ends_at` | timestamptz | espelho / computado | Aniversário: ocorrência DO ANO da janela, resolvida NO SQL (recorrência nunca no front), all_day. |
| `all_day` | boolean | espelho / true | — |
| `category` | text | espelho / fixo | `sessao` \| `outros` \| `aniversario`. |
| `origin` | text | espelho / fixo | `google` \| `crm` \| `birthday`. |
| `editable` | boolean | derivado | `origin = 'crm'`. O front OBEDECE, não deduz. |
| `artist` | text NULL | espelho | — |
| `person_id` | uuid NULL | espelho / people.id | Aniversário sempre tem. |
| `person_name` / `person_phone` | text NULL | join people | Pra card/drawer sem segundo fetch. |
| `person_tags` | text[] NULL | people.tags | Slugs crus; o front resolve slug→(nome,cor) contra o catálogo (indireção do doc normativo). |
| `meta` | jsonb | espelho | `description` do evento + flags relevantes pro drawer. |

Aniversários filtram `deleted_at is null`. Permissões da RPC: mesmo rito das views (Decisão #032) — revoke de anon/authenticated; leitura via service_role nas Server Actions.

Pra alimentar o filtro/badges: a page carrega em paralelo o catálogo de tags e o mapa `person_id → tags` já vem POR LINHA na RPC (sem varredura separada, sem `.in()` — a RPC é o join server-side que o briefing manda usar).

## 8. Regras de sync

1. **Incremental por syncToken** (guardado em `calendar_sources.sync_token`). Primeira rodada e token invalidado (410): janela cheia de **−90d a +400d**.
2. **Upsert por `(source_id, external_id)`**, respeitando a tabela de propriedade (§6). Rodar duas vezes = zero duplicata, zero perda de vínculo/flag manual.
3. **Após upsert, na mesma rodada:** matcher (§9.1) e parser (§9.2) nos eventos tocados.
4. **Cancelamento no Google →** `status='cancelled'` (a RPC some com ele; a linha fica).
5. **Disparo:** Vercel Cron 2x/dia (07:00 e 15:00 BRT) + botão "Sincronizar agora" na página. Ambos batem na mesma rota interna protegida por `CRON_SECRET`. Resultado da rodada volta pra UI (n novos / n atualizados) e grava `last_synced_at`.

## 9. Matcher e parser (regras determinísticas, constantes em código)

**9.1 Matcher de pessoa (telefone na descrição):**
- Extrai candidatos a telefone da `description` por regex, normaliza com o util de telefone EXISTENTE (`src/lib/utils/phone.ts` — não duplicar normalização).
- 1 telefone válido com match único em `people.phone` (ativa) → `person_id` + `match_source='phone'`.
- 0 telefones, telefone sem match, ou **2+ telefones distintos** → não vincula (ambiguidade é humano): evento cai na bandeja.
- Só roda quando `person_id IS NULL`.

**9.2 Parser de artista e categoria:**
- `creator_email` contém `le.bodypiercer` → `artist='lethicia'`, `category='sessao'`.
- Senão: `artist='julio'` por default QUANDO a categoria resolver como sessão; título bate keywords de sessão (constante: tattoo, tatuagem, sessão, perfuração, piercing, retoque…) → `category='sessao'`; senão `category='outros'` e `artist=NULL`.
- Guest no título (caso "Tattoo Nicole"): v1 NÃO tenta adivinhar guest — correção de artista é manual no drawer (1 toque, trava a flag). Adivinhar por título confunde guest com nome de cliente ("Tattoo - Marcela e Ana") e erra pro lado errado.

## 10. Sistemas de cor (dois sistemas, dois papéis, sem mistura)

**Categorias** (pintam card/chip/drawer; tag nunca pinta card):

| Categoria | Cor | Tint de fundo |
|---|---|---|
| Sessões | `#8B0000` | `#F6E9E9` |
| Aniversários | `#8A6D00` | `#F5EFDA` |
| Outros | `#5A5A5A` | `#EDECEA` |

**Paleta de tags** (badges vazadas; constante única em código; contraste calculado sobre branco, teste determinístico obrigatório na implementação):

| Hex | Nome de trabalho | Contraste estimado |
|---|---|---|
| `#8B0000` | Oxblood | ~10,0:1 |
| `#1F5F73` | Petróleo | ~7,1:1 |
| `#5B2D86` | Violeta | ~9,7:1 |
| `#1E6B45` | Verde | ~6,5:1 |
| `#A61E4D` | Framboesa | ~7,2:1 |
| `#8A6D00` | Dourado escuro | ~4,9:1 |
| `#B4530A` | Terracota | ~5,0:1 |
| `#2D4B9A` | Cobalto | ~8,1:1 |

TRAP herdada da origem: dourado de marca reprovou lá (3,46:1); o daqui passa por margem curta — se o teste real der <4,5, escurece o hex, não afrouxa o teste.

## 11. Invariantes de tags (resumo executivo do doc normativo)

1. Contato guarda SÓ slug; toda tela resolve slug→(nome,cor) no render. A indireção É o mecanismo de dispersão.
2. Duas famílias de escrita: aplicação (array do contato, qualquer aprovado) × catálogo (admin, exceto CRIAR que é de qualquer aprovado no ponto de uso).
3. Rename/recolor: zero cascade, dispersa via indireção. Desativar: bloqueia entrada, preserva estoque, destrava saída. Excluir: zero cascade, gera órfãs tratadas (badge cinza, tooltip, ✕, recusada em escrita nova). Única escrita em massa possível: mesma action de aplicação com N ids, união/remoção de UM slug, nunca substituição de array.
4. Criação devolve a tag completa; chamador aplica na hora, sem prever slug no cliente.
5. Toda action de catálogo revalida as rotas que exibem tag (lista, ficha, calendário).

## 12. Env vars

| Var | Estado | Uso |
|---|---|---|
| `GOOGLE_SA_EMAIL` | ✅ setada (Vercel + local) | Identidade da SA. |
| `GOOGLE_SA_KEY_BASE64` | ✅ setada | Chave JSON em base64; decodificada server-side only. |
| `GOOGLE_CALENDAR_ID` | ✅ setada | Seed da linha inicial de `calendar_sources`. |
| `CRON_SECRET` | ⏳ Fase 6 | Protege a rota de sync (cron e botão). Gero o valor contigo na config do cron. |

## 13. Decisões embutidas neste contrato (teu veto é aqui)

| # | Decisão | Alternativa descartada |
|---|---|---|
| a | Vincular pela bandeja NÃO reescreve a descrição no Google | Reescrever (autocorrige o Google, mas CRM tocando evento nativo fura o cadeado) |
| b | Cadeado protege campos do Google; metadados CRM (pessoa, artista, categoria) editáveis em qualquer evento | Cadeado total (mataria a bandeja e a correção de guest) |
| c | Guest NÃO é adivinhado por título; correção manual de artista no drawer | Parser de nome no título (confunde guest com cliente) |
| d | 2+ telefones distintos na descrição = bandeja, sem auto-vínculo | Vincular o primeiro (erro silencioso em evento multi-cliente) |
| e | Cancelamento vira `status='cancelled'`, nunca DELETE | Delete físico (perde histórico e vínculo) |
| f | Multi-dia renderiza uma ocorrência por dia (validado no mock) | Barra contínua (cara, adia a entrega, zero valor operacional) |
| g | Aniversário é computado na RPC, não linha de tabela | Materializar (linhas sintéticas pra manter, dado já vive em people) |
| h | `sessao`/`outros` no espelho; `aniversario` só existe na RPC | Três valores no check (aniversário nunca é linha do espelho) |

---

*Aprovado o contrato: dry run das migrations (Fase 3), batido tabela a tabela contra este de-para.*
