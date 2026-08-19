# Calendário + Tags — Lista de funcionalidades (v1)

**Projeto:** CRM Flag Haus · **Data:** 19/08/2026 · **Status:** guia aprovado, serve de verificação de DoD
**Referência de origem:** sistema de calendário + tags do projeto Spinhardi (D098), adaptado ao domínio Flag Haus
**Princípios:** incrementalidade · modularidade · zero dívida técnica

Cada item abaixo é verificável: a descrição diz o que precisa ser observável pra marcar como entregue.

---

## Bloco A — Fundação de dados e sync (invisível, sustenta tudo)

**1. Espelho Google — `calendar_sources` + `calendar_events`**
Tabelas locais espelhando a agenda "Horarios Flag Haus" (service account já validada no spike: 64 eventos/90 dias). Cada evento espelhado guarda id do Google, título, início/fim, descrição, criador, flag de origem (`google`/`crm`), vínculo com pessoa (nullable) e meta jsonb. Sync incremental (não recarrega tudo a cada rodada).
*DoD: sync roda, eventos do Google aparecem nas tabelas, rodar duas vezes não duplica nada.*

**2. RPC fonte única — `calendar_events_between(p_start, p_end)`**
Uma função responde "o que existe entre X e Y": eventos do espelho + aniversários, cada linha com tipo, categoria, contato resolvido, artista, flag de editabilidade e meta. O front NUNCA consulta o Google direto nem monta a agenda de fontes paralelas. Todo filtro é client-side sobre esse payload.
*DoD: página inteira alimentada por uma chamada; nenhum fetch ao Google no client.*

**3. Matcher automático evento→pessoa via telefone na descrição**
A convenção instalada com Julio e Le (telefone do cliente na descrição do evento) é lida pelo sync: telefone normalizado, batido contra `people.phone`, vínculo gravado no evento. Sem telefone ou sem match = evento fica sem contato, visível, e entra na bandeja (item 18).
*DoD: evento com telefone válido na descrição resolve a pessoa sozinho no sync seguinte.*

**4. Sync agendado + botão manual**
Vercel Cron 2x/dia + botão "Sincronizar agora" na página do calendário, com feedback de resultado (quantos eventos novos/atualizados) e carimbo de última sincronização visível.
*DoD: botão funciona na UI; cron configurado e disparando; last_synced_at exibido.*

**5. Criação de evento pelo admin com write-through pro Google**
Form no admin cria o evento NA agenda do Google via API e reflete no espelho na hora. Ao vincular pessoa no form, a descrição já sai no padrão da convenção (telefone embutido) — o Julio usa o padrão sem perceber. Campos: título, data/hora (fuso America/Sao_Paulo fixo, mesma regra do NewJob), pessoa (busca), tipo de serviço, artista, nota.
*DoD: evento criado no admin aparece na agenda do Google e no grid; descrição carrega o telefone quando há pessoa vinculada.*

**6. Reagendamento por drag + edição (eventos do CRM)**
Arrastar evento no grid muda a data via write-through (patch no Google + espelho). Edição pelo drawer idem. Vale só pra eventos criados pelo CRM (origem `crm`); evento nativo do Google mantém cadeado (item 13).
*DoD: drag de evento CRM atualiza Google e espelho; drag de evento nativo é bloqueado com feedback.*

**7. Regra de sobrescrita documentada: Google vence no sync**
Se um evento (qualquer origem) for editado direto no Google, o sync sobrescreve o espelho. Sem merge, sem conflito, sem cerimônia. Regra registrada no contrato, no decisionlog e avisada ao Julio.
*DoD: edição no Google reflete no admin após sync; regra escrita nos docs.*

---

## Bloco B — Página de calendário (UI)

**8. Página `/admin/calendario` no sidebar**
Entrada nova na sidebar do admin (e bottom nav mobile com safe-area, padrão existente), com título e subtítulo-legenda de uma linha explicando a convenção do cadeado.
*DoD: navegável a partir do admin em desktop e mobile.*

**9. Navegação temporal**
Botão Hoje + setas ◀ ▶ + rótulo do período corrente ("Agosto de 2026" / semana / dia conforme vista).
*DoD: navegação funciona nas três vistas sem refetch desnecessário fora da janela.*

**10. Vista Mês**
Célula por dia, até ~3 eventos visíveis + "+N mais" com expansão, marcador circular no dia atual. Corte de overflow aplicado DEPOIS dos filtros (o contador nunca mente).
*DoD: mês navega, overflow conta certo com filtro ativo.*

**11. Vista Semana**
Sete colunas com eventos posicionados por horário. Em 390px degrada com dignidade (colunas roláveis ou colapso pra lista do dia — decisão de design no mock).
*DoD: semana funcional em desktop e utilizável em 390px.*

**12. Vista Agenda**
Lista corrida cronológica da janela — a vista de celular por excelência pro Julio ("o que vem aí").
*DoD: lista agrupada por dia, com os mesmos cards e filtros.*

**13. Cards de evento com sistema visual consistente**
Card compacto: [cadeado se nativo do Google] [ícone do tipo] [hora] [título truncado], fundo na cor da categoria. Cadeado = read-only, "edição na agenda do Google". Cor é UM sistema: chip, card e drawer usam a mesma constante por categoria. Tags NUNCA pintam o card (badge no drawer apenas).
*DoD: mesmo evento tem a mesma cor em chip/card/drawer; cadeado visível e coerente com editabilidade real.*

