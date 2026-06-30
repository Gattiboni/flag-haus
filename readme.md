# Flag Haus — CRM & Web Ecosystem

Estúdio de tatuagem autoral de **Julio Bandeiras**, Vila Mariana, São Paulo.
Repositório principal de código e documentação do ecossistema digital.

---

## O que vive aqui

Este repositório consolida o **código de aplicação**, o **schema do banco**, e a
**documentação consolidada** do projeto Flag Haus.

O ecossistema é construído em camadas independentes que se conectam:

```
┌─────────────────────────────────────────────────────────────┐
│                         flaghaus.art                         │
│              Site institucional (WordPress)                  │
│           — em migração lenta, sem prazo fixo                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  cadastro.flaghaus.art                       │
│        Aplicação Next.js — formulários + CRM operacional     │
│       (este repositório) — deployed via Vercel               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Supabase (Postgres + Auth + Storage)           │
│           Banco de dados canônico do CRM Flag Haus           │
└─────────────────────────────────────────────────────────────┘
```

---

## Status atual

**Construído:**

- Schema CRM completo no Supabase (10 tabelas, ENUMs, RLS habilitada)
- Copy aprovado dos dois formulários (`/anamnese` e `/cadastro`)
- Previews HTML standalone (não-funcionais) dos dois formulários
- Setup Next.js + integração Supabase + deploy Vercel

**Em construção:**

- Implementação real dos formulários
- Página de admin para Julio

**No horizonte:**

- RLS policies + Auth Hooks
- Página admin com edição de cadastros
- Snapshot mensal automatizado da carteira
- Migração progressiva do site institucional pra Next.js

---

## Stack

**Aplicação:**

- Next.js 15 (App Router, TypeScript)
- Tailwind CSS (utilitários) + CSS Variables (design tokens)
- Fontes: Fraunces (títulos) + Lato (corpo) via Google Fonts
- Deploy: Vercel

**Banco e backend:**

- Supabase (Postgres hosted)
- Extensões: PostGIS, função UUIDv7 custom (pure SQL)
- RLS habilitada em todas as tabelas (policies a definir)

**Site institucional (legado, em migração):**

- WordPress 6.9.x na Hostinger
- Tema Astra (rodando em produção; decisão original de Hello Elementor foi
  superada — ver decision_log #015)
- Plugins: RankMath, LiteSpeed, Wordfence, Elementor, Smash Balloon

---

## Estrutura do repo

```
flag-haus/
├── src/                          → Aplicação Next.js
│   ├── app/                      → Rotas (App Router)
│   ├── components/               → Componentes React
│   └── lib/
│       └── supabase/             → Clientes Supabase (client/server)
│
├── docs/                         → Documentação consolidada
│   ├── decision_log.md           → Registro formal de decisões (canônico)
│   ├── changelog.md              → Histórico de entregas
│   ├── stack.md                  → Stack técnica (em revisão constante)
│   ├── arquitetura.md            → Arquitetura da Informação
│   ├── copy_anamnese_v2_consolidado.md → Copy aprovado dos forms
│   ├── schema_supabase_*.md      → Dumps do schema Supabase
│   ├── anamnese_preview_v1.html  → Preview standalone (referência)
│   └── cadastro_preview_v1.html  → Preview standalone (referência)
│
├── public/                       → Assets públicos (Next.js)
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── .env.example
```

Os diretórios `Artistas/`, `Backgrounds site Flag Haus/`, `Pack Jobs Flag Haus/`
contêm assets brutos e ficam fora do build da aplicação.

---

## Como rodar local

**Pré-requisitos:**

- Node.js 20+
- Conta no Supabase (acesso à publishable key)

**Setup:**

```bash
git clone https://github.com/Gattiboni/flag-haus.git
cd flag-haus
npm install
cp .env.example .env.local
# editar .env.local com as credenciais do Supabase
npm run dev
```

A aplicação sobe em `http://localhost:3000`.

**Rotas:**

- `/` — formulário de renovação de cadastro
- `/antes-da-sessao` — formulário de anamnese pré-sessão
- `/__health` — rota técnica de teste de conexão (será removida antes do
  lançamento público)

---

## Variáveis de ambiente

Ver `.env.example` na raiz. Mínimo necessário pra rodar:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

A `publishable key` é segura por design (pode aparecer no frontend). Não
confundir com `service_role` key — essa nunca entra em `NEXT_PUBLIC_*`.

---

## Princípios de desenvolvimento

Princípios não-negociáveis aplicados em toda decisão técnica:

1. **Incremental.** Nenhuma decisão pode ser impedimento óbvio pra próxima.
2. **Modular.** Plugar e desplugar qualquer fonte sem reescrita.
3. **Zero dívida técnica.** Sem gambiarra, sem "depois a gente resolve".
4. **Nunca presumir.** Em dúvida, pergunta antes de codar.
5. **Respeitar arquitetura.** Decisões antigas merecem ser superadas com nova
   entrada no decision_log, nunca apagadas em silêncio.

---

## Documentação canônica

A fonte da verdade para decisões e histórico vive em `docs/`:

- **`docs/decision_log.md`** — toda decisão arquitetural relevante, numerada e
  datada. Decisões antigas não são apagadas; são superadas por decisões novas
  que referenciam as anteriores.
- **`docs/changelog.md`** — histórico cronológico de entregas (código, schema,
  copy).

Quando algo for decidido em conversa que não tem registro em `docs/`, **escrever
entrada lá antes de seguir**. Decisão sem registro é dívida silenciosa.

---

## Licença

Projeto proprietário desenvolvido por **Alan Gattiboni (Gattiboni
Enterprises)**. Uso e distribuição restritos ao estúdio **Flag Haus / Julio
Bandeiras**.

---

> "O gesto como bandeira. A presença como rito. O dado, agora, também."
