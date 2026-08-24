# Briefing — Replicar o sistema de tags (contato + calendário) no Flag Haus

**De:** Claudinho do projeto Spinhardi · **Para:** Claudinho do projeto Flag Haus · **Data:** 19/08/2026

Este documento transfere um sistema de tags testado em produção em outro projeto do Alan (CRM Spinhardi, lote D098, validado com provas determinísticas e roteiro de UI com resíduo zero). A missão no Flag Haus é mais simples e mais bonita: o CRM está nascendo, então tags no nível de contato e o calendário já nascem transversais desde o dia um, sem retrofit.

O Flag Haus não tem as integrações do projeto de origem (sem sync de terceiros no contato, sem ERP). A única integração é Google Calendar, já conectado pelo Alan. Tudo que abaixo se refere a vocabulários externos de tag NÃO se aplica: aqui existe UM vocabulário só, a tag interna.

---

## 0. Regras de trabalho com o Alan (inegociáveis)

1. **Incrementalidade, modularidade, zero dívida técnica.** Nada de "depois a gente resolve".
2. **Nunca presuma paths, schema ou arquivos.** Investigue o repo real e o banco real ANTES de qualquer proposta. Se este briefing divergir do repo, o repo manda e você avisa.
3. **Decisões pro Alan em formato binário ou quase.** Verborragia mata. Recomendação sua em meia frase, ele bate o martelo.
4. **Fluxo:** investigação (α, só leitura, relatório com evidência) → contrato congelado → implementação → validação em runtime (β) com evidência → papelada. Decisão congelada não se relitiga.
5. Sem elogio, sem reforço positivo, PT-BR informal, sem em-dash em prosa.

## 1. Modelo de dados (o coração, replicar como está)

Duas estruturas, nada de tabela de junção (alternativa descartada no projeto de origem: junção `contact_tags` foi proposta e superada por este desenho, mais simples e suficiente):

**Catálogo `tags`:**
- `id` uuid PK
- `name` text NOT NULL (exibição, pode mudar)
- `slug` text NOT NULL UNIQUE (identidade, NUNCA muda depois de criada)
- `cor` text NOT NULL (hex)
- `grupo` text NULL (opcional, agrupamento futuro)
- `is_active` boolean default true

**Aplicação:** coluna `tags text[]` na tabela de contatos, contendo SLUGS, com índice GIN. Sem FK (o array de slugs é intencional: barato, greenfield aguenta, e o comportamento de órfã vira regra de UI, não constraint).

**Princípios que fazem isso funcionar:**
- **Slug é a identidade.** Rename muda `name`, nunca `slug`. Assim renomear reflete em todos os contatos na hora, sem migração de dados.
- **Um escritor por coluna.** Só a UI (actions do app) escreve em `contacts.tags`. Se um dia entrar qualquer sync/import, ele NÃO toca essa coluna.
- **Uma função canônica de normalização de slug**, exportada de um módulo compartilhado, usada por TODO ponto de criação. TRAP de origem: duas cópias da normalização nasceram em arquivos diferentes e tiveram que ser consolidadas depois. Não repita.

## 2. Ciclo de vida (regras de contrato, todas apanhadas na prática)

- **Criação devolve a tag criada** (`{id, name, slug, cor}`). O chamador aplica na hora, sem prever slug no cliente e sem depender de refresh (TRAP: prever slug no cliente cria corrida e duplica lógica).
- **Colisão é de SLUG, não de nome.** A mensagem de erro tem que dizer isso. Par real que pega gente: "Lua de Mel" e "Lua-de-Mel" geram o mesmo slug.
- **Paleta fixa** de 8-10 hexes definida em constante única, coerente com a identidade visual do Flag Haus, TODAS com contraste ≥ 4,5:1 como texto de badge vazada sobre fundo branco. TRAP de origem: o dourado da marca reprovou (3,46:1) e teve que entrar escurecido. Calcule o WCAG sobre a constante real em teste determinístico. Criação inline usa cor da paleta automaticamente (menos usada no catálogo, empate pela ordem); color picker livre só na tela de administração.
- **Tag órfã** (slug aplicado sem entrada no catálogo, possível após exclusão): nunca some, nunca trava; renderiza cinza com tooltip e ✕ pra remover; recusada em NOVA escrita.
- **Tag desativada** (`is_active=false`) é tratada como órfã no editor do contato: removível com ✕. TRAP crítica de origem: sem essa regra, um contato com tag desativada ficava com o save PERMANENTEMENTE travado (a validação recusava o payload inteiro e a UI não oferecia como remover). Não nasça com esse bug.
- **Exclusão do catálogo sem cascata**, com aviso honesto na UI ("quem já tem continua com ela, marcada como fora do catálogo; não tem desfazer"). Decisão consciente: histórico > taxonomia limpa.

## 3. Permissões

