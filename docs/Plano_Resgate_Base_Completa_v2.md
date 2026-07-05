# Resgate da Base Completa — Flag Haus | v2

**Substitui:** Plano de Resgate de Contatos Retroativos v1 (05/07)
**Mudança de escopo:** de "clientes desde março" para **toda a base do Julio**, organizada em 3 tiers de proximidade, com limpeza de blacklist e Instagram como canal de distribuição.
**Racional:** mais massa = funil legível mais rápido + chance de reativação espontânea virar job. Custo de carregar contato no CRM é ~zero; o cuidado fica no disparo (segmentação de mensagem + anti-ban).

---

## Princípio arquitetural que simplifica tudo

**O form é o coletor universal. Os canais só distribuem o link.**

A chave do CRM (telefone) nasce quando a pessoa digita no form — não precisa existir antes. Por isso:

- WhatsApp → fonte de telefone E canal de disparo
- Instagram → **só canal de disparo** (DM com link). Não se extrai telefone do Insta; o form coleta.
- Extrato pix → fonte de data + valor dos clientes reais

---

## Os 3 tiers

| Tier | Quem | Fonte | Mensagem de disparo | Prioridade |
|---|---|---|---|---|
| **1 — Clientes** | Tatuou na Flag Haus (março em diante, e antes se identificável) | Extrato pix + WhatsApp | Copy retroativo atual ("renovando o cadastro de quem já tatuou") | 🔴 Primeira |
| **2 — Leads quentes** | Orçou, conversou, não fechou | WhatsApp (varredura) | Copy adaptado (sem presumir que tatuou) — **a escrever** | 🟡 Segunda |
| **3 — Base fria** | Agenda geral (triada) + Insta (DMs existentes por 1-a-1; 3K seguidores por broadcast) | Export agenda (iCloud) + caixa de DMs + post/stories/bio | Copy próprio de convite — **a escrever**, possivelmente com incentivo | ⚪ Terceira |

**Regra de triagem do Tier 3:** a pessoa conhece o Julio **como tatuador**? Se sim, entra. Se não (família, fornecedor, dentista), fora. Blacklist sai antes de tudo.

---

## FASE 1 — Tier 1: Clientes (o plano original, inalterado)

### Passo 1.1 — Extrato pix (Julio, 15 min)

1. Abre o app do banco (conta única confirmada pelo Alan)
2. Baixa extrato de 01/03/2026 até hoje (PDF ou CSV)
3. Manda pro Alan no WhatsApp

**Alan:** filtra recebimentos, monta esqueleto da planilha (Google Sheets) com data + valor por linha.

### Passo 1.2 — Call de cruzamento (Julio + Alan, 45-60 min)

Linha por linha: Alan lê o pix ("R$ 350, 14/04, Maria S."), Julio acha no WhatsApp e **compartilha o contato** (toca no nome > Compartilhar contato > manda pro Alan). Zero digitação, zero erro. Alan preenche.

Pix sem nome identificável: a data do extrato guia onde procurar nas conversas (orçamento acontece dias antes do pagamento).

### Passo 1.3 — Varredura de segurança (Julio, 15 min, no ritmo dele)

Clientes que pagaram fora do pix principal (dinheiro, pix de terceiro): Julio scrolla as conversas do WhatsApp de março até hoje, compartilha o contato + áudio curto com contexto ("fim de abril, uns 400, fineline no braço"). Alan adiciona.

**Saída da Fase 1:** planilha Tier 1 completa — telefone, nome, data, valor, obs. Pronta pro disparo retroativo quando o form estiver no ar.

---

## FASE 2 — Tier 2: Leads quentes (novo)

**Quando:** logo após a Fase 1 (a varredura 1.3 já passa pelas mesmas conversas — dá pra fazer junto).

### Passo 2.1 — Marcação durante a varredura (Julio)

Na mesma passada do 1.3: conversa de quem **orçou mas não fechou** → compartilha o contato + áudio curto ("orçou braço fechado em maio, achou caro" / "sumiu depois do orçamento").

**Alan:** aba separada na mesma planilha — telefone, nome, contexto, data aproximada do contato.

### Verificação obrigatória no início da call ⚠️

