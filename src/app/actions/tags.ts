'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireOperator } from '@/lib/auth/gate'
import { createAdminClient } from '@/lib/supabase/admin'
import { TAG_NAME_MAX, checkTagName, isPaletteColor, pickAutoColor } from '@/lib/tags'
import { CADASTROS_PATH } from '@/app/admin/_ui/cadastros'
import { CALENDARIO_PATH } from '@/app/admin/_ui/calendario'
import type { TagCatalogEntry } from '@/app/admin/_ui/tags'

/**
 * Server Actions de tags. DUAS famílias, e a separação é o coração do desenho:
 *
 * **A — Aplicação.** Escreve SÓ em `people.tags`. Quem tem a tag.
 * **B — Catálogo.** Escreve SÓ em `tags`. O que a tag é.
 *
 * Elas nunca se misturam, e é isso que faz renomear uma tag não tocar em
 * contato nenhum: o contato guarda o slug, e o slug é imutável. A dispersão do
 * novo nome acontece no render, pela indireção (contrato §11.1).
 *
 * `people.tags` não tem outro escritor no repo — nem `submit_cadastro`, nem o
 * sync do calendário, nem `updatePerson`. Um mapper genérico que aceitasse
 * `tags` por fora quebraria a invariante inteira.
 */

const PERSON_PATH = '/admin/people/[id]'

/**
 * Toda ação de CATÁLOGO revalida as telas que exibem tag (contrato §11.5):
 * a badge da ficha, o filtro da lista e o drawer do calendário leem o catálogo
 * no render, então um rename que não revalidasse deixaria o nome velho na tela
 * até o próximo refresh — e o Julio concluiria que o rename não funcionou.
 */
function revalidateTagSurfaces() {
  revalidatePath(PERSON_PATH, 'page')
  revalidatePath(CADASTROS_PATH)
  revalidatePath(CALENDARIO_PATH)
}

export type TagActionResult =
  | { status: 'ok' }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

/* ==================================================================
   Família A — aplicação (escreve só em people.tags)
   ================================================================== */

const applySchema = z.object({
  personId: z.string().uuid(),
  slug: z.string().min(1).max(60),
  op: z.enum(['add', 'remove']),
})

export type ApplyPersonTagInput = z.infer<typeof applySchema>

/**
 * Aplica ou remove UMA tag de UM contato.
 *
 * A assimetria entre entrar e sair é deliberada e é o que evita o save travado
 * (contrato §3): pra ENTRAR, o slug precisa existir E estar ativo; pra SAIR,
 * vale qualquer slug — órfão de tag excluída, tag desativada, o que for. Um
 * contato não pode ficar refém de uma decisão de catálogo tomada depois.
 */
export async function applyPersonTag(
  raw: ApplyPersonTagInput
): Promise<TagActionResult> {
  const { userId } = await requireOperator()

  const parsed = applySchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'invalid', reason: 'Tag inválida.' }
  }
  const { personId, slug, op } = parsed.data

  try {
    const admin = createAdminClient()

    if (op === 'add') {
      const { data: tag, error } = await admin
        .from('tags')
        .select('slug, is_active')
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        console.error('[applyPersonTag] leitura do catálogo:', error.message)
        return { status: 'error', message: error.message }
      }
      if (!tag) {
        return { status: 'invalid', reason: 'Essa tag não existe mais no catálogo.' }
      }
      if (!tag.is_active) {
        return {
          status: 'invalid',
          reason: 'Essa tag está desativada — reativa antes de aplicar.',
        }
      }
    }

    const { data: person, error: readErr } = await admin
      .from('people')
      .select('id, tags, deleted_at')
      .eq('id', personId)
      .maybeSingle()

    if (readErr) {
      console.error('[applyPersonTag] leitura da pessoa:', readErr.message)
      return { status: 'error', message: readErr.message }
    }
    if (!person || person.deleted_at) {
      return { status: 'error', message: 'Pessoa não encontrada.' }
    }

    const current: string[] = Array.isArray(person.tags) ? person.tags : []
    const has = current.includes(slug)

    // Já está no estado pedido: não grava nem audita. Duplo clique e aba velha
    // não podem virar duas linhas de evento dizendo a mesma coisa.
    if ((op === 'add' && has) || (op === 'remove' && !has)) {
      return { status: 'ok' }
    }

    const next = op === 'add' ? [...current, slug] : current.filter((s) => s !== slug)

    const { error: writeErr } = await admin
      .from('people')
      .update({ tags: next })
      .eq('id', personId)
      .is('deleted_at', null)

    if (writeErr) {
      console.error('[applyPersonTag] escrita:', writeErr.message)
      return { status: 'error', message: writeErr.message }
    }

    // Mesmo tipo de evento das outras edições de pessoa. O payload registra QUE
    // mudou e qual slug — nada além disso, como em `updatePersonNotes`.
    const { error: auditErr } = await admin.from('events').insert({
      person_id: personId,
      event_type: 'admin.person_updated',
      source: 'admin',
      actor_id: userId,
      payload: { field: 'tags', op, slug },
    })
    if (auditErr) {
      console.error('[applyPersonTag] audit insert failed:', auditErr.message)
    }

    revalidatePath(`/admin/people/${personId}`)
    revalidatePath(CADASTROS_PATH)
    revalidatePath(CALENDARIO_PATH)
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[applyPersonTag] throw:', msg)
    return { status: 'error', message: msg }
  }
}

