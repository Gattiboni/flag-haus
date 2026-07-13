// MOAS — inventário e snapshot do schema `public` do Postgres (Supabase).
//
// Autodescoberta total: nenhum nome de tabela, coluna, função, enum ou tipo é
// hardcoded. Emite dois artefatos determinísticos e versionados:
//   docs/db/schema.md   — para LER o banco
//   docs/db/schema.sql  — para RECRIAR o banco num Postgres vazio
//
// Leitura read-only. Nenhuma query aqui escreve.
//
// Uso:
//   node scripts/moas.mjs           escreve os dois arquivos
//   node scripts/moas.mjs --check   compara com o disco; exit 1 se diferir
//
// Três camadas independentes: COLETA -> EMISSÃO -> SAÍDA.
// Adicionar uma seção = adicionar um objeto em SECTIONS. O motor não muda.

import { Client } from 'pg';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------------------------------------------------------------------------
// ENV — sem dependência. Node >= 21.7 tem process.loadEnvFile.
// ---------------------------------------------------------------------------
// loadEnvFile NÃO sobrescreve variável já exportada na shell. Se a URL já veio
// do ambiente, o .env.local é ignorado em silêncio — custou horas hoje. Avisa.
const dbUrlFromEnv = 'SUPABASE_DB_URL' in process.env;

try {
  process.loadEnvFile('.env.local');
} catch {
  // arquivo ausente: segue com process.env (permite CI no futuro)
}

if (dbUrlFromEnv) {
  console.warn('SUPABASE_DB_URL veio do ambiente, não do .env.local (loadEnvFile não sobrescreve var exportada).');
}

const DB_URL = process.env.SUPABASE_DB_URL;
const CA_PATH = 'certs/prod-ca-2021.crt';

const OUT_MD = 'docs/db/schema.md';
const OUT_SQL = 'docs/db/schema.sql';

