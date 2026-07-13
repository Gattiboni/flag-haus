# Plano Consolidado — Flag Haus | CRM + Operação

**Versão:** 3.0 — atualizada em 13/07/2026
**Substitui:** v2.0 (05/07/2026)
**Janela original:** 26/05 — 30/06/2026 (vencida — re-baseline pendente)
**Estado geral:** Blocos 1 e 2 completos. **Bloco 3 com o `/cadastro` inteiro no ar, validado em produção e em celular** (Specs #2, #3a, #3b, #3b-fix). Falta a Spec #3c (anamnese). Blocos 4–7 não iniciados.

---

## 📍 Mapa rápido de status

```
FRENTE 1 — Google Ads (ajustes maio/junho)     → status a confirmar
FRENTE 2 — CRM Flag Haus                        → EM ANDAMENTO
  ✓ BLOCO 1 — Schema Supabase
  ✓ BLOCO 2 — Design questionários + aprovação
  → BLOCO 3 — Código questionários  ← AQUI (#2, #3a, #3b, #3b-fix fechadas · #3c é o próximo passo)
  ☐ BLOCO 4 — Admin do Julio
  ☐ BLOCO 5 — LGPD mínimo  (parcialmente resolvido pela #3b)
  ☐ BLOCO 6 — Ativação operacional  ← BLOQUEADO pelas listas do Julio
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
| [ ] | Auditoria GA4/GTM do evento de clique WhatsApp | **status a confirmar** — pendente desde o plano de maio |

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
| [x] | Schema completo — **10 tabelas**: `people`, `jobs`, `lifecycle_transitions`, `identity_links`, `events`, `user_roles`, `customer_segments_snapshot`, `clinical_records`, `consents`, `motivations` |
| [x] | ENUMs (`lifecycle_stage`, `job_status`, `user_role`, `consent_type`), função UUIDv7 SQL pura, PostGIS, triggers |
| [x] | RLS habilitada em todas as tabelas |
| [x] | Migration `explicit_deny_anon_authenticated` — 40 policies deny-all explícito (anon + authenticated); `service_role` bypassa (decisão #020) |
| [x] | Schema documentado + decision log atualizado |

**Pendências herdadas (conscientes, com dono definido):**
- [ ] RLS policies reais pra `authenticated` — quando o admin existir (Bloco 4)
- [ ] Custom Access Token Hook (`app_role` no JWT) — junto com o Bloco 4
- [ ] pg_cron + snapshot mensal de `customer_segments_snapshot` — junto com o Bloco 7

### 🟣 BLOCO 2 — Design dos questionários ✅ COMPLETO (17/06)

| ✅ | Tarefa |
|---|---|
| [x] | Definição de campos (Versões A + B) via benchmark + framework de decisão |
| [x] | Copy v2 consolidado aprovado — arquitetura "telefone como chave + pula o que já tem" (`docs/copy_anamnese_v2_consolidado.md`) |
| [x] | Previews HTML standalone com identidade visual FH, mobile-first, multi-step |
| [x] | Aprovação por escrito: Amanda (copies) + Julio (peças completas) |
| [x] | Registrado no changelog |
| [x] | Feedback Julio/Amanda (voucher aniversário + fidelidade por contagem) capturado como Frente 4 |

### 🟢 BLOCO 3 — Codificação dos questionários → EM ANDAMENTO

**Infraestrutura ✅ COMPLETA:**

| ✅ | Tarefa |
|---|---|
| [x] | Decisões #015/#016/#017 — Next.js + Vercel canônicos; WordPress em legado; Supabase = presente |
| [x] | Spec #2: scaffold Next.js 16.2.9 + TypeScript + Tailwind v4 + clientes Supabase |
| [x] | Deploy Vercel + DNS: `cadastro.flaghaus.art` no ar com SSL |
| [x] | Rotas `/` e `/antes-da-sessao` (placeholder) + rota técnica `/__health` |
| [x] | Decisão #020 + Spec #3a: cliente admin (`service_role`, server-only), `findPersonByPhone` validada em produção (11/11 β) |
| [x] | readme.md reescrito refletindo a stack real |

**Spec #3b — Form `/cadastro` ✅ COMPLETA (05/07):**

| ✅ | Tarefa |
|---|---|
| [x] | UI multi-step completa (18 steps, conforme copy v2 + preview HTML) |
| [x] | Escrita atômica via RPC transacional `submit_cadastro` (decisão #021) |
| [x] | Lógica "pula o que já tem" — regra por campo, não por modo |
| [x] | Telefone canônico E.164 + `libphonenumber-js` (decisão #022) |
| [x] | Validações front + Zod server-side |
| [x] | Step de fechamento pós-submit |
| [x] | Teste com dados fake — dados chegando nas 4 tabelas |

**Spec #3b-fix ✅ COMPLETA (13/07) — decisão #023:**

| ✅ | Tarefa |
|---|---|
| [x] | **Geolocalização funcionando de verdade.** Descoberto que o default `'São Paulo'` no campo cidade impedia o geocoder de gravar — o geo nunca preencheu nada |
| [x] | Cadeia de providers plugáveis: Nominatim (primário) → BigDataCloud (fallback) → digitação manual. Guard `bairro ≠ cidade` no orquestrador |
| [x] | Autocomplete de bairro e cidade via Photon (OSM), com filtro obrigatório por `osm_value` |
| [x] | Gate de idade: `birth_date` obrigatório na aplicação, ≥ 18 validado no client e no server; tela de bloqueio terminal sem captura de dado (comprovado: 0 eventos, 0 consentimentos) |
| [x] | Cidade obrigatória; bairro opcional |
| [x] | Tecla Enter avança o step (com guarda contra submit duplo) |
| [x] | Placeholders neutros ("Seu bairro" / "Sua cidade") — antes eram bairros reais |
| [x] | `console.debug` do `geo.ts` removido (pendência da #3b) |
| [x] | β 6/6 verde em localhost + commit + push |
| [x] | **Teste de GPS real em celular** (5G, `cadastro.flaghaus.art`) — bairro e cidade preenchidos, autocomplete e Enter funcionando no teclado móvel |

> **Nota de precisão do geo.** No teste em celular (5G), o dispositivo estava na República e o geo resolveu **Vila Buarque** — bairro adjacente, erro de algumas centenas de metros. Aceito conscientemente: para a pergunta de negócio ("quem é de perto, quem vem de longe"), bairro certo ou bairro colado respondem igual. Fica registrado que o dado de bairro carrega essa margem — relevante caso um dia se queira análise geográfica fina. Em desktop a margem é muito maior (±2000m, Wi-Fi/IP em vez de GPS), então bairro capturado em desktop é bem menos confiável que o de celular. O usuário sempre pode corrigir manualmente, e o autocomplete facilita isso.

**Spec #3c — Form `/antes-da-sessao` (anamnese) — ⏭️ PRÓXIMO PASSO:**

| ✅ | Tarefa |
|---|---|
| [ ] | **Refinamento visual primeiro:** Alan traz o branding book → Claudinho faz wireframe → aprovação → só então implementação |
| [ ] | UI multi-step completa (~28 steps: gate de idade + saúde + consentimento + cadastro) |
| [ ] | Nova RPC transacional: upsert `people`, insert `clinical_records`, insert `consents` (procedure, lgpd, image), insert `motivations`, insert `jobs` (status `quoted`) |
| [ ] | Gate de idade — **reusa `age.ts` e a tela de bloqueio da #3b-fix** |
| [ ] | Progressive disclosure (alergia / medicação / pele → campos de detalhe) |
| [ ] | LGPD da anamnese usa a versão **longa** (inclui a frase de saúde — aqui sim há coleta de dado de saúde) |
| [ ] | Teste com dados fake — dados nas 5 tabelas |
| [ ] | Bandeiras SVG no `PhoneField` (emoji não renderiza no Windows/Chrome) |
| [ ] | Remover ou proteger a rota `/__health` antes do lançamento público |

**Herança pronta pra reuso na #3c:** `PhoneField`, `GeoFields` (com autocomplete), `StepShell`, `OptionPills`, `ConfirmField`, `age.ts`, `geo.ts` (cadeia de providers), pipeline E.164, padrão de Server Action, RPC transacional como modelo, gate de idade + tela de bloqueio, Enter avança step.

**🚦 Bloco 3 pronto quando:** as duas URLs funcionais em produção + dados chegando no Supabase

### 🟡 BLOCO 4 — Página de administração do Julio

| ✅ | Tarefa |
|---|---|
| [ ] | Definir fluxo de autenticação (Supabase Auth: magic link? SSO Google?) |
| [ ] | RLS policies reais pra `authenticated` + Auth Hook (`app_role` no JWT) — herança do Bloco 1 |
| [ ] | Rota protegida `/admin` |
| [ ] | Listagem de cadastros com filtro (novo / retroativo) |
| [ ] | Tela de detalhe do cadastro |
| [ ] | Edição inline: valor pago (`jobs.final_price`), status do job |
| [ ] | Busca por nome ou telefone |
| [ ] | Export CSV simples |
| [ ] | Teste com Julio em call rápida (10 min) |

**🚦 Pronto quando:** Julio loga sozinho, vê, edita e salva

### 🟠 BLOCO 5 — Compliance LGPD (mínimo viável)

*Parte resolvida por arquitetura: `consents` append-only com timestamp; dados clínicos segregados em `clinical_records`; acesso exclusivo server-side via `service_role` (decisão #020).*

| ✅ | Tarefa |
|---|---|
| [x] | Consentimento gravado no banco com timestamp — **implementado e validado na #3b** |
| [x] | Checkbox opt-in de comunicações — **implementado na #3b** |
| [x] | Aviso sobre coleta de geolocalização no step de localização — a copy já explicita que é opcional e que sem ela é só digitar |
| [ ] | Texto curto de política de privacidade + link nos forms |
| [ ] | Link para termos de uso |
| [ ] | **Decidir: gravar IP no consentimento?** (aberto — avaliar custo/benefício) |
| [ ] | Registrar abordagem final no decision log |

**🚦 Pronto quando:** as duas páginas gravam consentimento por submit *(o `/cadastro` já grava)*

### 🔴 BLOCO 6 — Ativação operacional

| ✅ | Tarefa |
|---|---|
| [ ] | Alan se cadastra (primeiro registro real, não-seed) |
| [ ] | Confirmar dado no banco e visível no admin |
| [ ] | Alinhar com Julio o template da mensagem de disparo retroativo (rascunho no copy v2) |
| [ ] | Alinhar com Julio o template da mensagem pós-pix (rascunho no copy v2) |
| [ ] | Julio dispara o questionário retroativo pra lista desde março |
| [ ] | Julio adota a rotina de link pós-pix de sinal |

**🚦 Pronto quando:** primeiro cadastro real (não-teste) no banco

**⚠️ Este é o gargalo do projeto.** O `/cadastro` está pronto, testado e no ar — e não há uma única pessoa pra quem mandar o link. As listas do Julio estão em "status a confirmar" **desde o plano de maio**. O caminho crítico não passa mais pelo código.

### ⚪ BLOCO 7 — Monitoria e análise inicial

| ✅ | Tarefa |
|---|---|
| [ ] | Relatório de adesão semana 1 |
| [ ] | Relatório de adesão semana 2 |
| [ ] | pg_cron + snapshot mensal (herança do Bloco 1) |

**Métricas:** links enviados pelo Julio · cadastros completos · taxa de conclusão · tempo médio de resposta

**Análise inicial (gatilho: 20 respostas):**

| ✅ | Tarefa |
|---|---|
| [ ] | Distribuição etária da base *(agora garantida — `birth_date` é obrigatório)* |
| [ ] | Distribuição geográfica por bairro *(agora confiável — geo funcionando + cidade obrigatória; ver nota de precisão)* |
| [ ] | Canal de origem (como conheceu) |
| [ ] | Cruzamento telefones cadastrados × cliques Google × WhatsApp Julio |

**🚦 Pronto quando:** documento curto fechando a Frente 2 no decision log

---

## 📊 Frente 3 — Análise inicial da base

*Depende do Bloco 6 ativo.*

| ✅ | Tarefa | Gatilho |
|---|---|---|
| [ ] | Primeira leitura demográfica | 20 respostas |
| [ ] | Cruzamento telefones × cliques Google × WhatsApp | semanal pós-ativação |
| [ ] | Critérios preliminares de gatilhos de ativação | pós-leitura demográfica |

Dashboard analítico: **adiado** — só com 90 dias de base (agosto/setembro).

---

## 🔁 Frente 4 — Ativação de base

**Hipótese a validar:** clientes com tatuagens R$ 200–700 são candidatos prioritários à reativação após 3–6 meses.

**Features capturadas (feedback Julio/Amanda):**
- [ ] Desconto de aniversário — *dependência de `birth_date` resolvida pela #3b-fix*
- [ ] Fidelidade por contagem de tatuagens (depende de `jobs.status = 'executed'` populado)

| ✅ | Tarefa |
|---|---|
| [ ] | Definir critérios de reativação (faixa de ticket × tempo) |
| [ ] | 2-3 templates de mensagem de reativação |
| [ ] | Primeiro disparo de teste (conforme massa) |

---

## 🧪 Frente 5 — Preparação para testes A/B

Candidatos em ordem: (1) CTA WhatsApp — relacionamento vs. prático; (2) headline da landing — emocional vs. técnico; (3) texto de qualificação de idade — direto vs. acolhedor.

| ✅ | Tarefa |
|---|---|
| [ ] | Definir 2 hipóteses de A/B com métrica de sucesso |

---

## 🔗 Dependências externas (Julio) — **o gargalo real**

| ✅ | Item | Nota |
|---|---|---|
| [ ] | Lista de telefones 01–17/05 | **status a confirmar** — prazo original 02/06 |
| [ ] | Lista retroativa desde março (telefone + valor + data) | **status a confirmar** — sem ela, o retroativo começa cego |
| [x] | Aprovação dos mockups/copies | feita (Amanda + Julio) |
| [ ] | Aprovação dos templates de disparo | rascunhos prontos no copy v2, falta OK formal |

**Plano de resgate da base** (3 tiers) já escrito: `Plano_Resgate_Base_Completa_v2.md`. Regras não-negociáveis: disparo manual, 10–20 mensagens/dia, ordem por tier, Instagram só como broadcast, DM apenas em conversas existentes. Import direto no banco **vetado** por LGPD — o disparo manda o link, a pessoa preenche o form.

---

## 🗄️ Fora do escopo (lista de espera)

- Refatoração completa do site → julho/agosto (caminho WP → Next.js aberto pela decisão #015)
- Dashboard analítico próprio → 90 dias de base
- Automação de ativação via gatilhos → pós-maturidade do CRM
- Promoção de chaves de `extra_data` pra colunas dedicadas → quando houver massa crítica
- RAG/embeddings sobre dados qualitativos → quando houver massa
- Proxiar Nominatim/Photon via Server Action (permite `User-Agent` próprio) → só se houver bloqueio por volume

---

## 🧹 Dívidas técnicas abertas (pequenas, rastreadas)

- [ ] `/__health` — remover ou proteger antes do lançamento (hoje prerenderiza estática)
- [ ] `npm audit` — 2 vulns moderadas transitivas
- [ ] Bandeiras SVG no `PhoneField`
- [ ] Endurecer validação BR pra exigir celular de 11 dígitos? (a lib aceita fixo de 10 como válido) — **decisão aberta**
- [x] Registros de teste do banco — limpos. Seeds `...001`, `...003`, `...004`, `...005` mantidos de propósito

---

## ⚠️ Caminho crítico atualizado

```
✓ BLOCO 1 ─► ✓ BLOCO 2 ─► BLOCO 3 (✓#3b ✓#3b-fix → #3c) ─► BLOCO 6 ─► BLOCO 7
                                       │                        ▲
                                       ▼                        │
                                  BLOCO 4 (admin)      listas do Julio
                                       │                (gargalo real)
                                       ▼
                                  BLOCO 5 finaliza em paralelo
```

**Próxima ação única (código):** Spec #3c — form `/antes-da-sessao`, começando pelo refinamento visual (branding book → wireframe → aprovação → código).

**Ação paralela de custo zero (operação):** cobrar as listas do Julio. Fazer a #3c sem isso entrega dois formulários prontos e a mesma quantidade de dado real: zero.

**Re-baseline de datas:** pendente.

---

## 📚 Referências canônicas

- `docs/decision_log.md` — decisões **#001–#023** (fonte da verdade em conflitos)
- `docs/changelog.md` — histórico de entregas
- `docs/copy_anamnese_v2_consolidado.md` — copy aprovado dos forms
- `docs/anamnese_preview_v1.html` + `docs/cadastro_preview_v1.html` — referência visual
- Produção: `cadastro.flaghaus.art` (+ `/antes-da-sessao`, `/__health`)
- Supabase: projeto `inuboxnkbtkvtxbupmqb`