/* ==================================================================
   Família B — catálogo (escreve só em tags)
   ================================================================== */

export type CreateTagResult =
  | { status: 'ok'; tag: TagCatalogEntry & { id: string } }
  | { status: 'invalid'; reason: string }
  | { status: 'error'; message: string }

const createSchema = z.object({ name: z.string().max(TAG_NAME_MAX + 20) })

/**
 * Cria a tag e DEVOLVE a tag completa. Isso é contrato, não conveniência
 * (§11.4): o chamador aplica na hora, com o slug que o servidor gerou. A TRAP
 * da origem era o cliente prever o slug pra aplicar em seguida — e ele previa
 * errado sempre que a normalização discordava, criando a tag e aplicando outra.
 *
 * Criar é a única ação de catálogo permitida a qualquer sessão aprovada: ela
 * acontece no meio de outra tarefa (marcar um contato), e mandar o Julio abrir
 * o gerenciador pra voltar depois é como uma tag deixa de ser criada.
 */
export async function createTag(raw: { name: string }): Promise<CreateTagResult> {
  await requireOperator()

  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    return { status: 'invalid', reason: 'Nome inválido.' }
  }

  const checked = checkTagName(parsed.data.name)
  if (!checked.ok) return { status: 'invalid', reason: checked.reason }

  try {
    const admin = createAdminClient()

    const { data: existing, error: readErr } = await admin
      .from('tags')
      .select('id, name, slug, color, is_active')

    if (readErr) {
      console.error('[createTag] leitura do catálogo:', readErr.message)
      return { status: 'error', message: readErr.message }
    }

    const all = (existing ?? []) as Array<TagCatalogEntry & { id: string }>
    const clash = all.find((t) => t.slug === checked.slug)
    if (clash) {
      // A mensagem fala em SLUG, não em nome (contrato §2): "Retorno" e
      // "retorno." dão o mesmo slug, e dizer "esse nome já existe" mandaria o
      // Julio procurar um nome idêntico que ele não vai encontrar.
      return {
        status: 'invalid',
        reason: `Já existe uma tag com o identificador "${checked.slug}" (${clash.name}).`,
      }
    }

    const color = pickAutoColor(all.map((t) => t.color))

    const { data: created, error: writeErr } = await admin
      .from('tags')
      .insert({ name: checked.name, slug: checked.slug, color })
      .select('id, name, slug, color, is_active')
      .single()

    if (writeErr) {
      console.error('[createTag] escrita:', writeErr.message)
      return { status: 'error', message: writeErr.message }
    }

    revalidateTagSurfaces()
    return { status: 'ok', tag: created as TagCatalogEntry & { id: string } }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[createTag] throw:', msg)
    return { status: 'error', message: msg }
  }
}

const renameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(TAG_NAME_MAX + 20),
})

/**
 * Renomear escreve SÓ em `tags.name`. O slug não muda — nunca (contrato §2).
 *
 * É por isso que não há cascata: os contatos guardam o slug, e o nome novo
 * aparece em toda tela no próximo render. Zero linhas de `people` tocadas,
 * mesmo que a tag esteja em duzentos contatos.
 */
