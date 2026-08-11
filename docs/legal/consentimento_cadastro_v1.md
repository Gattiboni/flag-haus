# Consentimentos — Formulário `/cadastro`

**Versão:** `cadastro-v1-2026-07`
**Vigente desde:** 2026-07-20
**Status:** ATIVO — CONGELADO

---

## Este documento é congelado

O valor `cadastro-v1-2026-07` é gravado em `consents.policy_version` a cada
consentimento coletado no `/cadastro`. Ele é a **prova de qual texto o titular
leu e aceitou**.

**Não edite este arquivo.** Se qualquer texto abaixo precisar mudar — uma vírgula
que seja — crie `consentimento_cadastro_v2.md`, marque este como SUPERSEDIDO no
registro de versões, e atualize a constante `POLICY_VERSION_CADASTRO` em
`src/lib/legal/policy.ts`.

Editar um texto já aceito destrói a prova: o banco apontaria para uma versão que
não é a que a pessoa leu. O ônus de demonstrar que o consentimento foi obtido de
forma adequada é do controlador (LGPD, Art. 8º, §2º).

---

## Nota de contexto — congelamento retroativo

Esta versão está em produção **desde 2026-07-20**, aplicada pelo default do
`coalesce` dentro da própria RPC `submit_cadastro`: o formulário gravava os
consentimentos sem mandar `policy_version`, e o banco carimbava
`cadastro-v1-2026-07`. Os consentimentos coletados nesse período já apontam para
esta versão.

**Este documento congela retroativamente o texto que estava em exibição no
período.** Ele não é uma redação nova: o conteúdo abaixo é a transcrição literal
do que o `/cadastro` mostrava — e continua mostrando — na tela.

A partir do Bloco 1 (2026-08-09), a aplicação passou a enviar
`policy_version = 'cadastro-v1-2026-07'` explicitamente em cada consent, a partir
da constante `POLICY_VERSION_CADASTRO`. O `coalesce` da RPC permanece intacto,
como defesa em profundidade — em operação normal ele nunca mais dispara.

---

## Escopo

O `/cadastro` é o formulário de **cadastro puro**: coleta identificação, contato,
localização e preferências. **Não coleta dado de saúde** e não abre sessão de
tatuagem.

Consequência direta: dos cinco tipos de consentimento do
[`consentimento_anamnese_v1.md`](consentimento_anamnese_v1.md), este formulário
coleta apenas **dois** — `lgpd` e `marketing`. Não há `procedure`, `health` nem
`image` aqui, porque não há procedimento, dado sensível de saúde nem foto de
trabalho finalizado no escopo deste fluxo.

| Tipo | Escopo | Validade | Bloqueante |
|---|---|---|---|
| `lgpd` | da pessoa (`job_id` null) | 12 meses | **Sim** — sem aceite não conclui |
| `marketing` | da pessoa (`job_id` null) | sem validade | Não |

Os textos deste documento são os do `/cadastro` e **não são idênticos** aos do
`/antes-da-sessao`, ainda que carreguem o mesmo sentido. Cada formulário tem sua
própria versão congelada; é o `policy_version` gravado no consent que diz qual
texto foi lido.

---

## `lgpd` — Consentimento geral de dados

**Tipo:** `lgpd` · **Escopo:** da pessoa (`job_id` null) · **Validade:** 12 meses
**Pula se:** já tem consentimento `lgpd` vigente (concedido há menos de 12 meses)
**Bloqueante:** sem o aceite, o formulário não avança — mensagem
`Precisa concordar pra concluir`

> **Sobre seus dados.**
>
> Eles ficam comigo pra manter seu cadastro, te avisar das coisas que você
> autorizou, e cumprir o que a lei pede. Você pode pedir acesso, correção ou
> apagamento quando quiser.

**[ ] Entendi e concordo.**

> **Nota sobre a validade.** Os 12 meses são gravados no consent
> (`valid_months: 12`) e definem quando o formulário volta a pedir o aceite.
> Esse prazo **não** aparece no texto em tela — está registrado aqui porque é
> parte do que foi gravado no banco junto com este consentimento.

---

## `marketing` — Opt-in de comunicação

**Tipo:** `marketing` · **Escopo:** da pessoa (`job_id` null) · **Sem validade**
**Pula se:** já respondeu — nesse caso, mostra como confirmação
**Opcional:** não responder deixa o consent sem registro (não vira "não")

**Primeira vez:**

> **Posso te avisar quando abrir agenda nova, flash drops, ou alguma novidade do
> estúdio?**
>
> Você pode mudar isso a qualquer momento.

**[Sim, pode] [Prefiro não]**

**Já respondeu antes:**

> **Sua preferência atual: [receber / não receber] novidades. Continua?**

**[Confirmar] [Mudar]**

---

## Registro de versões

| Versão | Vigência | Status | Nota |
|---|---|---|---|
| `cadastro-v1-2026-07` | 2026-07-20 → | **ATIVO** | Primeira versão. Só `lgpd` e `marketing` — o `/cadastro` não coleta dado de saúde. Congelada retroativamente em 2026-08-09, a partir do texto em exibição desde o início da vigência. Canal de contato: WhatsApp (11) 97661-7569. |

---

## Contexto jurídico

Vale aqui o mesmo enquadramento descrito no
[`consentimento_anamnese_v1.md`](consentimento_anamnese_v1.md) — retenção por
obrigação sanitária, dispensa de Encarregado (Resolução CD/ANPD nº 2/2022,
Art. 11) e canal de contato obrigatório com o titular: **WhatsApp
(11) 97661-7569**.

O que **não** se aplica a este formulário é a discussão do Art. 11 (dado
sensível): sem coleta de saúde, não há dado sensível no `/cadastro`, e o
tratamento se apoia no consentimento geral do Art. 7º, I.
