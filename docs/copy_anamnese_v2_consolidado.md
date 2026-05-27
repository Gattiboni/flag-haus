# Copy — Questionários Flag Haus | v2

**Projeto:** Flag Haus CRM
**Versão do documento:** v2 (rascunho para aprovação — substitui v1)
**Data:** 2026-05-27
**Tom de referência:** Brand Book Flag Haus 11/2025 — seção 4

---

## O que mudou da v1 para a v2

- **Telefone vira a chave de tudo.** Primeira pergunta de qualquer fluxo. Sistema busca em `people` e decide o que mostrar.
- **Regra universal "pular o que já tem":** qualquer campo já preenchido no banco aparece como confirmação leve, não como pergunta nova.
- **Paridade de dados entre A e B:** os dois fluxos cobrem o mesmo conjunto de campos de cadastro. A diferença é só a anamnese.
- **Estilos/temas (`interests`) entra também no A.** Era o maior gap da v1.

---

## Dois links, dois fluxos

| Link | Quando | O que cobre |
|---|---|---|
| `/anamnese` | Pós-pix de sinal, antes de qualquer sessão (incluindo cliente recorrente) | Idade + Saúde + Consentimento + Cadastro |
| `/cadastro` | Renovação de cadastro retroativa, ou cliente que quer atualizar dados | Só cadastro |

Os dois compartilham:

- A pergunta-chave de telefone como porta de entrada
- A lógica de "pula o que já tem"
- O bloco de cadastro completo

A anamnese e o consentimento de procedimento só aparecem em `/anamnese`.

---

## ARQUITETURA DE FLUXO

```
ENTRADA
  ↓
TELEFONE (chave de busca)
  ↓
Sistema consulta people por phone
  ↓
┌─────────────────────────────────┬─────────────────────────────────┐
│ Pessoa NÃO existe               │ Pessoa EXISTE                   │
│ (lifecycle_stage = NULL)        │ (lifecycle_stage qualquer)      │
├─────────────────────────────────┼─────────────────────────────────┤
│ Mostra todos os campos          │ Mostra:                         │
│ de cadastro                     │  - Confirmações leves do que    │
│                                 │    já tem                       │
│                                 │  - Perguntas só dos campos      │
│                                 │    em branco                    │
└─────────────────────────────────┴─────────────────────────────────┘
  ↓
Se for /anamnese: continua para saúde + consentimento
Se for /cadastro: vai direto pro fechamento
```

---

## FLUXO `/anamnese`

### A.0 — Gate de idade (sempre, antes de qualquer coisa)

> **Antes de tudo: você tem 18 anos ou mais?**
>
> A gente não tatua menores de 18, sem exceção. É o que a lei pede e o que a gente acredita.

**[Sim — Não]**

> *Se Não:* Obrigado pela honestidade. Quando você completar 18, a gente vai estar aqui.
>
> *[fluxo encerra sem capturar dado]*

---

### A.1 — Abertura

> **Antes da sua sessão.**
>
> Tem algumas coisas que precisamos confirmar juntos antes do dia.
>
> Saúde, segurança, e os seus dados com a gente. Leva uns 3 a 5 minutos.
>
> Pode fazer agora pelo celular mesmo.

**[Botão: Bora]**

---

### A.2 — Telefone (chave)

> **Primeiro: qual o seu WhatsApp?**
>
> É como a gente se acha por aqui.

**[campo de telefone com DDD]**

**🔧 Lógica de back-end ao submeter:**

```
SELECT * FROM people WHERE phone = :input AND deleted_at IS NULL
```

- Achou registro → segue pra A.3 com `mode = "returning"`
- Não achou → cria registro novo com phone e `lifecycle_stage = 'lead'`, segue pra A.3 com `mode = "new"`

---

### A.3 — Reconhecimento (condicional)

**Se `mode = "returning"`:**

> **Beleza, [NOME] — bom te ver de volta.**
>
> Vou só confirmar rapidinho o que já tenho seu por aqui, e perguntar o que ainda falta.

**[Botão: Seguir]**

**Se `mode = "new"`:**