Julio usa **WhatsApp Business** (confirmado). Primeira pergunta da call de cruzamento: **ele usa etiquetas/labels nas conversas?**

- Se sim: filtrar por etiqueta substitui boa parte do scroll — a varredura 1.3 e a marcação 2.1 encurtam drasticamente.
- Se não: segue o fluxo de scroll manual como descrito.

**Saída da Fase 2:** aba Tier 2 — insumo futuro pra análise de "por que não fechou" e pra disparo com copy próprio.

---

## FASE 3 — Tier 3: Base fria (novo)

**Quando:** depois das fases 1-2, sem pressa. Não bloqueia o disparo retroativo.

### Passo 3.1 — Blacklist primeiro (Julio, 5 min)

WhatsApp > Configurações > Privacidade > **Contatos bloqueados** > printa a lista > manda pro Alan.

**Alan:** esses números saem de TODAS as listas, permanentemente. Nunca entram no CRM.

### Passo 3.2 — Export da agenda (Julio + Alan guiando, 10 min)

Julio usa iPhone. Caminho:

1. No computador: `icloud.com` > login com o Apple ID do Julio > **Contacts**
2. Selecionar todos (Cmd/Ctrl+A ou engrenagem > Select All)
3. Engrenagem > **Export vCard** — baixa um arquivo `.vcf`
4. Manda o arquivo pro Alan

**Plano B** (se os contatos não estiverem sincronizados no iCloud): no iPhone, Ajustes > [nome] > iCloud > confirmar que "Contatos" está ativado, aguardar sincronizar, repetir. Alan guia por call se travar.

### Passo 3.3 — Triagem (Julio + Alan, sessão curta ou assíncrono)

**Alan:** limpa o óbvio primeiro (empresas, números sem nome, duplicados, blacklist).
**Julio:** passa na lista restante marcando só uma coluna: "me conhece como tatuador? S/N". Pode ser por áudio, pode ser na planilha, o que fluir.

### Passo 3.4 — Instagram (Alan, sozinho)

**Volumes conhecidos:** conta velha ~3.000 seguidores, conta Flag Haus ~200.

DM 1-a-1 pra 3K seguidores é inviável (20/dia sem risco de ban = ~5 meses) e automação está vetada. O Insta se divide em **dois braços**:

**Braço A — DM só pra conversas existentes:**
1. Alan abre a caixa de DMs da conta velha (tem os acessos)
2. Lista quem **já trocou mensagem** com a conta — esses são leads reais, e responder conversa existente não é disparo frio
3. Cruza com a planilha (quem já está no Tier 1/2 não recebe duplicado)
4. DM escalonada com o link, no mesmo ritmo anti-ban

**Braço B — Broadcast pros 3K (custo zero, risco zero):**
1. Post fixado na conta velha convidando pro cadastro (copy no tom da marca — Claudinho escreve)
2. Stories periódicos com link
3. Link na bio apontando pro `cadastro.flaghaus.art`
4. Replicar na conta Flag Haus (200 seguidores, mas são os mais quentes)

**Nota:** sem telefone e sem problema — DM ou broadcast levam o link, o form coleta o telefone.

### Cronograma de disparo estimado (com volumes reais)

| Lista | Volume estimado | Ritmo | Duração |
|---|---|---|---|
| Tier 1 (clientes) | dezenas | 15-20/dia | poucos dias |
| Tier 2 (leads) | dezenas | 15-20/dia | ~1 semana |
| Tier 3 agenda (pós-triagem) | 200-300 (chute; export confirma) | 15-20/dia | ~3 semanas |
| Tier 3 Insta braço A (DMs existentes) | a levantar | 15-20/dia | conforme volume |
| Tier 3 Insta braço B (broadcast) | 3.200 | — | contínuo, passivo |

---

## Regras de disparo (anti-ban, valem pra TODOS os tiers)

O número do WhatsApp do Julio é ferramenta de trabalho. Ban = negócio parado. Regras não-negociáveis:

