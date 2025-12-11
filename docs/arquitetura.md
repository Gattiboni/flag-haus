# Arquitetura da Informação – Flag Haus / Julio Bandeiras

Versão 1.0 – 09/12/2025

Documento responsável por consolidar toda a estrutura, lógica, navegação e requisitos do site. Serve como base para wireframes, conteúdo, desenvolvimento e validação.

---

# 1. Estrutura de Páginas

## 1.1 MUST HAVE

- Home
- Sobre
- Serviços
- Agendamento
- Blog
- Post Individual
- Contato
- Políticas (Privacidade e Termos)

## 1.2 NICE TO HAVE

- Serviços detalhados
- Depoimentos
- FAQ
- Landing Pages
- Press

## 1.3 FOR LATER

- Área do Cliente
- Loja
- Recursos Avançados
- Dashboards internos
- Formulários Inteligentes

---

# 2. Hierarquia de Navegação

## 2.1 Menu Principal (Header)

- Home
- Sobre
- Serviços
- Blog
- Contato
- Agendamento (botão de destaque)

## 2.2 Submenus (se/quando aplicável)

- Serviços → Serviços detalhados (futuro)
- Blog → Categorias (posterior)

## 2.3 Footer

- Informação institucional: endereço, email, telefone, WhatsApp
- Links sociais: Instagram
- Links legais: Política de Privacidade, Termos de Uso
- Navegação reduzida: Home, Serviços, Blog, Contato, Agendamento

## 2.4 Navegação Mobile

- Menu sanduíche
- Itens na mesma ordem do desktop
- CTA de Agendamento em destaque
- Submenus recolhíveis

---

# 3. Mapa Inicial de URLs

- /
- /sobre
- /servicos
- /agendamento
- /blog
- /blog/[slug]
- /contato
- /politica-de-privacidade
- /termos-de-uso

Futuro:

- /servicos/[slug]
- /faq
- /depoimentos
- /press
- /lp/[slug]

---

# 4. Modelo Inicial de Componentes

Conjunto de blocos que irão compor os wireframes e depois o tema WordPress.

## 4.1 Componentes Globais

- Header
- Footer
- Hero (variações: texto, CTA, imagem)
- Seção de texto + imagem
- Seção de destaques
- Cards (serviços, conteúdos, depoimentos)
- Botões (primário, secundário)
- Grid de posts
- Formulário (contato, agendamento futuro)
- Embed Instagram (carrossel)

## 4.2 Componentes Específicos por Página

- **Home:** hero + manifesto curto + serviços + feed IG + CTA
- **Serviços:** lista + cards + CTA
- **Agendamento:** formulário + link para calendário externo
- **Blog:** grid categorizado, paginação, filtros simples
- **Post:** título + subtítulo + conteúdo + posts relacionados
- **Contato:** formulário + dados + mapa (opcional)
- **Políticas:** texto estático

---

# 5. Fluxos de Usuário (User Flows)

## 5.1 Fluxo: Usuário → Entendimento → Agendamento

1. Chega na Home
2. Visualiza posicionamento FH
3. Vê serviços
4. Clica em Agendar
5. Preenche formulário / aciona calendário
6. Dados entram no CRM leve

## 5.2 Fluxo: Usuário → Blog → Conversão

1. Entra via busca orgânica
2. Lê post
3. Vê CTA embutido
4. Vai para Contato ou Agendamento

## 5.3 Fluxo: Usuário → Serviços → Subserviço (futuro)

1. Visualiza lista de serviços
2. Abre detalhamento
3. CTA → Agendamento

---

# 6. Requisitos de Acessibilidade

- Alt text obrigatório em todas as imagens
- Contraste mínimo AA
- Títulos estruturados: H1 → H2 → H3
- Links com rótulos claros
- Navegação por teclado
- Evitar textos em imagens

---

# 7. Requisitos de Performance

- Peso da Home ≤ 2.5 MB
- Todas as imagens em WebP
- Lazy Loading para imagens e embeds
- Compressão de CSS/JS (via LiteSpeed ou WP Rocket)
- Cache de página ativo
- Limitar plugins a apenas os essenciais

---

# 8. Requisitos de Conteúdo por Página

## 8.1 Home

- Tagline
- Manifesto curto
- Lista resumida de serviços
- Embed Instagram
- CTA forte

## 8.2 Sobre

- História
- Princípios FH
- Foto institucional

## 8.3 Serviços

- Lista clara de serviços
- Descrições curtas
- CTA

## 8.4 Agendamento

- Instruções breves
- Calendário ou formulário
- Captura para CRM

## 8.5 Blog

- Categorias definidas
- Conteúdo otimizado SEO

## 8.6 Post Individual

- Autor opcional
- Data
- Conteúdo
- Imagens otimizadas
- CTA

## 8.7 Contato

- Formulário
- Dados
- WhatsApp

## 8.8 Políticas

- Estrutura padrão LGPD

---

# 9. Restrições do Projeto

- Sem login de usuário no MVP
- Sem loja no MVP
- Sem Supabase nesta fase
- Evitar componentes pesados
- Evitar páginas excessivamente longas
- Evitar dependência de plugins instáveis

---

# 10. Matriz de Responsabilidades

| Área             | Responsável               |
| ---------------- | ------------------------- |
| Arquitetura      | Gattiboni                 |
| Conteúdo         | Gattiboni                 |
| Design/Wireframe | Gattiboni                 |
| Implementação WP | Ferramentas / Assistentes |
| CRM Básico       | Gattiboni                 |
| SEO Técnico      | Gattiboni                 |
| Monitoramento    | Gattiboni                 |

---

# 11. Matriz de Prioridade das Páginas

1. Home
2. Serviços
3. Agendamento
4. Sobre
5. Contato
6. Blog
7. Post
8. Políticas
9. Demais páginas (NICE TO HAVE)



---

Fim da versão 1.0 da Arquitetura da Informação.