> **Primeira vez por aqui — bem-vindo.**
>
> Vamos do começo, então. Algumas perguntas sobre saúde primeiro, depois sobre você.

**[Botão: Seguir]**

---

### BLOCO 1 — Saúde e segurança (sempre completo, mesmo para `returning`)

**Racional:** saúde pode mudar entre uma sessão e outra. Cliente recorrente preenche de novo a cada anamnese.

#### A.4 — Data de nascimento *(pula se já tem no banco e confirma)*

**Se vazio no banco:**
> **Sua data de nascimento.**
>
> Pra confirmar tudo certinho.

**[campo de data]**

**Se já tem:**
> **Você nasceu em [DATA], certo?**

**[Confirmar — Corrigir]**

#### A.5 — Alergias

> **Você tem alguma alergia conhecida?**
>
> Pode ser a látex, antisséptico, anestésico, antibiótico, metal, pigmento, adesivo — qualquer coisa que já te causou reação.

**[Sim, tenho — Não tenho]**

> *Se Sim:* **Pode me contar quais?**
> *[texto livre]*

#### A.6 — Medicação regular

> **Você toma alguma medicação no dia a dia?**
>
> Vale qualquer remédio de uso contínuo, mesmo que pareça simples.

**[Sim, tomo — Não tomo]**

> *Se Sim:* **Pode me contar quais?**
>
> Se for anticoagulante, imunossupressor ou algo pra autoimune, é especialmente importante eu saber.
> *[texto livre]*

#### A.7 — Diabetes

> **Você tem diabetes?**

**[Sim — Não]**

#### A.8 — Pele no local da tatuagem

> **Como está a pele no lugar onde a gente vai tatuar?**
>
> Pergunto sobre psoríase, eczema, vitiligo, machucado recente, queloide de outra tatuagem, qualquer coisa fora do normal naquela área específica.

**[Tá tudo certo — Tem alguma coisa]**

> *Se "Tem alguma coisa":* **Me conta um pouco mais?**
> *[texto livre]*

#### A.9 — Gravidez / amamentação

> **Você está grávida ou amamentando?**
>
> Sem julgamento — só importante a gente saber pra pensar juntos no melhor momento.

**[Sim — Não — Prefiro não dizer — Não se aplica]**

#### A.10 — Saúde geral

> **Tem alguma condição de saúde, infecção transmissível pelo sangue, ou tratamento em curso que possa afetar cicatrização, sangramento, risco de infecção, ou que peça acompanhamento médico antes de tatuar?**
>
> Pode ser texto livre. Tudo que você me contar fica entre a gente.

**[texto livre, opcional mas recomendado]**

#### A.11 — Últimas 24h

> **Nas últimas 24 horas antes da sessão, você pretende beber álcool ou usar alguma substância que afete coagulação?**
>
> Pergunto porque mexe com sangramento, sensação na hora e qualidade da cicatrização.

**[Não pretendo — Pretendo — Prefiro só conversar sobre isso na hora]**

---

### RESPIRO 1

> **Pronto.**
>
> A parte de saúde tá fechada. Agora um momento sobre o que a gente combina juntos.

**[Botão: Continuar]**

---

### BLOCO 2 — Consentimento

#### A.12 — Documento *(pula se já tem)*

**Se vazio no banco:**
> **Pra fechar nosso registro, preciso de um documento com foto.**
>
> CPF ou RG, como preferir.

**[tipo de documento + número]**

**Se já tem:**
> **Documento já registrado: [TIPO] terminado em ...[últimos 3 dígitos].**
>
> Continua válido?

**[Confirmar — Atualizar]**

#### A.13 — Consentimento do procedimento (sempre, mesmo recorrente)

> **Uma confirmação importante.**
>
> Eu entendo e concordo que:
>
> - Estou pedindo essa tatuagem por escolha minha, sem pressão de ninguém.
> - Tatuagem é permanente. Pode precisar de retoque depois de cicatrizada.
> - Existem riscos conhecidos (cicatrização variável, reação alérgica rara, infecção se o cuidado pós não for seguido).
> - As informações de saúde que dei aqui são verdadeiras.
> - O Julio pode adiar ou recusar a sessão se identificar algum risco — pela segurança dos dois lados.
> - Vou receber e seguir as orientações de cuidado depois da sessão.