**14. Drawer de detalhe**
Clique no evento abre drawer: dados completos, ações contextuais (editar/reagendar se CRM; nada se cadeado), link "Abrir ficha" quando há pessoa vinculada, tags da pessoa em badge, ação de vincular/desvincular pessoa.
*DoD: drawer abre de qualquer vista; Abrir ficha navega; posicionamento não é cortado por overflow (fixed + backdrop).*

**15. Chips de categoria**
Taxonomia Flag Haus: Todos · Sessões · Aniversários · Outros. Liga/desliga tipos, "Todos" reseta. Chips NÃO são tags (categoria = natureza do dado; tag = rótulo manual de contato) — nomeação cuidadosa na UI pra não confundir.
*DoD: filtros compõem em AND com os demais; cores consistentes com os cards.*

**16. Filtro por artista**
Julio | Lethicia | outros, derivado de `creator.email` + título (achado do spike) e do campo artista nos eventos CRM. Casa com `jobs.artist`.
*DoD: filtrar por Lethicia mostra só os eventos dela; evento sem artista identificado não some (regra de preservação).*

**17. Aniversários**
Recorrência anual resolvida NO SQL da fonte única a partir de `people.birth_date` (24/24 populado). Front recebe a ocorrência do ano pronta. Categoria própria, cor própria, clique abre a ficha.
*DoD: aniversário aparece no dia certo de qualquer ano navegado; sem lógica de recorrência no front.*

**18. Bandeja de vínculo**
Seção/aba da página listando eventos Google sem pessoa resolvida: Julio abre, busca a pessoa, vincula (persiste no espelho; opcionalmente reescreve a descrição no Google com o telefone — decisão no contrato). Contexto: hoje ZERO eventos têm telefone na descrição, então o backlog inteiro nasce aqui e a convenção esvazia a bandeja daqui pra frente.
*DoD: vincular pela bandeja remove o evento da bandeja e o drawer passa a mostrar a pessoa.*

**19. Persistência de estado**
URL carrega vista + data (compartilhável por link). localStorage carrega filtros (categorias, artista, tag) com decodificação tolerante a chave nova. Divisão deliberada: "quando/como estou olhando" viaja no link; "o que estou filtrando" é preferência pessoal.
*DoD: link colado reproduz vista+data; filtros sobrevivem a reload sem poluir a URL.*

**20. Mobile 390px**
Todas as vistas, drawer, bandeja e filtros funcionais em 390px (iPhone do Julio). Validação CDP + visual.
*DoD: zero overflow horizontal em 390×844 em todas as superfícies novas.*

---

## Bloco C — Tags nível contato (fundação transversal)

**21. Fundação de tags**
Catálogo `tags` (id, name, slug UNIQUE imutável, cor hex, grupo opcional, is_active) + coluna `people.tags text[]` de slugs com índice GIN. Sem tabela de junção, sem FK (comportamento de órfã é regra de UI). UMA função canônica de normalização de slug num módulo compartilhado. Paleta fixa de 8-10 hexes da identidade Flag Haus, TODAS com contraste ≥4,5:1 como badge vazada sobre branco, validado em teste determinístico sobre a constante real. Um escritor só: actions do app.
*DoD: migration aplicada; teste de WCAG passa; colisão de slug tem mensagem que fala de slug, não de nome.*

**22. Tags na ficha e na lista**
Ficha da pessoa: badges vazadas + editor (aplicar/remover por toggle, criar inline que cria E aplica com cor automática da paleta, linha "fora do catálogo" com órfãs/desativadas removíveis por ✕) + modal Gerenciar (renomear, recolorir, ativar/desativar, excluir com confirmação embutida na linha, aviso honesto de exclusão sem cascata). TRAPs de origem já evitadas: criação devolve a tag (sem prever slug no cliente), desativada nunca trava o save, rename não muda slug. Lista `/admin/cadastros`: filtro por UMA tag no padrão dos dropdowns existentes (estado na URL), inativas com sufixo "(desativada)".
*DoD: criar/aplicar/remover/renomear/desativar/excluir funcionam; contato com tag desativada salva normalmente; filtro da lista filtra.*

**23. Filtro "Tag do cliente" no calendário (estrito)**
Select de UMA tag na faixa de filtros. Ativo: mostra só eventos cujo contato tem a tag; evento SEM contato vinculado SOME. Faixa de aviso obrigatória enquanto ativo ("Mostrando só clientes com a tag X — eventos sem cliente vinculado estão escondidos" + Limpar filtro). Filtro nunca silencioso. Mecânica: mapa contactId→slugs carregado em varredura única (nunca `.in()` com lista grande), predicado no memo client-side.
*DoD: com filtro ativo, evento sem contato desaparece E a faixa aparece; limpar restaura tudo.*

---

## Fora do v1 (registrado, não esquecido)

- Papéis/permissões além do admin único (todo logado é admin: Julio e Alan).
- Deep-link de tag na URL (ponto de extensão nomeado).
- Parâmetros de filtro na RPC (só quando volume justificar; hoje ~130 eventos/mês com folga).
- Sync de outras agendas além da "Horarios Flag Haus" (a tabela `calendar_sources` já nasce plural pra isso ser só INSERT).