1. **Manual, sempre.** Nada de ferramenta de disparo em massa no número dele.
2. **Escalonado:** 10-20 mensagens/dia, no máximo. Tier 1 primeiro (dezenas, resolve em poucos dias), depois 2, depois 3.
3. **Mensagem minimamente personalizada** (nome da pessoa) — reduz denúncia de spam e aumenta adesão.
4. **Se alguém responder "quem é você?" ou pedir pra parar:** remove da lista na hora, marca na planilha.
5. **No Instagram:** DM 1-a-1 **só pra conversas já existentes** na caixa de entrada. Pros 3K seguidores sem conversa, o canal é broadcast (post fixado + stories + bio) — nunca DM fria em massa.
6. **Copy segmentado por tier** — cliente não recebe convite de desconhecido, desconhecido não recebe "renovando seu cadastro". Os copies dos Tiers 2 e 3 serão escritos quando as listas existirem (Claudinho escreve, no tom da marca).

---

## Divisão de trabalho (resumo)

| Quem | Faz | Esforço |
|---|---|---|
| **Julio** | Extrato (15 min) + call de cruzamento (1h) + varredura c/ marcação de leads (20 min) + print blacklist (5 min) + export agenda (10 min guiado) + triagem S/N (30 min, assíncrono) | ~2h15 total, espalhadas |
| **Alan** | Planilha, estruturação, triagem grossa, export/cruzamento Insta, validação de telefones, cronograma de disparo | O resto |

Julio continua sem tocar em planilha (exceto se quiser marcar S/N direto nela — opcional).

---

## O que NÃO fazer

- ❌ Disparo em massa ou ferramenta de automação no número do Julio
- ❌ Mandar copy de "renovação de cadastro" pra quem nunca tatuou
- ❌ Incluir blacklist em qualquer lista, nunca
- ❌ Import direto da planilha no banco — o disparo manda o link, cada pessoa preenche o próprio registro (dado fresco + consentimento LGPD capturado na fonte). A planilha serve pra: saber pra quem disparar, medir adesão, preencher `jobs` retroativos via admin depois.
- ❌ Esperar a Fase 3 pra disparar a Fase 1 — Tier 1 dispara assim que o form estiver no ar

---

## Decisões pendentes (consolidado)

- [x] ~~Celular do Julio~~ — iPhone (caminho iCloud cravado no 3.2)
- [x] ~~Volumes~~ — Insta velho ~3K, Flag Haus ~200, agenda ≤500 (chute; export confirma). Nota: o chute calcula clientes, a agenda inclui não-clientes — pode ser maior, a triagem resolve.
- [ ] **Etiquetas no WhatsApp Business** — verificar no início da call de cruzamento
- [ ] **Volume real do Braço A** (DMs existentes na conta velha) — Alan levanta ao abrir a caixa
- [ ] Copy Tier 2, Tier 3 e broadcast Insta (Claudinho escreve quando listas existirem)
- [ ] Incentivo pra base fria (brinde/sorteio da Frente 4 antecipado?) — decidir só depois de ver a taxa de adesão do Tier 1

---

## Mensagem pronta pro Julio (Alan adapta e manda)

> Julio, preciso de umas 2h tuas (espalhadas, nada de uma vez) pra gente montar a base completa de contatos — clientes, quem orçou, e teu público em geral. É o combustível do CRM e do disparo de reativação.
>
> Divido assim:
>
> 1. Você baixa o extrato do banco (março até hoje) e me manda — 15 min
> 2. A gente faz uma call de ~1h: eu leio os pix, você acha o contato no WhatsApp e me manda — eu preencho tudo
> 3. Na mesma leva, você marca também quem orçou e não fechou — só me manda o contato com um áudio curto
> 4. Depois: print da tua lista de bloqueados (pra essa galera ficar FORA de tudo), e um export da tua agenda que eu te guio em 10 min
> 5. O Instagram antigo eu resolvo sozinho com os acessos
>
> Você não toca em planilha nenhuma. Banco, WhatsApp e memória. Topas [dia X] ou [dia Y] pra call?

---

## Critério de pronto

- [ ] Tier 1 completo: telefone + nome + data + valor em todas as linhas
- [ ] Tier 2 completo: telefone + nome + contexto
- [ ] Blacklist aplicada em todas as listas
- [ ] Tier 3 triado (S/N) + lista de handles Insta cruzada
- [ ] Cronograma de disparo escalonado definido (depende do volume)
- [ ] Copies dos Tiers 2 e 3 escritos e aprovados
