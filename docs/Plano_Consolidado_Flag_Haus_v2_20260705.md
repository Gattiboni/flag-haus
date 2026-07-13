# Plano Consolidado — Flag Haus | CRM + Operação

**Versão:** 2.0 — atualizada em 05/07/2026
**Substitui:** "Frente 2 — Blocos Executáveis" (26/05) + "Plano de Ação Junho 2026" (26/05)
**Janela original:** 26/05 — 30/06/2026 (vencida — re-baseline pendente)
**Estado geral:** Blocos 1 e 2 completos. Bloco 3 em andamento (fundação + primeira Server Action em produção). Blocos 4-7 não iniciados.

---

## 📍 Mapa rápido de status

```
FRENTE 1 — Google Ads (ajustes maio/junho)     → status a confirmar
FRENTE 2 — CRM Flag Haus                        → EM ANDAMENTO
  ✓ BLOCO 1 — Schema Supabase
  ✓ BLOCO 2 — Design questionários + aprovação
  → BLOCO 3 — Código questionários  ← AQUI (Spec #3a fechada, #3b e #3c pendentes)
  ☐ BLOCO 4 — Admin do Julio
  ☐ BLOCO 5 — LGPD mínimo
  ☐ BLOCO 6 — Ativação operacional
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
| [ ] | Auditoria GA4/GTM do evento de clique WhatsApp | **status a confirmar** — pendente desde plano de maio |

**Decisões conscientes de NÃO-ação (vigentes):**
- Faixa "Desconhecido": não excluir. Candidato a teste A/B após CRM populado.
- Ajuste demográfico 25-34 (-50% desde abril): manter até revisão com dados do CRM.
- Negativas geográficas: adiadas.

---

## 🛠️ Frente 2 — CRM Flag Haus

### 🔵 BLOCO 1 — Schema Supabase ✅ COMPLETO (27/05)

| ✅ | Tarefa |
|---|---|
| [x] | Auditoria do projeto Supabase (`inuboxnkbtkvtxbupmqb`) |
| [x] | Schema completo construído — **10 tabelas** (foi além da auditoria prevista): `people`, `jobs`, `lifecycle_transitions`, `identity_links`, `events`, `user_roles`, `customer_segments_snapshot`, `clinical_records`, `consents`, `motivations` |
| [x] | ENUMs (`lifecycle_stage`, `job_status`, `user_role`, `consent_type`), função UUIDv7 SQL pura, PostGIS, triggers |
| [x] | RLS habilitada em todas as tabelas |
| [x] | Migration `explicit_deny_anon_authenticated` — 40 policies deny-all explícito (anon + authenticated); service_role bypassa (decisão #020) |
| [x] | Schema documentado + decision log atualizado |

**Pendências herdadas (conscientes, com dono definido):**
- [ ] RLS policies reais pra `authenticated` — quando admin existir (Bloco 4)
- [ ] Custom Access Token Hook (`app_role` no JWT) — junto com Bloco 4
- [ ] pg_cron + snapshot mensal de `customer_segments_snapshot` — junto com Bloco 7

### 🟣 BLOCO 2 — Design dos questionários ✅ COMPLETO (17/06)

| ✅ | Tarefa |
|---|---|
| [x] | Definição de campos (Versões A + B) via pesquisa benchmark + framework de decisão |
| [x] | Copy v2 consolidado aprovado — arquitetura "telefone como chave + pula o que já tem" (`docs/copy_anamnese_v2_consolidado.md`) |
| [x] | Previews HTML standalone com identidade visual FH, mobile-first, multi-step (substituíram o PDF/Figma previsto) — `docs/anamnese_preview_v1.html` + `docs/cadastro_preview_v1.html` |
| [x] | Aprovação por escrito: Amanda (copies) + Julio (peças completas) |
| [x] | Registrado no changelog |
| [x] | Feedback Julio/Amanda (voucher aniversário + fidelidade por contagem) capturado como Frente 4, documentado no decision log |

### 🟢 BLOCO 3 — Codificação dos questionários → EM ANDAMENTO

**Infraestrutura (pré-trabalho não previsto no plano original) ✅ COMPLETA:**

| ✅ | Tarefa |
|---|---|
| [x] | Decisões #015/#016/#017 — Next.js + Vercel canônicos; WordPress em legado; Supabase = presente |
| [x] | Spec #2: scaffold Next.js 16.2.9 + TypeScript + Tailwind v4 + estrutura de pastas + clientes Supabase |
| [x] | Deploy Vercel + DNS: `cadastro.flaghaus.art` no ar com SSL |
| [x] | Rotas placeholder `/` e `/antes-da-sessao` + rota técnica `/__health` |
| [x] | Decisão #020 + Spec #3a: cliente admin (`service_role`, server-only), Server Action `findPersonByPhone` com Zod + normalização BR, validada em produção (11/11 β) |
| [x] | readme.md reescrito refletindo stack real |

**Spec #3b — Form `/` (cadastro/renovação) — PRÓXIMO PASSO:**

| ✅ | Tarefa |
|---|---|
| [x] | UI multi-step completa do fluxo `/cadastro` (16 steps, conforme copy v2 + preview HTML) |
| [x] | Server Actions de escrita: upsert `people`, insert `consents` (lgpd, marketing) |
| [x] | Lógica "pula o que já tem" (modo returning com confirmações leves) |
| [ ] | Captação de geolocalização (autorização + fallback manual bairro/cidade) |
| [x] | Validações front (telefone, e-mail) + Zod server-side |
| [x] | Página/step de "obrigado" pós-submit |
| [x] | Teste com dados fake (10 submits) — dados chegando nas tabelas certas |

**Spec #3c — Form `/antes-da-sessao` (anamnese) — DEPOIS DA #3b:**

| ✅ | Tarefa |
|---|---|
| [ ] | UI multi-step completa do fluxo anamnese (28 steps: gate idade + saúde + consentimento + cadastro) |
| [ ] | Server Actions: upsert `people`, insert `clinical_records`, insert `consents` (procedure, lgpd, image), insert `motivations`, insert `jobs` (status `quoted`) |
| [ ] | Gate de idade com encerramento sem captura de dados |
| [ ] | Progressive disclosure (alergia/medicação/pele → campos de detalhe) |
| [ ] | Teste com dados fake (10 submits) — dados nas 5 tabelas |
| [ ] | Remover ou proteger rota `/__health` antes do lançamento público |

**🚦 Bloco 3 pronto quando:** ambas URLs funcionais em produção + dados chegando no Supabase

### 🟡 BLOCO 4 — Página de administração do Julio

| ✅ | Tarefa |
|---|---|
| [ ] | Definir fluxo de autenticação (Supabase Auth: magic link? SSO Google?) |
| [ ] | RLS policies reais pra `authenticated` + Auth Hook (`app_role` no JWT) — herança do Bloco 1 |
| [ ] | Rota protegida `/admin` |
| [ ] | Listagem de cadastros com filtro (novo / retroativo) |
| [ ] | Tela de detalhe do cadastro |
| [ ] | Edição inline: valor pago (`jobs.final_price`), status do job (quoted/confirmed/executed/cancelled) |
| [ ] | Busca por nome ou telefone |
| [ ] | Export CSV simples |
| [ ] | Teste com Julio em call rápida (10 min) |

**🚦 Pronto quando:** Julio loga sozinho, vê, edita e salva

### 🟠 BLOCO 5 — Compliance LGPD (mínimo viável)

*Nota: parte já resolvida por arquitetura (consentimentos em tabela `consents` append-only com timestamp; dados clínicos segregados em `clinical_records`; acesso exclusivo server-side via service_role — decisão #020).*

| ✅ | Tarefa |
|---|---|
| [x] | Campo de consentimento gravado no banco com timestamp (arquitetura `consents` — implementação efetiva vem nas Specs #3b/#3c) |
| [ ] | Aviso sobre coleta de geolocalização no step de localização |
| [ ] | Texto curto de política de privacidade + link nos forms |
| [ ] | Link para termos de uso |
| [ ] | Checkbox opt-in comunicações (já no copy v2 — implementação na #3b) |
| [ ] | Decidir: gravar IP no consentimento? (avaliar custo/benefício LGPD na Spec #3b) |
| [ ] | Registrar abordagem final no decision log |

**🚦 Pronto quando:** as duas páginas gravam consentimento por submit

### 🔴 BLOCO 6 — Ativação operacional

| ✅ | Tarefa |
|---|---|
| [ ] | Alan se cadastra (primeiro teste fim-a-fim real) |
| [ ] | Confirmar dado no banco e visível no admin |
| [ ] | Alinhar com Julio template da mensagem de disparo retroativo (rascunho já existe no copy v2) |
| [ ] | Alinhar com Julio template da mensagem pós-pix (rascunho já existe no copy v2) |
| [ ] | Julio dispara questionário retroativo pra lista desde março |
| [ ] | Julio adota rotina de link pós-pix de sinal |

**🚦 Pronto quando:** primeiro cadastro real (não-teste) no banco

### ⚪ BLOCO 7 — Monitoria e análise inicial

| ✅ | Tarefa |
|---|---|
| [ ] | Relatório de adesão semana 1 (data a re-baselinear) |
| [ ] | Relatório de adesão semana 2 |
| [ ] | pg_cron + snapshot mensal (herança do Bloco 1) |

**Métricas:** links enviados pelo Julio · cadastros completos · taxa de conclusão · tempo médio de resposta

**Análise inicial (gatilho: 20 respostas):**

| ✅ | Tarefa |
|---|---|
| [ ] | Distribuição etária da base |
| [ ] | Distribuição geográfica (bairros) |
| [ ] | Canal de origem (como conheceu) |
| [ ] | Cruzamento telefones cadastrados × cliques Google × WhatsApp Julio |

**🚦 Pronto quando:** documento curto fechando a Frente 2 no decision log

---

## 📊 Frente 3 — Análise inicial da base

*Depende do Bloco 6 ativo. Sem re-baseline até lá.*

| ✅ | Tarefa | Gatilho |
|---|---|---|
| [ ] | Primeira leitura demográfica | 20 respostas |
| [ ] | Cruzamento telefones × cliques Google × WhatsApp | semanal pós-ativação |
| [ ] | Critérios preliminares de gatilhos de ativação | pós-leitura demográfica |

Dashboard analítico: **adiado** — só com 90 dias de base (agosto/setembro).

---

## 🔁 Frente 4 — Ativação de base

**Hipótese a validar:** clientes com tatuagens R$ 200-700 são candidatos prioritários à reativação após 3-6 meses.

**Features capturadas (feedback Julio/Amanda, documentadas no decision log):**
- [ ] Desconto de aniversário (depende de `birth_date` populado + camada de automação)
- [ ] Fidelidade por contagem de tatuagens (depende de `jobs.status = 'executed'` populado)

| ✅ | Tarefa |
|---|---|
| [ ] | Definir critérios de reativação (faixa de ticket × tempo) |
| [ ] | 2-3 templates de mensagem de reativação |
| [ ] | Primeiro disparo de teste (conforme massa) |

---

## 🧪 Frente 5 — Preparação para testes A/B

Candidatos em ordem de prioridade: (1) CTA WhatsApp — relacionamento vs. prático; (2) headline da landing — emocional vs. técnico; (3) texto de qualificação de idade — direto vs. acolhedor.

| ✅ | Tarefa |
|---|---|
| [ ] | Definir 2 hipóteses de A/B com métrica de sucesso |

---

## 🔗 Dependências externas (Julio)

| ✅ | Item | Nota |
|---|---|---|
| [ ] | Lista de telefones 01-17/05 | **status a confirmar** — prazo original 02/06 |
| [ ] | Lista retroativa desde março (telefone + valor + data) | **status a confirmar** — sem ela, retroativo começa cego |
| [x] | Aprovação dos mockups/copies | feita (Amanda + Julio) |
| [ ] | Aprovação dos templates de disparo | rascunhos prontos no copy v2, falta OK formal |

---

## 🗄️ Fora do escopo (lista de espera — sem mudança)

- Refatoração completa do site → julho/agosto (nota: caminho de migração WP → Next.js já aberto pela decisão #015)
- Dashboard analítico próprio → 90 dias de base (agosto/setembro)
- Automação de ativação via gatilhos → pós-maturidade do CRM
- Artigo de blog "voltar pro mesmo tatuador" → calendário editorial de julho
- Promoção de chaves de `extra_data` pra colunas dedicadas → quando houver massa crítica
- RAG/embeddings sobre dados qualitativos → quando houver massa

---

## ⚠️ Caminho crítico atualizado

```
✓ BLOCO 1 ──► ✓ BLOCO 2 ──► → BLOCO 3 (#3b → #3c) ──► BLOCO 6 ──► BLOCO 7
                                    │
                                    ▼
                                 BLOCO 4 (admin) ──► BLOCO 5 finaliza em paralelo
```

**Próxima ação única:** Spec #3b — form `/` (cadastro/renovação) completo.

**Re-baseline de datas:** pendente — janela original venceu em 30/06. Definir nova janela quando Alan cravar disponibilidade.

---

## 📚 Referências canônicas

- `docs/decision_log.md` — decisões #001-#020 (fonte da verdade em conflitos)
- `docs/changelog.md` — histórico de entregas
- `docs/copy_anamnese_v2_consolidado.md` — copy aprovado dos forms
- `docs/anamnese_preview_v1.html` + `docs/cadastro_preview_v1.html` — referência visual
- Produção: `cadastro.flaghaus.art` (+ `/antes-da-sessao`, `/__health`)
- Supabase: projeto `inuboxnkbtkvtxbupmqb`