export async function renameTag(raw: { id: string; name: string }): Promise<TagActionResult> {
  await requireOperator()

  const parsed = renameSchema.safeParse(raw)
  if (!parsed.success) return { status: 'invalid', reason: 'Dados inválidos.' }

  const checked = checkTagName(parsed.data.name)
  if (!checked.ok) return { status: 'invalid', reason: checked.reason }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('tags')
      .update({ name: checked.name })
      .eq('id', parsed.data.id)

    if (error) {
      console.error('[renameTag] escrita:', error.message)
      return { status: 'error', message: error.message }
    }

    revalidateTagSurfaces()
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[renameTag] throw:', msg)
    return { status: 'error', message: msg }
  }
}

const recolorSchema = z.object({
  id: z.string().uuid(),
  color: z.string(),
})

/** Recolorir. A cor tem que ser da paleta — é ela que garante o contraste. */
export async function recolorTag(raw: { id: string; color: string }): Promise<TagActionResult> {
  await requireOperator()

  const parsed = recolorSchema.safeParse(raw)
  if (!parsed.success) return { status: 'invalid', reason: 'Dados inválidos.' }
  if (!isPaletteColor(parsed.data.color)) {
    return { status: 'invalid', reason: 'Essa cor não é da paleta.' }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('tags')
      .update({ color: parsed.data.color })
      .eq('id', parsed.data.id)

    if (error) {
      console.error('[recolorTag] escrita:', error.message)
      return { status: 'error', message: error.message }
    }

    revalidateTagSurfaces()
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[recolorTag] throw:', msg)
    return { status: 'error', message: msg }
  }
}

const activeSchema = z.object({ id: z.string().uuid(), active: z.boolean() })

/**
 * Desativar é SOFT e assimétrico: bloqueia a ENTRADA em contato novo, preserva
 * quem já tem, e destrava a SAÍDA (a badge vira removível como órfã). É o que
 * permite aposentar uma tag sem sair caçando os contatos que a carregam.
 */
export async function setTagActive(raw: { id: string; active: boolean }): Promise<TagActionResult> {
  await requireOperator()

  const parsed = activeSchema.safeParse(raw)
  if (!parsed.success) return { status: 'invalid', reason: 'Dados inválidos.' }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('tags')
      .update({ is_active: parsed.data.active })
      .eq('id', parsed.data.id)

    if (error) {
      console.error('[setTagActive] escrita:', error.message)
      return { status: 'error', message: error.message }
    }

    revalidateTagSurfaces()
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[setTagActive] throw:', msg)
    return { status: 'error', message: msg }
  }
}

/**
 * Excluir. SEM cascata, por decisão de contrato (§3: a coluna não tem FK).
 *
 * Os contatos que carregam o slug continuam carregando: a badge vira órfã —
 * cinza, com tooltip, removível pelo ✕ e recusada em escrita nova. Varrer
 * `people` pra limpar o slug seria uma escrita em massa disparada por uma ação
 * de catálogo, exatamente a mistura de famílias que este módulo evita.
 *
 * O aviso honesto disso é responsabilidade da UI, embutido na linha.
 */
export async function deleteTag(raw: { id: string }): Promise<TagActionResult> {
  await requireOperator()

  const parsed = z.object({ id: z.string().uuid() }).safeParse(raw)
  if (!parsed.success) return { status: 'invalid', reason: 'Dados inválidos.' }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('tags').delete().eq('id', parsed.data.id)

    if (error) {
      console.error('[deleteTag] escrita:', error.message)
      return { status: 'error', message: error.message }
    }

    revalidateTagSurfaces()
    return { status: 'ok' }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    console.error('[deleteTag] throw:', msg)
    return { status: 'error', message: msg }
  }
}

/** Catálogo completo — ativas e inativas, pro editor e pro gerenciador. */
export async function listTags(): Promise<Array<TagCatalogEntry & { id: string }>> {
  await requireOperator()

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tags')
    .select('id, name, slug, color, is_active')
    .order('name', { ascending: true })

  if (error) {
    console.error('[listTags] falhou:', error.message)
    return []
  }
  return (data ?? []) as Array<TagCatalogEntry & { id: string }>
}