// ---------------------------------------------------------------------------
// COLETA — a lista de seções. Cada seção = { id, title, sql, optional? }.
// Todas em `public`, todas read-only. `optional` só marca seções que podem
// não existir (ex.: schema do Supabase) — nunca abortam.
// ---------------------------------------------------------------------------
const SECTIONS = [
  {
    id: 'extensions',
    title: 'Extensões',
    sql: `
      select e.extname, e.extversion, n.nspname as schema
      from pg_extension e
      join pg_namespace n on n.oid = e.extnamespace
      order by e.extname;`,
  },
  {
    id: 'enums',
    title: 'Enums',
    sql: `
      select t.typname, e.enumlabel, e.enumsortorder
      from pg_type t
      join pg_enum e on e.enumtypid = t.oid
      join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public'
      order by t.typname, e.enumsortorder;`,
  },
  {
    id: 'tables',
    title: 'Tabelas',
    sql: `
      select c.relname as table_name,
             c.relrowsecurity as rls_enabled,
             c.relforcerowsecurity as rls_forced,
             obj_description(c.oid, 'pg_class') as comment
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','p')
      order by c.relname;`,
  },
  {
    id: 'columns',
    title: 'Colunas',
    sql: `
      select c.relname as table_name,
             a.attnum  as position,
             a.attname as column_name,
             format_type(a.atttypid, a.atttypmod) as type,
             a.attnotnull as not_null,
             pg_get_expr(d.adbin, d.adrelid) as default_expr,
             a.attgenerated as generated,
             a.attidentity as identity,
             col_description(c.oid, a.attnum) as comment
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
      where n.nspname = 'public'
        and c.relkind in ('r','p')
        and a.attnum > 0
        and not a.attisdropped
      order by c.relname, a.attnum;`,
  },
  {
    id: 'constraints',
    title: 'Constraints',
    sql: `
      select c.relname as table_name,
             con.conname as name,
             con.contype as type,
             pg_get_constraintdef(con.oid) as definition
      from pg_constraint con
      join pg_class c on c.oid = con.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
      order by c.relname, con.contype, con.conname;`,
  },
  {
    id: 'indexes',
    title: 'Índices',
    // Só índices que NÃO pertencem a constraint — os de PK/UNIQUE já vêm no
    // add constraint. Emitir duas vezes quebra o replay.
    sql: `
      select t.relname as table_name,
             i.relname as index_name,
             pg_get_indexdef(ix.indexrelid) as definition
      from pg_index ix
      join pg_class i on i.oid = ix.indexrelid
      join pg_class t on t.oid = ix.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and not exists (
          select 1 from pg_constraint con where con.conindid = ix.indexrelid
        )
      order by t.relname, i.relname;`,
  },
  {
    id: 'triggers',
    title: 'Triggers',
    // tgisinternal filtra triggers internos de FK — recriá-los explode o replay.
    sql: `
      select c.relname as table_name,
             tg.tgname  as trigger_name,
             pg_get_triggerdef(tg.oid) as definition
      from pg_trigger tg
      join pg_class c on c.oid = tg.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and not tg.tgisinternal
      order by c.relname, tg.tgname;`,
  },
  {
    id: 'functions',
    title: 'Funções',
    // deptype='e' remove as funções do PostGIS — voltam com create extension.
    sql: `
      select p.proname as name,
             pg_get_function_identity_arguments(p.oid) as args,
             pg_get_functiondef(p.oid) as definition
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.prokind = 'f'
        and not exists (
          select 1 from pg_depend d
          where d.objid = p.oid and d.deptype = 'e'
        )
      order by p.proname, pg_get_function_identity_arguments(p.oid);`,
  },
  {
    id: 'policies',
    title: 'Policies (RLS)',
    sql: `
      select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname;`,
  },
  {
    id: 'table_acl',
    title: 'Grants de tabela',
    sql: `
      select c.relname as table_name,
             coalesce(nullif(a.grantee::regrole::text, '-'), 'PUBLIC') as grantee,
             a.privilege_type,
             a.is_grantable
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      cross join lateral aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
      where n.nspname = 'public' and c.relkind in ('r','p')
      order by c.relname, grantee, a.privilege_type;`,
  },
  {
    id: 'function_acl',
    title: 'Grants de função',
    sql: `
      select p.proname as name,
             pg_get_function_identity_arguments(p.oid) as args,
             coalesce(nullif(a.grantee::regrole::text, '-'), 'PUBLIC') as grantee,
             a.privilege_type
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
      where n.nspname = 'public'
        and p.prokind = 'f'
        and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      order by p.proname, args, grantee, a.privilege_type;`,
  },
  {
    id: 'migrations',
    title: 'Migrations registradas',
    optional: true, // a tabela pode não existir; nunca aborta
    sql: `
      select version, name
      from supabase_migrations.schema_migrations
      order by version;`,
  },
];