**[Checkbox: Confirmo todas essas combinações]**

#### A.14 — LGPD *(pula se já consentiu nos últimos 12 meses, mas pede renovação anual)*

**Se vazio ou expirado:**
> **Sobre seus dados.**
>
> Seus dados ficam com a gente pra:
>
> - Fazer e registrar seu atendimento.
> - Cumprir o que a lei pede.
> - Manter seu cadastro atualizado e te avisar sobre próximas agendas e novidades — se você quiser, claro.
>
> Informações de saúde só são usadas pra cuidar de você na sessão. Você pode pedir acesso, correção ou apagamento desses dados quando quiser.

**[Checkbox: Entendi e concordo]**

**Se válido:**
> *(campo pulado, registrado timestamp da última confirmação ainda válido)*

#### A.15 — Autorização de imagem *(pula se já respondeu)*

**Se vazio:**
> **Última coisa do consentimento — e essa é opcional.**
>
> Posso usar fotos do trabalho finalizado no Instagram, portfólio e site da Flag Haus?
>
> Sem rosto, sem identificação — só a tatuagem.

**[Sim, pode usar — Prefiro que não]**

**Se já respondeu:**
> **Autorização de imagem: você disse [SIM/NÃO]. Continua valendo?**

**[Confirmar — Mudar]**

---

### RESPIRO 2

> **Boa.**
>
> Última parte. Quero te conhecer um pouco melhor.

**[Botão: Continuar]**

---

### BLOCO 3 — Cadastro (cada campo pula se já existe)

**Lógica geral:** cada um dos campos abaixo segue o padrão: se já tem no banco, mostra como confirmação leve; se vazio, pergunta normal.

#### A.16 — Nome completo

**Se vazio:**
> **Como você se chama?**
>
> Nome completo, do jeito que aparece no documento.

**[texto]**

**Se já tem:**
> **Você é [NOME], certo?**

**[Confirmar — Corrigir]**

#### A.17 — E-mail

**Se vazio:**
> **Seu e-mail.**

**[campo: e-mail]**

**Se já tem:**
> **Teu e-mail continua sendo [EMAIL]?**

**[Confirmar — Atualizar]**

#### A.18 — Bairro e cidade

**Se vazio:**
> **Em que bairro você mora?**
>
> Se preferir, pode permitir o acesso à localização — assim eu preencho o endereço pra você. Sem isso, é só digitar.

**[Botão: Usar minha localização]**
**[ou: campo de bairro + cidade]**

**Se já tem:**
> **Você mora em [BAIRRO], [CIDADE]?**

**[Confirmar — Atualizar]**

#### A.19 — Como conheceu

**Se vazio:**
> **Como você chegou na Flag Haus?**
>
> Indicação, Google, Instagram, viu numa rua, num post de alguém — qualquer caminho.

**[Indicação | Google | Instagram | Vi na rua | Outra rede social | Outro caminho — me conta]**

**Se já tem:** *(campo pulado)*

#### A.20 — Primeira tatuagem?

**Se vazio:**
> **Essa é sua primeira tatuagem na vida?**

**[Sim — Não]**

**Se já respondeu "Sim" em sessão anterior:** *(campo pulado — não muda mais)*

**Se já respondeu "Não":** *(campo pulado)*

#### A.21 — Instagram (opcional)

**Se vazio:**
> **Seu Instagram, se quiser deixar.**
>
> Sem obrigação. É só pra a gente trocar ideia por lá quando fizer sentido.

**[@handle]**

**Se já tem:**
> **Teu Instagram: [@HANDLE]. Continua?**

**[Confirmar — Atualizar — Remover]**

#### A.22 — Profissão (opcional)

**Se vazio:**
> **O que você faz?**
>
> Pode ser profissão, estudo, atividade principal — do jeito que você costuma responder essa pergunta.

**[texto livre, opcional]**

