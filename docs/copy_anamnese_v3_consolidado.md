# Copy — Questionários Flag Haus | v3

**Versão:** v3 — 2026-07-13
**Substitui:** v2 (2026-05-27), que fica **VENCIDO** e não deve ser usado como referência
**Tom:** Brand Book Flag Haus 11/2025, seção 4
**Fonte da verdade em conflito:** `docs/decision_log.md` (#023, #024, #025)

---

## O que mudou da v2 para a v3

O v2 foi escrito **antes** de o schema existir e antes das decisões #023/#024/#025.
Oito pontos dele estavam vencidos:

| # | v2 dizia | v3 |
|---|---|---|
| 1 | Rota `/anamnese` | **`/antes-da-sessao`**. "Anamnese" é jargão; o cliente não fala isso. |
| 2 | Gate de idade binário ("18+? Sim/Não") **antes** do telefone | **Morre.** O gate é o step de **data de nascimento**, **depois** do telefone e do reconhecimento. Perguntar "18+?" e depois pedir a data é perguntar duas vezes — e gate antes do telefone forçaria todo recorrente a redigitar uma data que já está no banco. |
| 3 | Sem pergunta de região do corpo | **Step novo.** Obrigação sanitária (a vigilância de SP exige registro do local do corpo) e contextualiza a pergunta sobre a pele, que antes era sobre um lugar que o formulário não sabia qual era. |
| 4 | Gravidez: 4 opções ("Sim / Não / …") | **5 opções.** "Sim" era ambíguo — grávida ou amamentando? O banco separa. |
| 5 | "documento **com foto** — CPF ou RG" | **CPF não tem foto.** Vira "documento de identificação": CPF, RG ou CNH. |
| 6 | Consentimento de saúde embutido no LGPD genérico | **Step próprio e destacado.** Tatuador não é profissional de saúde → a única base legal é consentimento **específico e destacado** (Art. 11, I). Cláusula genérica não serve. |
| 7 | Mapeamento técnico mandava tudo para `extra_data` | **Tabelas dedicadas:** `clinical_records`, `consents`, `motivations`. Aquele mapeamento é anterior às tabelas. |
| 8 | — | Consentimentos gravam **`policy_version`** — a prova de qual texto foi aceito. |

**O que sobreviveu inteiro:** telefone como chave · "pula o que já tem" por campo · o tom · o bloco de cadastro.

---

## Dois links, dois fluxos

| Link | Quando | O que cobre |
|---|---|---|
| `/antes-da-sessao` | Pós-pix de sinal, antes de qualquer sessão — **inclusive recorrente** | Idade + Saúde + Consentimento + Cadastro |
| `/cadastro` | Renovação retroativa, ou quem quer atualizar dados | Só cadastro |

Os dois compartilham: telefone como porta de entrada · "pula o que já tem" · o bloco de cadastro.

Saúde e consentimentos de sessão só existem no `/antes-da-sessao`.
**Só o `/antes-da-sessao` cria um `job`.**

---

## Arquitetura de fluxo

```
ENTRADA → TELEFONE (chave) → busca em people por phone
   │
   ├── não achou  → mode = "new"        → todos os campos
   └── achou      → mode = "returning"  → confirma o que tem, pergunta o que falta
   │
   ▼
DATA DE NASCIMENTO  ◄── GATE (<18 → bloqueio terminal, ZERO escrita)
   │
   ▼
/antes-da-sessao → saúde → consentimento → cadastro
/cadastro        → direto pro cadastro
```

**"Pula o que já tem" é por campo, não por modo.** Não existe bloco inteiro pulado.

**Saúde e os consentimentos `procedure`/`health` NUNCA são pulados**, nem para recorrente. Saúde muda entre sessões.

---

# FLUXO `/antes-da-sessao`

## 0 — Abertura

> **Antes da sua sessão.**
>
> Tem algumas coisas que precisamos confirmar juntos antes do dia.
>
> Saúde, segurança, e os seus dados com a gente. Leva uns 3 a 5 minutos.
>
> Pode fazer agora pelo celular mesmo.

**[Bora]**

## 1 — Telefone (chave)

> **Primeiro: qual o seu WhatsApp?**
>
> É como a gente se acha por aqui.

**[telefone, E.164, seletor de país — BR default]**

→ Busca em `people`. Achou = `returning`. Não achou = `new`. **Nada é gravado aqui.**

## 2 — Reconhecimento

**`returning`:**
> **Beleza, [NOME] — bom te ver de volta.**
>
> Vou só confirmar rapidinho o que já tenho seu por aqui, e perguntar o que ainda falta.

**`new`:**
> **Primeira vez por aqui — bem-vindo.**
>
> Vamos do começo, então. Algumas perguntas sobre saúde primeiro, depois sobre você.

**[Seguir]**

## 3 — Data de nascimento ◄── **GATE**

**Se vazio:**
> **Sua data de nascimento.**
>
> Preciso confirmar antes de seguir.

**[data]**

**Se já tem:**
> **Você nasceu em [DATA], certo?**

**[Confirmar] [Corrigir]**

**Se < 18 — tela de bloqueio, terminal:**
> **Obrigado pela honestidade.**
>
> A gente não tatua menores de 18, sem exceção. É o que a lei pede e o que a gente acredita.
>
> Quando você completar 18, a gente vai estar aqui.

*[fluxo encerra. Nenhuma escrita no banco — nem evento, nem consentimento.]*

---

# BLOCO — SAÚDE
*(sempre completo, mesmo para recorrente)*

## 4 — Região do corpo ◄── **NOVO**

> **Onde vai ser a tatuagem?**
>
> Só a região — braço, costela, coxa, costas. Preciso saber pra te perguntar certo sobre a pele.

**[texto livre curto]** → `jobs.body_region`

## 5 — Alergias

> **Você tem alguma alergia conhecida?**
>
> Pode ser a látex, antisséptico, anestésico, antibiótico, metal, pigmento, adesivo — qualquer coisa que já te causou reação.

**[Sim, tenho] [Não tenho]**

*Se Sim:* > **Pode me contar quais?** *[texto livre]*

## 6 — Medicação regular

> **Você toma alguma medicação no dia a dia?**
>
> Vale qualquer remédio de uso contínuo, mesmo que pareça simples.

**[Sim, tomo] [Não tomo]**

*Se Sim:* > **Pode me contar quais?**
> Se for anticoagulante, imunossupressor ou algo pra autoimune, é especialmente importante eu saber.
> *[texto livre]*

## 7 — Diabetes

> **Você tem diabetes?**

**[Sim] [Não]**

## 8 — Pele no local

> **Como está a pele em [REGIÃO DO STEP 4]?**
>
> Pergunto sobre psoríase, eczema, vitiligo, machucado recente, queloide de outra tatuagem, qualquer coisa fora do normal naquela área.

**[Tá tudo certo] [Tem alguma coisa]**

*Se "Tem alguma coisa":* > **Me conta um pouco mais?** *[texto livre]*

## 9 — Gravidez / amamentação ◄── **5 opções**

> **Você está grávida ou amamentando?**
>
> Sem julgamento — só importante a gente saber pra pensar juntos no melhor momento.

**[Estou grávida] [Estou amamentando] [Não] [Prefiro não dizer] [Não se aplica]**

## 10 — Saúde geral

> **Tem alguma condição de saúde, infecção transmissível pelo sangue, ou tratamento em curso que possa afetar cicatrização, sangramento, risco de infecção, ou que peça acompanhamento médico antes de tatuar?**
>
> Pode ser texto livre. Tudo que você me contar fica entre a gente.

**[texto livre, opcional]**

## 11 — Últimas 24h

> **Nas últimas 24 horas antes da sessão, você pretende beber álcool ou usar alguma substância que afete coagulação?**
>
> Pergunto porque mexe com sangramento, sensação na hora e qualidade da cicatrização.

**[Não pretendo] [Pretendo] [Prefiro só conversar sobre isso na hora]**

## 12 — RESPIRO

> **Pronto.**
>
> A parte de saúde tá fechada. Agora um momento sobre o que a gente combina juntos.

**[Continuar]**

---

# BLOCO — CONSENTIMENTO

> ⚠️ Os textos dos steps 14, 15, 16 e 17 são **jurídicos e congelados**.
> A fonte da verdade é `docs/legal/consentimento_anamnese_v1.md`.
> Mudar uma vírgula lá exige **nova versão** e nova `policy_version`.
> Se este arquivo divergir daquele, **aquele vence**.

## 13 — Documento

**Se vazio:**
> **Pra fechar nosso registro, preciso de um documento de identificação.**
>
> CPF, RG ou CNH — como preferir.

**[tipo + número]**

**Se já tem:**
> **Documento já registrado: [TIPO] terminado em ...[3 últimos].**
>
> Continua válido?

**[Confirmar] [Atualizar]**

## 14 — Consentimento do procedimento
*(sempre, mesmo recorrente · `consent_type = 'procedure'`, amarra no job)*

→ Texto em `docs/legal/consentimento_anamnese_v1.md`

## 15 — Consentimento de dados de saúde ◄── **NOVO, DESTACADO**
*(sempre, mesmo recorrente · `consent_type = 'health'`, amarra no job)*

→ Texto em `docs/legal/consentimento_anamnese_v1.md`

**Este step existe porque tatuador não é profissional de saúde.** A hipótese de "tutela da saúde" (Art. 11, II, "f") não se aplica; a única base legal é **consentimento específico e destacado** (Art. 11, I). Embutir isso no LGPD genérico seria cláusula genérica — que a lei rejeita.

## 16 — LGPD geral
*(pula se consentiu há < 12 meses · `consent_type = 'lgpd'`, validade 12 meses)*

→ Texto em `docs/legal/consentimento_anamnese_v1.md`

## 17 — Autorização de imagem
*(pula → confirma · `consent_type = 'image'`)*

→ Texto em `docs/legal/consentimento_anamnese_v1.md`

**Se já respondeu:**
> **Autorização de imagem: você disse [SIM/NÃO]. Continua valendo?**

**[Confirmar] [Mudar]**

## 18 — RESPIRO

> **Boa.**
>
> Última parte. Quero te conhecer um pouco melhor.

**[Continuar]**

---

# BLOCO — CADASTRO
*(cada campo pula se já existe)*

## 19 — Nome completo
**Vazio:** > **Como você se chama?** / Nome completo, do jeito que aparece no documento. **[texto]**
**Tem:** > **Você é [NOME], certo?** **[Confirmar] [Corrigir]**

## 20 — E-mail
**Vazio:** > **Seu e-mail.** **[e-mail]**
**Tem:** > **Teu e-mail continua sendo [EMAIL]?** **[Confirmar] [Atualizar]**

## 21 — Bairro e cidade
**Vazio:**
> **Em que bairro você mora?**
>
> Se preferir, pode permitir o acesso à localização — assim eu preencho pra você. Sem isso, é só digitar.

**[Usar minha localização]** ou **[bairro + cidade, com autocomplete]**

**Cidade obrigatória. Bairro opcional.** (Cidade é a unidade analítica mínima; nenhuma fonte de geocoding garante bairro em 100% dos casos, e exigir o que a fonte não entrega convida o usuário a inventar.)

**Tem:** > **Você mora em [BAIRRO], [CIDADE]?** **[Confirmar] [Atualizar]**

## 22 — Como conheceu
**Vazio:** > **Como você chegou na Flag Haus?** / Indicação, Google, Instagram, viu numa rua, num post de alguém — qualquer caminho.
**[Indicação | Google | Instagram | Vi na rua | Outra rede social | Outro — me conta]**
**Tem:** *(pulado)*

## 23 — Primeira tatuagem
**Vazio:** > **Essa é sua primeira tatuagem na vida?** **[Sim] [Não]**
**Tem:** *(pulado — não muda mais)*

## 24 — Instagram *(opcional)*
**Vazio:** > **Seu Instagram, se quiser deixar.** / Sem obrigação. É só pra a gente trocar ideia por lá quando fizer sentido. **[@handle]**
**Tem:** > **Teu Instagram: [@HANDLE]. Continua?** **[Confirmar] [Atualizar] [Remover]**

## 25 — Profissão *(opcional)*
**Vazio:** > **O que você faz?** / Pode ser profissão, estudo, atividade principal — do jeito que você costuma responder essa pergunta. **[texto livre]**
**Tem:** *(discreto: "Profissão: [X] — atualizar?")*

## 26 — Canal de contato preferido
*(sempre aparece — pode mudar a cada sessão)*
> **Quando a gente precisar te avisar de algo, qual canal você prefere?**
**[WhatsApp] [E-mail] [Instagram] [Tanto faz]**

## 27 — Opt-in de comunicação
*(`consent_type = 'marketing'` — texto em `docs/legal/`)*
**Tem:** > **Sua preferência atual: [receber / não receber] novidades. Continua?** **[Confirmar] [Mudar]**

## 28 — Estilos / temas *(opcional)*
**Vazio:**
> **Que tipo de tatuagem te atrai mais hoje?**
>
> Pode ser estilo (fineline, traço, ornamental, autoral livre), tema (natureza, escrita, geometria, retrato), parte do corpo que você ainda quer trabalhar, ou só uma vibe que tem rondado.

**[texto livre]**
**Tem:** > **Da última vez você falou sobre [resumo]. Algo mudou ou quer adicionar?** **[Manter] [Adicionar / atualizar]**

## 29 — Motivação *(opcional, por sessão)*
> **O que te trouxe pra essa tatuagem?**
>
> Pode ser uma fase, uma data, algo que você sempre quis, uma ideia que veio agora. Pode ser nada disso e tá tudo bem também.
>
> Se quiser contar, é uma das partes mais legais do processo pra mim.

**[texto livre]** → `motivations`, **amarrada ao job** (é a motivação *desta* tatuagem)

*(Sempre permite resposta nova, mesmo com histórico anterior.)*

## 30 — Fechamento

> **Fechou.**
>
> Cadastro atualizado, saúde checada, combinações alinhadas.
>
> Agora a gente segue pra confirmação final da sessão e as orientações de cuidado pré-tatuagem — chegam aqui pelo WhatsApp.
>
> Qualquer coisa antes do dia, me chama.
>
> **— Julio**

**[Concluir]** → submit único, RPC transacional

---

# FLUXO `/cadastro`

**Em produção, inalterado.** Fatia do `/antes-da-sessao`: telefone → reconhecimento → data de nascimento (gate) → bloco de cadastro (steps 19–29) → fechamento.

Sem saúde. Sem `procedure`/`health`/`image`. Sem job. Motivação com `job_id` null.

Textos de abertura e fechamento: ver v2 (seções B.1 e B.Z) — não mudaram.

---

# MENSAGENS DE WHATSAPP (Julio dispara)

**`/antes-da-sessao` (pós-pix de sinal):**
> Oi [nome], beleza?
>
> Antes da sessão, preciso que você preencha umas informações de saúde e cadastro — leva uns 5 minutos: [link]
>
> Qualquer dúvida, me chama por aqui. Abraço.

**`/cadastro` (renovação retroativa):**
> Oi [nome], tudo bem?
>
> Tô organizando aqui o cadastro de quem já tatuou comigo esses meses — pra manter o histórico bonito e ajustar como a gente se fala daqui pra frente.
>
> Se puder dar uns 3 minutos, é por aqui: [link]
>
> Valeu, abraço. — Julio

---

# MAPEAMENTO TÉCNICO

> A tabela de mapeamento do v2 está **VENCIDA** — mandava tudo para `extra_data`,
> porque foi escrita antes de `clinical_records`, `consents` e `motivations`
> existirem. **Ignore-a.**

| Pergunta | Destino |
|---|---|
| Telefone | `people.phone` (E.164) |
| Data de nascimento | `people.birth_date` |
| **Região do corpo** | **`jobs.body_region`** |
| Alergias · Medicação · Diabetes · Pele · Gravidez · Saúde geral · 24h | **`clinical_records`** (1 linha por sessão) |
| Documento | `people.extra_data.document_type` / `.document_number` |
| Consentimentos (procedure, health, lgpd, image, marketing) | **`consents`** (append-only, com `policy_version`) |
| Nome · E-mail | `people.name` · `people.email` |
| Bairro/cidade | `people.lat` / `.lng` + `extra_data.neighborhood` / `.city` |
| Como conheceu · 1ª tatuagem · Instagram · Profissão · Canal · Estilos · Onde circula | `people.extra_data.*` |
| Motivação | **`motivations`** (append-only, com `job_id` na anamnese) |
| Submit | `events` — `form.anamnese_submitted` |