async function collect(client) {
  const data = {};
  for (const s of SECTIONS) {
    try {
      const res = await client.query(s.sql);
      data[s.id] = res.rows;
    } catch (err) {
      if (s.optional) {
        data[s.id] = [];
      } else {
        throw err;
      }
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// helpers de formatação
// ---------------------------------------------------------------------------
const q = (id) => `"${String(id).replace(/"/g, '""')}"`; // identificador
const lit = (s) => `'${String(s).replace(/'/g, "''")}'`; // literal de texto

// célula de tabela markdown: sem quebra de linha, pipes escapados
const cell = (v) =>
  v == null ? '' : String(v).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();

const groupBy = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const k = r[key];
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};

// enums -> Map(typname -> [labels em ordem de enumsortorder])
function groupEnums(rows) {
  const m = new Map();
  for (const r of rows) {
    if (!m.has(r.typname)) m.set(r.typname, []);
    m.get(r.typname).push({ label: r.enumlabel, order: Number(r.enumsortorder) });
  }
  for (const [, arr] of m) arr.sort((a, b) => a.order - b.order);
  return m;
}

const sortRoles = (roles) => (Array.isArray(roles) ? [...roles].sort() : []);
const permWord = (p) => (String(p).toUpperCase().startsWith('PERM') ? 'permissive' : 'restrictive');

// ---------------------------------------------------------------------------
// EMISSÃO — Markdown
// ---------------------------------------------------------------------------
function renderMarkdown(data) {
  const L = [];
  L.push('# Schema — Flag Haus CRM');
  L.push('');
  L.push('> Gerado por `npm run moas`. Não editar à mão.');
  L.push('> Fonte da verdade: o banco. Este arquivo é a fotografia dele.');
  L.push('');

  // Extensões
  L.push('## Extensões');
  L.push('');
  if (data.extensions.length) {
    L.push('| Extensão | Versão | Schema |');
    L.push('| --- | --- | --- |');
    for (const e of data.extensions) {
      L.push(`| ${cell(e.extname)} | ${cell(e.extversion)} | ${cell(e.schema)} |`);
    }
  } else {
    L.push('_nenhuma_');
  }
  L.push('');

  // Enums
  L.push('## Enums');
  L.push('');
  const enums = groupEnums(data.enums);
  if (enums.size) {
    for (const [name, labels] of enums) {
      L.push(`- **${name}**: ${labels.map((l) => `\`${l.label}\``).join(', ')}`);
    }
  } else {
    L.push('_nenhum_');
  }
  L.push('');

  // Tabelas (agrupado por tabela)
  L.push('## Tabelas');
  L.push('');
  const cols = groupBy(data.columns, 'table_name');
  const cons = groupBy(data.constraints, 'table_name');
  const idxs = groupBy(data.indexes, 'table_name');
  const trgs = groupBy(data.triggers, 'table_name');
  const pols = groupBy(data.policies, 'tablename');
  const tacl = groupBy(data.table_acl, 'table_name');

  for (const t of data.tables) {
    const name = t.table_name;
    L.push(`### ${name}`);
    L.push('');
    if (t.comment) {
      L.push(cell(t.comment));
      L.push('');
    }
    const rls = t.rls_enabled
      ? `habilitada${t.rls_forced ? ' (forçada)' : ''}`
      : 'desabilitada';
    L.push(`**RLS:** ${rls}`);
    L.push('');

    // colunas
    L.push('**Colunas**');
    L.push('');
    L.push('| # | Coluna | Tipo | Nulo | Default | Comentário |');
    L.push('| --- | --- | --- | --- | --- | --- |');
    for (const c of cols.get(name) ?? []) {
      const def = c.generated === 's' ? `(gerada) ${c.default_expr ?? ''}` : c.default_expr;
      L.push(
        `| ${c.position} | ${cell(c.column_name)} | ${cell(c.type)} | ${
          c.not_null ? 'não' : 'sim'
        } | ${cell(def)} | ${cell(c.comment)} |`,
      );
    }
    L.push('');

    // constraints
    const cRows = cons.get(name) ?? [];
    if (cRows.length) {
      L.push('**Constraints**');
      L.push('');
      for (const c of cRows) {
        L.push(`- \`${c.name}\` — ${cell(c.definition)}`);
      }
      L.push('');
    }

    // índices
    const iRows = idxs.get(name) ?? [];
    if (iRows.length) {
      L.push('**Índices**');
      L.push('');
      for (const i of iRows) {
        L.push(`- \`${i.index_name}\` — ${cell(i.definition)}`);
      }
      L.push('');
    }

    // triggers
    const trRows = trgs.get(name) ?? [];
    if (trRows.length) {
      L.push('**Triggers**');
      L.push('');
      for (const tr of trRows) {
        L.push(`- \`${tr.trigger_name}\` — ${cell(tr.definition)}`);
      }
      L.push('');
    }

    // policies
    const pRows = pols.get(name) ?? [];
    if (pRows.length) {
      L.push('**Policies**');
      L.push('');
      L.push('| Nome | Comando | Roles | Using | With check |');
      L.push('| --- | --- | --- | --- | --- |');
      for (const p of pRows) {
        L.push(
          `| ${cell(p.policyname)} | ${cell(p.cmd)} | ${cell(
            sortRoles(p.roles).join(', '),
          )} | ${cell(p.qual)} | ${cell(p.with_check)} |`,
        );
      }
      L.push('');
    }

    // grants
    const gRows = tacl.get(name) ?? [];
    if (gRows.length) {
      L.push('**Grants**');
      L.push('');
      L.push('| Grantee | Privilégio |');
      L.push('| --- | --- |');
      for (const g of gRows) {
        L.push(`| ${cell(g.grantee)} | ${cell(g.privilege_type)} |`);
      }
      L.push('');
    }
  }

  // Funções
  L.push('## Funções');
  L.push('');
  const facl = new Map();
  for (const g of data.function_acl) {
    const k = `${g.name}(${g.args})`;
    if (!facl.has(k)) facl.set(k, []);
    facl.get(k).push(g);
  }
  if (data.functions.length) {
    for (const f of data.functions) {
      L.push(`### ${f.name}(${f.args})`);
      L.push('');
      L.push('```sql');
      L.push(f.definition.replace(/\r\n/g, '\n').replace(/\s+$/, ''));
      L.push('```');
      L.push('');
      const g = facl.get(`${f.name}(${f.args})`) ?? [];
      if (g.length) {
        L.push(`Grants: ${g.map((x) => `${x.grantee} → ${x.privilege_type}`).join(', ')}`);
        L.push('');
      }
    }
  } else {
    L.push('_nenhuma_');
    L.push('');
  }

  // Migrations registradas (referência)
  L.push('## Migrations registradas');
  L.push('');
  L.push('_Referência — a fonte da verdade do DDL é `schema.sql`._');
  L.push('');
  if (data.migrations.length) {
    L.push('| Version | Name |');
    L.push('| --- | --- |');
    for (const m of data.migrations) {
      L.push(`| ${cell(m.version)} | ${cell(m.name)} |`);
    }
  } else {
    L.push('_nenhuma registrada_');
  }
  L.push('');

  return L.join('\n');
}

// ---------------------------------------------------------------------------
// EMISSÃO — SQL (DDL executável num Postgres vazio, ordenado por dependência)
// ---------------------------------------------------------------------------
const CT_ORDER = { p: 0, u: 1, c: 2, x: 3, f: 4 }; // pk, unique, check, exclude, fk

function columnClause(c) {
  let s = `  ${q(c.column_name)} ${c.type}`;
  if (c.identity === 'a') s += ' generated always as identity';
  else if (c.identity === 'd') s += ' generated by default as identity';
  else if (c.generated === 's') s += ` generated always as (${c.default_expr}) stored`;
  else if (c.default_expr != null) s += ` default ${c.default_expr}`;
  // identity já implica not null; evita cláusula redundante/inválida
  if (c.not_null && c.identity === '') s += ' not null';
  return s;
}

function renderSql(data) {
  const L = [];
  L.push('-- Schema — Flag Haus CRM');
  L.push('-- Gerado por `npm run moas`. Não editar à mão.');
  L.push('--');
  L.push('-- ⚠️ NÃO TESTADO: este arquivo nunca foi executado contra um banco vazio.');
  L.push('--    Reconstrução do schema a partir dele é presumida, não verificada.');
  L.push('--');
  L.push('-- ALVO: um projeto Supabase NOVO e vazio.');
  L.push('-- Requer os roles `anon`, `authenticated`, `service_role` e as extensões');
  L.push('-- do catálogo Supabase. NÃO roda em Postgres vanilla.');
  L.push('--');
  L.push('-- NÃO contém dados. NÃO contém os schemas geridos pelo Supabase');
  L.push('-- (auth, storage, realtime, vault) — apenas o `public`.');
  L.push('');
  L.push('set check_function_bodies = off;');
  L.push('');

  // 1. extensões
  L.push('-- 1. extensões');
  // schemas de destino das extensões (ex.: extensions, vault) precisam existir
  // num banco vazio; emitir cada um uma única vez, em ordem.
  const extSchemas = [
    ...new Set(
      data.extensions
        .map((e) => e.schema)
        .filter((s) => s && s !== 'public' && s !== 'pg_catalog'),
    ),
  ].sort();
  for (const s of extSchemas) L.push(`create schema if not exists ${q(s)};`);
  for (const e of data.extensions) {
    L.push(`create extension if not exists ${q(e.extname)} with schema ${q(e.schema)};`);
  }
  L.push('');

  // 2. enums
  L.push('-- 2. enums');
  for (const [name, labels] of groupEnums(data.enums)) {
    const vals = labels.map((l) => lit(l.label)).join(', ');
    L.push(`create type "public".${q(name)} as enum (${vals});`);
  }
  L.push('');

  // 3. funções (antes das tabelas: defaults dependem delas)
  L.push('-- 3. funções');
  for (const f of data.functions) {
    L.push(`${f.definition.replace(/\r\n/g, '\n').replace(/\s+$/, '')};`);
    L.push('');
  }

  // 4. tabelas (sem constraints inline)
  L.push('-- 4. tabelas');
  const cols = groupBy(data.columns, 'table_name');
  for (const t of data.tables) {
    const body = (cols.get(t.table_name) ?? []).map(columnClause).join(',\n');
    L.push(`create table "public".${q(t.table_name)} (\n${body}\n);`);
    L.push('');
  }

  // 5. constraints — não-FK primeiro (PK, UNIQUE, CHECK, EXCLUDE), FK por último
  L.push('-- 5. constraints');
  const allCons = data.constraints;
  const byTbl = (a, b) => (a.table_name < b.table_name ? -1 : a.table_name > b.table_name ? 1 : 0);
  const byName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const nonFk = allCons
    .filter((c) => c.type !== 'f')
    .sort((a, b) => byTbl(a, b) || CT_ORDER[a.type] - CT_ORDER[b.type] || byName(a, b));
  const fk = allCons.filter((c) => c.type === 'f').sort((a, b) => byTbl(a, b) || byName(a, b));
  for (const c of [...nonFk, ...fk]) {
    L.push(
      `alter table "public".${q(c.table_name)} add constraint ${q(c.name)} ${c.definition};`,
    );
  }
  L.push('');

  // 6. índices (fora de constraint)
  L.push('-- 6. índices');
  for (const i of data.indexes) {
    L.push(`${i.definition};`);
  }
  L.push('');

  // 7. triggers
  L.push('-- 7. triggers');
  for (const tr of data.triggers) {
    L.push(`${tr.definition};`);
  }
  L.push('');

  // 8. RLS
  L.push('-- 8. row level security');
  for (const t of data.tables) {
    if (t.rls_enabled) {
      L.push(`alter table "public".${q(t.table_name)} enable row level security;`);
      if (t.rls_forced) {
        L.push(`alter table "public".${q(t.table_name)} force row level security;`);
      }
    }
  }
  L.push('');

  // 9. policies
  L.push('-- 9. policies');
  for (const p of data.policies) {
    const parts = [`create policy ${q(p.policyname)} on "public".${q(p.tablename)}`];
    parts.push(`  as ${permWord(p.permissive)}`);
    parts.push(`  for ${String(p.cmd).toLowerCase()}`);
    parts.push(`  to ${sortRoles(p.roles).join(', ')}`);
    if (p.qual != null) parts.push(`  using (${p.qual})`);
    if (p.with_check != null) parts.push(`  with check (${p.with_check})`);
    L.push(parts.join('\n') + ';');
  }
  L.push('');

  // 10. grants (revoke baseline + grants exatos)
  L.push('-- 10. grants');
  const tacl = groupBy(data.table_acl, 'table_name');
  for (const t of data.tables) {
    const tgt = `"public".${q(t.table_name)}`;
    L.push(`revoke all on table ${tgt} from public, anon, authenticated, service_role;`);
    for (const g of tacl.get(t.table_name) ?? []) {
      const who = g.grantee === 'PUBLIC' ? 'public' : g.grantee;
      const opt = g.is_grantable ? ' with grant option' : '';
      L.push(`grant ${g.privilege_type.toLowerCase()} on table ${tgt} to ${who}${opt};`);
    }
  }
  L.push('');
  const facl = new Map();
  for (const g of data.function_acl) {
    const k = `${g.name}(${g.args})`;
    if (!facl.has(k)) facl.set(k, []);
    facl.get(k).push(g);
  }
  for (const f of data.functions) {
    const sig = `"public".${q(f.name)}(${f.args})`;
    L.push(`revoke all on function ${sig} from public, anon, authenticated, service_role;`);
    for (const g of facl.get(`${f.name}(${f.args})`) ?? []) {
      const who = g.grantee === 'PUBLIC' ? 'public' : g.grantee;
      L.push(`grant ${g.privilege_type.toLowerCase()} on function ${sig} to ${who};`);
    }
  }
  L.push('');

  return L.join('\n');
}

// ---------------------------------------------------------------------------
// SAÍDA
// ---------------------------------------------------------------------------
function writeFile(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8'); // sempre LF; ver .gitattributes
}

function checkFile(path, content) {
  if (!existsSync(path)) return false;
  return readFileSync(path, 'utf8') === content;
}

async function main() {
  const check = process.argv.includes('--check');

  if (!DB_URL) {
    if (check) {
      console.warn('SUPABASE_DB_URL ausente — pulando moas:check (trabalho offline).');
      process.exit(0);
    }
    console.error('SUPABASE_DB_URL ausente. Defina em .env.local.');
    process.exit(1);
  }

  let ca;
  try {
    ca = readFileSync(CA_PATH, 'utf8');
  } catch {
    console.error(`CA ausente em ${CA_PATH}. Baixe em Supabase → Project Settings → Database → SSL.`);
    process.exit(1);
  }

  // `ssl: { ca }` é a autoridade única do TLS. Com rejectUnauthorized default
  // (true) + servername = host (pg força), entrega verify-full: cadeia pinada
  // na Supabase Root CA + identidade do servidor conferida.
  //
  // O `sslmode` da connection string precisa sair antes: o parser do pg o
  // converte num objeto ssl próprio, SEM nossa `ca`, que sobrepõe este e cai
  // pras CAs do sistema (onde a raiz Supabase não está) — SELF_SIGNED_CERT_IN_CHAIN.
  // Removemos só os params de ssl; o resto da URL fica intacto.
  const url = new URL(DB_URL);
  for (const p of ['sslmode', 'ssl', 'sslrootcert', 'sslcert', 'sslkey']) {
    url.searchParams.delete(p);
  }

  const client = new Client({
    connectionString: url.toString(),
    ssl: { ca },
  });
  let data;
  try {
    await client.connect();
    data = await collect(client);
  } catch (err) {
    // Diagnóstico SEMPRE visível: code + message. Um script de diagnóstico que
    // engole o diagnóstico é bug. Nunca imprimir a connection string.
    const diag = `[${err.code ?? 'sem código'}] ${err.message}`;
    if (check) {
      console.warn(`Banco inacessível — pulando moas:check (trabalho offline). ${diag}`);
      process.exit(0);
    }
    console.error(`Falha ao conectar/ler o banco. ${diag}`);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }

  const md = renderMarkdown(data);
  const sql = renderSql(data);

  if (check) {
    const diffs = [];
    if (!checkFile(OUT_MD, md)) diffs.push(OUT_MD);
    if (!checkFile(OUT_SQL, sql)) diffs.push(OUT_SQL);
    if (diffs.length) {
      console.error(`Divergência: ${diffs.join(', ')}`);
      process.exit(1);
    }
    process.exit(0);
  }

  writeFile(OUT_MD, md);
  writeFile(OUT_SQL, sql);
  console.log(`Escrito: ${OUT_MD}, ${OUT_SQL}`);
}

main();
