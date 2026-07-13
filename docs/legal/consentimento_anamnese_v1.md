# Consentimentos — Formulário `/antes-da-sessao`

**Versão:** `anamnese-v1-2026-07`
**Vigente desde:** 2026-07-13
**Status:** ATIVO — CONGELADO

---

## Este documento é congelado

O valor `anamnese-v1-2026-07` é gravado em `consents.policy_version` a cada
consentimento coletado. Ele é a **prova de qual texto o titular leu e aceitou**.

**Não edite este arquivo.** Se qualquer texto abaixo precisar mudar — uma vírgula
que seja — crie `consentimento_anamnese_v2.md`, marque este como SUPERSEDIDO no
registro de versões, e atualize a constante `POLICY_VERSION_ANAMNESE` em
`src/lib/legal/policy.ts`.

Editar um texto já aceito destrói a prova: o banco apontaria para uma versão que
não é a que a pessoa leu. O ônus de demonstrar que o consentimento foi obtido de
forma adequada é do controlador (LGPD, Art. 8º, §2º).

---

## Contexto jurídico (por que os textos são assim)

**Tatuador não é profissional de saúde.** A hipótese de "tutela da saúde"
(LGPD, Art. 11, II, "f") é exclusiva de profissionais de saúde, serviços de saúde
e autoridade sanitária. Não alcança um estúdio de tatuagem.

**Consequência:** a única base legal viável para tratar dados de saúde é o
**consentimento específico e destacado** (Art. 11, I). Por isso o consentimento de
saúde é um step **separado**, com checkbox próprio — não uma cláusula dentro do
bloco genérico de LGPD. Cláusula genérica não satisfaz "específico e destacado".

**Retenção.** A vigilância sanitária de São Paulo exige registro do procedimento
(cliente, tipo, local do corpo). Enquanto durar essa obrigação, ela **prevalece
sobre pedido de exclusão** do titular (Art. 16, I). Por isso os textos falam em
guarda por obrigação sanitária, e não prometem apagamento incondicional.

**Encarregado (DPO).** Dispensado — Resolução CD/ANPD nº 2/2022, Art. 11 (agentes
de tratamento de pequeno porte). O canal de contato com o titular, porém, é
obrigatório: **WhatsApp (11) 97661-7569**.

---

## `procedure` — Consentimento do procedimento

**Tipo:** `procedure` · **Escopo:** por sessão (grava `job_id`) · **Sempre coletado**

> **Uma confirmação importante.**
>
> Eu entendo e concordo que:
>
> - Estou pedindo essa tatuagem por escolha minha, sem pressão de ninguém.
> - Tatuagem é permanente. Pode precisar de retoque depois de cicatrizada.
> - Existem riscos conhecidos: cicatrização variável, reação alérgica rara, infecção se o cuidado pós não for seguido.
> - As informações de saúde que dei aqui são verdadeiras.
> - O Julio pode adiar ou recusar a sessão se identificar algum risco — pela segurança dos dois lados.
> - Vou receber e seguir as orientações de cuidado depois da sessão.

**[ ] Confirmo todas essas combinações**

---

## `health` — Consentimento de dados de saúde

**Tipo:** `health` · **Escopo:** por sessão (grava `job_id`) · **Sempre coletado**
**Base legal:** LGPD, Art. 11, I — consentimento específico e destacado para dado sensível

> **Uma autorização separada, e ela é específica.**
>
> As informações de saúde que você acabou de me dar — alergias, medicação, condição de pele, e o que mais tiver aparecido aqui — são dados sensíveis. A lei trata elas de um jeito diferente, e eu também.
>
> Elas servem pra uma coisa só: decidir se dá pra tatuar com segurança, e como. Não vão pra lista de e-mail, não viram post, não vão pra lugar nenhum.
>
> Ficam guardadas porque a vigilância sanitária pede registro do procedimento. Você pode pedir acesso, correção ou apagamento quando quiser — e revogar essa autorização também, falando comigo no WhatsApp (11) 97661-7569.

**[ ] Autorizo o uso das minhas informações de saúde pra isso**

---

## `lgpd` — Consentimento geral de dados

**Tipo:** `lgpd` · **Escopo:** da pessoa (`job_id` null) · **Validade:** 12 meses
**Pula se:** consentiu há menos de 12 meses

> **Sobre seus dados.**
>
> Seus dados ficam com a gente pra:
>
> - Fazer e registrar seu atendimento.
> - Cumprir o que a lei pede.
> - Manter seu cadastro atualizado e te avisar sobre próximas agendas e novidades — se você quiser, claro.
>
> Você pode pedir acesso, correção ou apagamento desses dados quando quiser, no WhatsApp (11) 97661-7569.

**[ ] Entendi e concordo**

---

## `image` — Autorização de imagem

**Tipo:** `image` · **Escopo:** da pessoa (`job_id` null) · **Sem validade**
**Pula se:** já respondeu — nesse caso, mostra como confirmação

**Primeira vez:**

> **Última coisa do consentimento — e essa é opcional.**
>
> Posso usar fotos do trabalho finalizado no Instagram, portfólio e site da Flag Haus?
>
> Sem rosto, sem identificação — só a tatuagem.

**[Sim, pode usar] [Prefiro que não]**

**Já respondeu antes:**

> **Autorização de imagem: você disse [SIM/NÃO]. Continua valendo?**

**[Confirmar] [Mudar]**

---

## `marketing` — Opt-in de comunicação

**Tipo:** `marketing` · **Escopo:** da pessoa (`job_id` null) · **Sem validade**
**Pula se:** já respondeu — nesse caso, mostra como confirmação

**Primeira vez:**

> **Posso te avisar quando abrir agenda nova, flash drops, ou alguma novidade do estúdio?**
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
| `anamnese-v1-2026-07` | 2026-07-13 → | **ATIVO** | Primeira versão. Consentimento de saúde separado do LGPD genérico (Art. 11, I). Canal de contato: WhatsApp (11) 97661-7569. |

---

## O `/cadastro`

O `/cadastro` (formulário de cadastro puro, sem coleta de saúde) coleta apenas
`lgpd` e `marketing`. Os textos são os mesmos deste documento.

Ele grava `policy_version = 'cadastro-v1-2026-07'`, hoje aplicado como fallback
dentro da própria RPC `submit_cadastro` — o formulário ainda não envia a versão no
payload.

**Dívida rastreada:** quando o `/cadastro` for tocado, ele passa a enviar a versão
explicitamente e o `coalesce` da RPC vira no-op. Não é bloqueante: nenhum cadastro
real foi coletado ainda.