**Se já tem:** *(campo pulado, mas mostra discreto: "Profissão: [X] — atualizar?")*

#### A.23 — Canal de contato preferido

> **Quando a gente precisar te avisar de algo, qual canal você prefere?**

**[WhatsApp — E-mail — Instagram — Tanto faz]**

*(Sempre aparece, pode mudar a cada sessão)*

#### A.24 — Opt-in comunicação

**Se vazio:**
> **Posso te avisar quando abrir agenda nova, flash drops, ou alguma novidade do estúdio?**
>
> Você pode mudar isso a qualquer momento.

**[Sim, pode — Prefiro não]**

**Se já respondeu:**
> **Sua preferência atual: [receber / não receber] novidades. Continua?**

**[Confirmar — Mudar]**

#### A.25 — Estilos / temas (opcional)

**Se vazio:**
> **Que tipo de tatuagem te atrai mais hoje?**
>
> Pode ser estilo (fineline, traço, ornamental, autoral livre), tema (natureza, escrita, geometria, retrato), parte do corpo que você ainda quer trabalhar, ou só uma vibe que tem rondado.

**[texto livre, opcional]**

**Se já tem:**
> **Da última vez você falou sobre [resumo curto]. Algo mudou ou quer adicionar?**

**[Manter — Adicionar / atualizar]**

#### A.26 — Motivação (opcional)

**Se vazio:**
> **O que te trouxe pra essa tatuagem?**
>
> Pode ser uma fase, uma data, algo que você sempre quis, uma ideia que veio agora. Pode ser nada disso e tá tudo bem também.
>
> Se quiser contar, é uma das partes mais legais do processo pra mim.

**[texto livre, opcional]**

*(Esse campo é por sessão — sempre permite resposta nova mesmo se já existe histórico de motivações anteriores)*

#### A.27 — Onde circula (opcional)

**Se vazio:**
> **Por onde você costuma circular em São Paulo?**
>
> Bairros, regiões, lugares que você frequenta. Ajuda a entender o fluxo de quem chega aqui.

**[texto livre curto, opcional]**

**Se já tem:** *(campo pulado)*

---

### A.28 — Fechamento

> **Fechou.**
>
> Cadastro atualizado, saúde checada, combinações alinhadas.
>
> Agora a gente segue pra confirmação final da sessão e as orientações de cuidado pré-tatuagem — chegam aqui pelo WhatsApp.
>
> Qualquer coisa antes do dia, me chama.
>
> **— Julio**

**[Botão: Concluir]**

---

---

## FLUXO `/cadastro`

Esse fluxo é uma fatia do `/anamnese`: começa igual (telefone + reconhecimento), pula completamente os blocos de saúde e consentimento de procedimento, vai direto pro cadastro.

### B.1 — Abertura

> **Oi.**
>
> Tô organizando aqui o cadastro de quem já passou pela Flag Haus, pra manter teu histórico bem feito e melhorar como a gente conversa daqui pra frente.
>
> Leva menos de 3 minutos. Tudo que você não quiser preencher pode pular.
>
> **— Julio**

**[Botão: Bora]**

---

### B.2 — Telefone (chave)

> **Pra eu te achar no cadastro: qual o seu WhatsApp?**

**[campo de telefone com DDD]**

**🔧 Lógica de back-end ao submeter:**

```
SELECT * FROM people WHERE phone = :input AND deleted_at IS NULL
```

- Achou → mostra B.3 com `mode = "returning"`
- Não achou → mostra B.3 com `mode = "new"` (cria registro com `lifecycle_stage = 'lead'`)

---

### B.3 — Reconhecimento (condicional)

**Se `mode = "returning"`:**

> **[NOME], que bom — já te encontrei aqui.**
>
> Vou confirmar o que tenho e perguntar só o que falta.

**[Botão: Seguir]**

**Se `mode = "new"`:**

> **Não te encontrei na base ainda — vamos começar então.**
>
> Algumas perguntas rápidas pra te cadastrar direito.

**[Botão: Seguir]**

---

### BLOCO B — Cadastro

