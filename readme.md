# Flag Haus – Website & Branding Ecosystem

Versão inicial – Dez/2025

O **Flag Haus** nasce como a expressão digital do estúdio de tatuagem de Julio Bandeiras: um espaço que combina gesto, precisão e presença. O site é mais que um destino na web; é uma extensão da experiência FH, construído para refletir a estética ritualística e a linguagem visual apresentada no Branding Book.

Este repositório consolida **toda a estrutura, documentação, decisões e código** do projeto, incluindo arquitetura, wireframes, conteúdo, front‑end WordPress e integrações futuras.

---

# Sobre o Projeto

O site Flag Haus é projetado para ser:

- **Simples de navegar**
- **Forte em SEO orgânico**
- **Modular e escalável**
- **Totalmente alinhado ao branding FH** (estrutura, silêncio, gesto, ritual)

Além de ser o "site oficial" do estúdio, ele também servirá como base para automações, CRM leve, conteúdo contínuo e performance digital.

O projeto é guiado por documentação rígida e incremental, permitindo que qualquer pessoa (humana ou IA) consiga continuar o trabalho no futuro.

---

# Estrutura do Projeto

```
flag-haus/
│
├── docs/                     → Documentação completa do projeto
│   ├── Arquitetura.md        → Arquitetura da Informação
│   ├── Stack.md              → Decisões técnicas e tecnologias
│   ├── DecisionLog.md        → Registro formal de decisões
│   └── (outros)
│
├── wp-content/               → Tema WordPress (futuro)
│   ├── themes/flag-haus-child
│   └── plugins-custom/
│
├── design/                   → Wireframes, moodboard, assets visuais
│
└── .gitignore
```

---

# Objetivos do Site

O MVP do site deve cumprir:

- Reflexo fiel do branding
- Experiência limpa e direta
- Conversão eficiente para **Agendamentos**
- Estrutura sólida de SEO
- Blog funcional como pilar de conteúdo
- Embedding dinâmico do Instagram para manter o site vivo

No futuro:

- CRM leve
- Área do Cliente
- Automação de fluxos básicos
- Conexão com dashboards de performance

---

# Arquitetura e Conteúdo

A arquitetura completa está definida em [`docs/Arquitetura.md`](docs/Arquitetura.md).

Resumidamente, o site contém:

**Páginas MUST HAVE:**

- Home
- Sobre
- Serviços
- Agendamento
- Blog + Post Individual
- Contato
- Políticas

**Páginas NICE TO HAVE:**

- Serviços detalhados
- Depoimentos
- FAQ
- Press
- Landing Pages

**Futuro:**

- Área do Cliente
- Loja
- Recursos avançados e dashboards

---

# Stack Técnica

A stack oficial está descrita em [`docs/Stack.md`](docs/Stack.md).

Principais tecnologias:

- **WordPress** (tema filho customizado)
- **Plugins-chave**: SEO, performance, segurança, formulários, CRM leve, agendamento
- **Metabase** para dashboards externos (futuro)
- **Embed Instagram** para conteúdo dinâmico
- Infra simples, estável e incremental

---

# Roteiro de Desenvolvimento

O desenvolvimento segue 8 grandes blocos:

1. **Arquitetura da Informação** ✓
2. Wireframe e layout
3. Conteúdo e copy
4. Implementação do front-end (tema filho)
5. Integração com CMS e plugins
6. SEO técnico e performance
7. Testes e QA
8. Lançamento do site

Cada bloco terá seus próprios checklists e entregáveis.

---

# Filosofia

O projeto segue alguns princípios:

- Documentar tudo
- Crescer por módulos
- Não reinventar roda
- O site deve ser silencioso, preciso e funcional
- A estética deve respirar como no estúdio: sem excesso, sem ruído

---

# Licença

Projeto proprietário desenvolvido por **Alan Gattiboni (Gattiboni Enterprises)**. Uso e distribuição restritos ao estúdio **Flag Haus / Julio Bandeiras**.

---

> "O estúdio como casa simbólica. O gesto como bandeira. A presença como rito."