No projeto de origem: **criar tag = qualquer sessão aprovada** (é tarefa operacional, não pode depender de admin); **editar/excluir = admin**. Se o Flag Haus tiver papéis, replique essa divisão. Se for single-user ou sem papéis ainda, simplifique e registre como decisão, mas preserve a SEPARAÇÃO de superfícies (criar/aplicar no ponto de uso; gerenciar em lugar próprio), porque ela é o que mantém a criação sem fricção e a destruição com cerimônia.

TRAP de origem: o guard de admin REDIRECIONAVA em vez de retornar erro, o que impedia reusar a action administrativa em contextos operacionais. Se o Flag Haus tiver guards, confira a semântica antes de reusar.

## 4. Superfícies e UX (modelo ClickUp: criar no ponto de uso, gerenciar à parte)

**Ficha do contato:**
- Bloco de tags com badges vazadas (contorno + texto na cor da tag).
- Editor: toggles do catálogo ativo (aplicada = preenchida, disponível = vazada), campo "criar tag nova" com botão que cria E aplica, linha "Fora do catálogo ativo" com órfãs/desativadas removíveis.
- Modal "Gerenciar tags" (renomear, recolorir, ativar/desativar, excluir), com linha de edição inline e confirmação de exclusão EMBUTIDA na linha (nunca modal sobre modal, nunca `confirm()` nativo).

**Lista de contatos:**
- Select de filtro por UMA tag (vocabulário do catálogo; inativas listadas com sufixo "(desativada)", porque continuam aplicadas em gente que precisa de revisão).
- Se houver ações em massa, "adicionar tag" com criação inline que entra já selecionada no select.

**Calendário (nasce transversal):**
- Filtro "Tag do cliente": select de UMA tag na faixa de filtros.
- Semântica pergunta-chave (ÚNICA decisão de contrato que o Alan precisa bater aqui): com filtro ativo, evento SEM contato vinculado some ou fica? No projeto de origem o Alan escolheu **estrito: some**, com faixa de aviso explícita ("mostrando só o que é de cliente com a tag X; eventos sem cliente vinculado estão escondidos") e link "Limpar filtro". Racional dele: "menos é mais" pra operadora. Com Google Calendar como fonte, eventos sem contato vinculado VÃO existir (compromissos pessoais, eventos criados fora do CRM), então apresente o binário pra ele com esse dado na mão. Recomendação herdada: estrito com aviso.
- Filtro nunca silencioso: estado ativo visível, desligou volta tudo.
- Persistência das preferências de filtro em localStorage, com decodificação tolerante a chave nova (retrocompatibilidade de graça).
- Mecânica: o dado do evento carrega `contactId` (nullable); a page carrega em paralelo um mapa `contactId → slugs[]` numa varredura única da tabela de contatos (NUNCA `.in()` com lista grande de ids; no projeto de origem, 500+ ids estouraram header HTTP; se precisar de join server-side, RPC). Predicado client-side no memo de eventos visíveis. Parâmetro de tag na query server-side fica como ponto de extensão nomeado, só quando houver paginação/volume que justifique.

**Google Calendar, atenção de desenho:** defina desde o início ONDE mora o vínculo evento→contato (campo próprio na tabela local de eventos? convenção? extended properties do Google?). Sem esse vínculo o filtro por tag não tem o que filtrar. Isso é decisão de contrato do calendário do Flag Haus, anterior ao filtro, e este briefing não a prescreve porque depende do desenho de sincronização que o repo já tiver. Investigue primeiro.

## 5. O que NÃO replicar

- Vocabulário de tag externo read-only (no projeto de origem existe um segundo vocabulário vindo de sync; o Flag Haus não tem e não deve inventar).
- Kanban/jornadas: se o Flag Haus não tiver funil ainda, o sistema acima já nasce pronto pra ganhar essa superfície depois (a tag é do contato, qualquer tela futura só lê).
- Qualquer ponte pra ERP.

## 6. Ordem de implementação sugerida (incremental)

1. **α:** investigar repo e banco do Flag Haus: tabela de contatos real, como o calendário está sendo desenhado, onde mora o vínculo evento→contato, se existem papéis/guards. Relatório com evidência (path + trecho), flags de decisão sem escolher.
2. **Contrato curto** com os binários pro Alan (a esta altura provavelmente só: semântica do filtro no calendário + permissões se houver papéis + onde mora o vínculo evento→contato).
3. **Migration única** (greenfield): catálogo + coluna array + GIN.
4. **Fundação TS:** módulo compartilhado (normalização de slug, paleta, validação), action de criação que devolve a tag, action de aplicar/remover.
5. **Ficha e lista** (aplicar, criar inline, gerenciar, filtro).
6. **Calendário** (filtro por tag do contato).
7. **β:** provas determinísticas (slug byte a byte, colisão, WCAG da paleta sobre a constante real, predicados de filtro incluindo evento sem contato) + roteiro de UI com escritas de teste revertidas e resíduo zero provado por query.

## 7. Critérios que definiram sucesso no projeto de origem

Zero migration além da fundação, zero dependência nova, uma normalização de slug, nenhum `confirm()` nativo, nenhum hex solto fora da paleta nos pontos de criação, e o roteiro de UI inteiro passando com resíduo zero. Mesma régua vale aqui.
