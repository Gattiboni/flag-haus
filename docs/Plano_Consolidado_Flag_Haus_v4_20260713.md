# Plano Consolidado — Flag Haus | CRM + Operação

**Versão:** 4.0 — atualizada em 13/07/2026 (noite)
**Substitui:** v3.0 (13/07/2026, manhã — vencida pela própria sessão do dia)
**Estado geral:** Blocos 1, 2 e 3 completos (Bloco 3 com pendência não-impeditiva: teste móvel da #3c). Infra de banco versionado (MOAS) operacional. **Próximo código: Bloco 4 (admin)** — escopo congelado em 13/07. Bloco 6 segue bloqueado pelas listas do Julio, agora com pré-condição explícita: nada vai ao Julio antes do admin navegável em produção.

---

## 📍 Mapa rápido de status

```
FRENTE 1 — Google Ads (ajustes maio/junho)     → status a confirmar
FRENTE 2 — CRM Flag Haus                        → EM ANDAMENTO
  ✓ BLOCO 1 — Schema Supabase
  ✓ BLOCO 2 — Design questionários + aprovação
  ✓ BLOCO 3 — Código questionários  (#2, #3a, #3b, #3b-fix, #3c)
                                      └ pendente não-impeditivo: teste móvel #3c
  → BLOCO 4 — Admin  ← AQUI (escopo congelado, spec a escrever)
  ◐ BLOCO 5 — LGPD mínimo  (avançou forte com a #3c)
  ☐ BLOCO 6 — Ativação operacional  ← BLOQUEADO (listas Julio + admin em prod)
  ☐ BLOCO 7 — Monitoria + análise
FRENTE 3 — Análise inicial da base              → aguarda Bloco 6
FRENTE 4 — Ativação de base                     → aguarda massa de dados
FRENTE 5 — Preparação A/B                       → aguarda volume
```

---

## 🎯 Frente 1 — Google Ads (ajustes do plano de maio/junho)

| ✅ | Tarefa | Nota |
|---|---|---|
| [ ] | Pausar 3 drenadoras (`tatuador em sp`, `fazer tatuagem em são paulo`, `tatuador sp`) | **status a confirmar** |
| [ ] | Negativas anti-menor (varredura do relatório de termos + negativação sistemática) | **status a confirmar** |
| [ ] | Aviso "Atendemos apenas maiores de 18 anos" em descrições/extensões | **status a confirmar** |
| [ ] | Auditoria GA4/GTM do evento de clique WhatsApp | **status a confirmar** — pendente desde maio |

**Decisões conscientes de NÃO-ação (vigentes):** faixa "Desconhecido" mantida; ajuste 25-34 (-50%) mantido até dados do CRM; negativas geográficas adiadas.

---

## 🛠️ Frente 2 — CRM Flag Haus

### 🔵 BLOCO 1 — Schema Supabase ✅ COMPLETO (27/05)

10 tabelas, 4 ENUMs, UUIDv7 SQL puro, PostGIS, triggers, RLS deny-all explícito (decisão #020). Detalhe no plano v2/v3 e no decision log.

**Pendências herdadas — situação atualizada:**
- ~~RLS policies reais pra `authenticated`~~ · ~~Custom Access Token Hook (`app_role` no JWT)~~ — **CANCELADAS** pela decisão de escopo do Bloco 4 (13/07): acesso do admin é 100% via Server Actions com `service_role` + allowlist em `user_roles`. Deny-all permanece como está.
- [ ] pg_cron + snapshot mensal de `customer_segments_snapshot` — segue com o Bloco 7.

### 🟣 BLOCO 2 — Design dos questionários ✅ COMPLETO (17/06)

Campos definidos, copy consolidado, previews aprovados por Amanda e Julio. **Atualização 13/07:** o copy canônico agora é o **v3** (`docs/copy_anamnese_v3_consolidado.md`); o v2 está renomeado `_VENCIDO` (contradizia a implementação em 8 pontos — decisão #025).

### 🟢 BLOCO 3 — Codificação dos questionários ✅ COMPLETO (13/07)

**Infraestrutura (#2, #3a):** scaffold Next 16 + TS + Tailwind v4, deploy `cadastro.flaghaus.art`, cliente admin `service_role` server-only, `findPersonByPhone` (11/11 β). ✅

**Spec #3b + #3b-fix — `/cadastro`:** ✅ em produção, validado em celular (decisões #021, #022, #023). Geo com cadeia Nominatim→BigDataCloud→manual, autocomplete Photon com filtro `osm_value`, gate de idade, E.164, Enter avança.

**MOAS — banco versionado por autodescoberta (13/07, decisão #024):** ✅
- `scripts/moas.mjs` (Node + `pg`, única dep nova): snapshot determinístico do schema real → `docs/db/schema.md` + `schema.sql`. Zero hardcoding — pergunta ao `pg_catalog`.
- Hook `pre-push` barra push se o banco divergir do snapshot. `.gitattributes` fixa `eol=lf`.
- TLS `verify-full` com CA commitada; conexão direta (o pooler e `?sslmode=require` foram descartados com causa documentada).
- Contexto: o schema base de 27/05 não existia como migration em lugar nenhum — SQL rodado no SQL Editor não entra em `schema_migrations`. O MOAS fecha esse buraco.

**Spec #3c — `/antes-da-sessao` (anamnese):** ✅ (decisão #025)

| ✅ | Entrega |
|---|---|
| [x] | Wizard 31 steps + bloqueio de menor; rota `(anamnese)/antes-da-sessao` |
| [x] | RPC transacional `submit_anamnese` — 9/9 antes do front; escrita atômica em 6 tabelas; idempotência por `submission_id` |
| [x] | Consent de saúde destacado (`health`, Art. 11, I) + `policy_version` em todo consent + doc legal congelado (`docs/legal/consentimento_anamnese_v1.md`) |
| [x] | Job nasce vazio (status default `quoted`; preços/timestamps null — verdade > conveniência) |
| [x] | `body_region` (obrigação sanitária) |
| [x] | Leitura append-only pela linha mais recente (validada por armadilha de seed) |
| [x] | Herança 100% do `/cadastro`, zero fork, zero dependência nova |
| [x] | β §14: 1–14 verdes (agente Comet + SQL); stress acidental de 5 execuções confirmou estabilidade do skip |
| [ ] | **Testes 15/17 — Enter/autocomplete + celular real em produção. PENDENTE, NÃO-IMPEDITIVO** |

**🚦 Critério do bloco:** duas URLs funcionais em produção + dados chegando no Supabase → **atingido** (ressalva: teste móvel da #3c pendente).

### 🟡 BLOCO 4 — Admin ← PRÓXIMO (escopo CONGELADO em 13/07)

**Operadores: Julio, Alan e Amanda. UM nível de acesso — todos veem tudo.** Sem hierarquia, sem camadas.

**Arquitetura de acesso (substitui o plano antigo):**
- Google SSO (Supabase Auth). Gate no topo de cada Server Action: `user.id` ∈ `user_roles`?
- `user_roles` = allowlist de 3 linhas. Sem UI de gestão.
- RLS deny-all permanece; todo acesso via `service_role` em Server Action. **Sem Auth Hook, sem `app_role` no JWT, sem policies novas.**

**MUST (v1):**
| ✅ | Tarefa |
|---|---|
| [ ] | Login Google + gate por allowlist |
| [ ] | Fila de trabalho por **status** (Precisa de preço / Aguardando sessão / Sem resposta) — a home é a fila, não um dashboard |
| [ ] | Edição inline na lista: status + `final_price` |
| [ ] | Detalhe do job **com anamnese legível** (Julio lê alergias antes de tatuar — segurança) |
| [ ] | Detalhe da pessoa |
| [ ] | Busca por telefone/nome |
| [ ] | Criar job manual |
| [ ] | Teste com Julio em call rápida (10 min) |

**NICE (v2, sem schema novo):** receita por fonte · aviso de consent LGPD vencendo · export DSAR · timeline.

**DON'T BUILD:** dashboards KPI · kanban · roles/permissões · bulk ops · report builder · task system · log de visualização · edição manual de `lifecycle_stage` · rich text.

**🚦 Pronto quando:** Julio loga sozinho, vê a fila, edita e salva.
**⚠️ Nota de fluxo (13/07):** listas e templates só vão ao Julio **depois** do admin navegável em produção — o Bloco 4 entrou no caminho crítico do Bloco 6.

### 🟠 BLOCO 5 — Compliance LGPD (mínimo viável) — ◐ AVANÇOU

*Resolvido por arquitetura + #3c:* consents append-only com timestamp **e `policy_version`**; dado de saúde com consentimento específico e destacado (Art. 11, I); dados clínicos segregados; acesso exclusivo server-side; texto legal congelado e versionado.

| ✅ | Tarefa |
|---|---|
| [x] | Consentimento com timestamp — #3b |
| [x] | Opt-in de comunicações — #3b |
| [x] | `policy_version` em todo consent + doc legal congelado da anamnese — **#3c** |
| [x] | Consent de dados de saúde destacado (Art. 11, I) — **#3c** |
| [ ] | Doc legal do `/cadastro` (`cadastro-v1-2026-07`) — hoje a versão entra por `coalesce` na RPC (ponte rastreada) |
| [ ] | Texto curto de política de privacidade + link nos forms |
| [ ] | Link para termos de uso |
| [ ] | Decidir: gravar IP no consentimento? (aberto) |
| [ ] | Registrar abordagem final no decision log |

### 🔴 BLOCO 6 — Ativação operacional — BLOQUEADO

| ✅ | Tarefa |
|---|---|
| [ ] | **Pré-condição nova:** admin navegável em produção (Bloco 4) |
| [ ] | Alan se cadastra (primeiro registro real) |
| [ ] | Confirmar dado no banco e visível no admin |
| [ ] | Alinhar templates de disparo (retroativo + pós-pix) com Julio |
| [ ] | Julio dispara o retroativo · adota rotina pós-pix |

**⚠️ Gargalo inalterado:** dois formulários prontos em produção, zero pessoas pra receber link. Listas do Julio em "status a confirmar" desde maio.

### ⚪ BLOCO 7 — Monitoria e análise inicial

Sem mudança: relatórios de adesão semanas 1–2, pg_cron + snapshot mensal, análise inicial com gatilho de 20 respostas (etária, geográfica, canal, cruzamento telefones × cliques × WhatsApp).

---

## 📊 Frentes 3, 4 e 5 — sem mudança

- **F3:** leitura demográfica a 20 respostas; cruzamentos semanais pós-ativação; dashboard adiado (90 dias de base).
- **F4:** hipótese R$ 200–700 / 3–6 meses; aniversário (viável — `birth_date` obrigatório) e fidelidade por contagem (`jobs.status = 'executed'`).
- **F5:** 2 hipóteses de A/B a definir (CTA WhatsApp, headline, texto de idade).

---

## 🔗 Dependências externas (Julio) — o gargalo real

| ✅ | Item | Nota |
|---|---|---|
| [ ] | Lista de telefones 01–17/05 | **status a confirmar** desde maio |
| [ ] | Lista retroativa desde março (telefone + valor + data) | **status a confirmar** |
| [x] | Aprovação mockups/copies | feita |
| [ ] | Aprovação dos templates de disparo | **sequência definida 13/07: só após admin em prod** |

Plano de resgate (3 tiers) escrito: `Plano_Resgate_Base_Completa_v2.md`. Regras anti-ban inegociáveis. Import direto no banco **vetado** por LGPD.

---

## 🗄️ Fora do escopo (lista de espera)

Refatoração do site · dashboard analítico (90 dias) · automação de gatilhos · promoção de `extra_data` pra colunas · RAG/embeddings · proxy de Nominatim/Photon · **refinamento visual dos forms (bandeiras SVG, motion, hovers) — spec própria, aplicada aos DOIS formulários de uma vez**.

---

## 🧹 Dívidas técnicas abertas (rastreadas)

- [ ] Teste móvel da #3c (testes 15/17 do β) — **pendente, não-impeditivo**
- [ ] `docs/db/schema.sql` nunca executado contra banco vazio — gerador sem prova de replay (teste dispensado por custo/benefício, decisão consciente)
- [ ] `/cadastro` não envia `policy_version` — `coalesce` na RPC como ponte
- [ ] Doc legal do `/cadastro` (`cadastro-v1-2026-07`) inexistente — criar antes do lançamento público
- [ ] `/__health` — remover ou proteger antes do lançamento
- [ ] Bandeiras SVG no `PhoneField` (junto com a spec de refinamento visual)
- [ ] `npm audit` — 2 vulns moderadas transitivas
- [ ] Endurecer validação BR pra exigir celular de 11 dígitos? — decisão aberta
- [x] Dados de teste da #3c (`…0090`, job do seed 001) — limpos em 13/07; seeds canônicos mantidos (001/003/004/005, incluindo armadilha de marketing e caminhos de confirmação)

---

## ⚠️ Caminho crítico atualizado

```
✓ BLOCO 1 ─► ✓ BLOCO 2 ─► ✓ BLOCO 3 ─► BLOCO 4 (admin) ─► BLOCO 6 ─► BLOCO 7
                                            │                  ▲
                                            ▼                  │
                                   BLOCO 5 finaliza     listas do Julio
                                   em paralelo          (gargalo real)
```

**Próxima ação única (código):** Spec do Bloco 4 (admin) — escopo já congelado, falta a spec executável.
**Ação paralela de custo zero:** nenhuma cobrança ao Julio até o admin estar navegável em prod (decisão de sequência de 13/07).

---

## 📚 Referências canônicas

- `docs/decision_log.md` — decisões **#001–#025** (fonte da verdade em conflitos)
- `docs/changelog.md` — histórico de entregas
- `docs/copy_anamnese_v3_consolidado.md` — copy canônico dos forms (v2 = VENCIDO)
- `docs/legal/consentimento_anamnese_v1.md` — textos de consentimento **congelados** (`anamnese-v1-2026-07`)
- `docs/db/schema.md` + `schema.sql` — snapshot MOAS do banco (fonte: `scripts/moas.mjs`)
- Spec #3c final em `docs/`
- Produção: `cadastro.flaghaus.art` (`/cadastro` + `/antes-da-sessao`)
- Supabase: projeto `inuboxnkbtkvtxbupmqb`