**Aplicam-se exatamente as mesmas perguntas A.16 a A.27 do fluxo `/anamnese`**, com a mesma lógica de "pula se já tem".

Adicionalmente, no fluxo `/cadastro`:

#### B.X — Data de nascimento

**Mesma lógica de A.4** — campo importante de cadastro, não só de saúde. Aparece também nesse fluxo se estiver vazio.

#### B.Y — LGPD

**Mesma lógica de A.14** — se vazio ou expirado, pede consentimento. Se válido, pula.

---

### B.Z — Fechamento

> **Pronto. Cadastro atualizado.**
>
> Agora consigo te avisar com mais precisão sobre agenda, retornos e o que a gente for soltando por aqui.
>
> Obrigado pelo tempo — significa que a casa continua sua.
>
> **— Julio**

**[Botão: Concluir]**

---

## SUGESTÃO DE COPY DO WHATSAPP (para o Julio disparar)

### Para `/anamnese` (pós-pix de sinal)

> Oi [nome], beleza?
>
> Antes da sessão, preciso que você preencha umas informações de saúde e cadastro — leva uns 5 minutos: [link]
>
> Qualquer dúvida, me chama por aqui.
>
> Abraço.

### Para `/cadastro` (renovação retroativa)

> Oi [nome], tudo bem?
>
> Tô organizando aqui o cadastro de quem já tatuou comigo esses meses — pra manter o histórico bonito e ajustar como a gente se fala daqui pra frente.
>
> Se puder dar uns 3 minutos, é por aqui: [link]
>
> Valeu, abraço.
>
> — Julio

---

## MAPEAMENTO TÉCNICO CONSOLIDADO

| Pergunta | Campo no banco | Pula se já existe? | Aparece em |
|---|---|---|---|
| Idade (gate) | (não persiste — bloqueia) | Não | /anamnese |
| Telefone | `phone` | Não (chave) | Ambos |
| Data nascimento | `birth_date` | Sim (confirma) | Ambos |
| Alergias | `extra_data.allergies` | Não (re-pergunta sempre) | /anamnese |
| Medicação | `extra_data.medications` | Não | /anamnese |
| Diabetes | `extra_data.diabetes` | Não | /anamnese |
| Pele local | `extra_data.skin_conditions` | Não | /anamnese |
| Gravidez | `extra_data.pregnancy` | Não | /anamnese |
| Saúde geral | `extra_data.health_notes` | Não | /anamnese |
| Álcool/24h | `extra_data.recent_substances` | Não | /anamnese |
| Documento | `extra_data.document_type` + `.document_number` | Sim (confirma) | /anamnese |
| Consentimento procedimento | `extra_data.consent_procedure_at` (timestamp por sessão) | Não (sempre re-confirma) | /anamnese |
| LGPD | `extra_data.consent_lgpd_at` | Sim, se < 12 meses | Ambos |
| Imagem | `extra_data.consent_image_at` | Sim (confirma) | /anamnese |
| Nome completo | `name` | Sim (confirma) | Ambos |
| E-mail | `email` | Sim (confirma) | Ambos |
| Bairro/cidade | `lat`, `lng`, `extra_data.neighborhood`, `extra_data.city` | Sim (confirma) | Ambos |
| Como conheceu | `extra_data.acquisition_source` | Sim (não re-pergunta) | Ambos |
| Primeira tatuagem | `extra_data.is_first_tattoo` | Sim (não muda) | Ambos |
| Instagram | `extra_data.instagram` | Sim (confirma) | Ambos |
| Profissão | `extra_data.occupation` | Sim (mostra discreto) | Ambos |
| Canal preferido | `extra_data.preferred_channel` | Não (sempre pode mudar) | Ambos |
| Opt-in comunicação | `extra_data.consent_marketing` | Sim (confirma) | Ambos |
| Estilos/temas | `extra_data.interests` | Mostra resumo + permite editar | Ambos |
| Motivação | `extra_data.motivations[]` (array, por sessão) | Não (sempre permite nova) | Ambos |
| Onde circula | `extra_data.circulation_areas` | Sim (não re-pergunta) | Ambos |

---


