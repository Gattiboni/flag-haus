/**
 * Contrato de exibição de tags no admin — o lado UI da fundação de tags.
 *
 * Divisão deliberada com `src/lib/tags/`: lá moram as regras de ESCRITA (a
 * função canônica de slug, a paleta, as validações), que são server-side e
 * precisam ser únicas no repo; aqui mora o vocabulário de LEITURA, que toda
 * tela compartilha e que precisa ser importável do client.
 *
 * A invariante que este arquivo serve: o contato guarda SÓ slug, e cada tela
 * resolve slug→(nome,cor) no render. Essa indireção É o mecanismo de dispersão
 * — renomear uma tag reflete em tudo sem tocar em contato nenhum.
 */

/** Uma linha do catálogo `tags`. */
export type TagCatalogEntry = {
  slug: string
  name: string
  color: string
  is_active: boolean
}

/**
 * O que a badge precisa saber pra se pintar. `orphan` = slug que não está mais
 * no catálogo (a tag foi excluída): estado LEGÍTIMO, não erro — o contrato §3
 * decidiu não ter FK justamente pra que a exclusão não cascateie.
 */
export type ResolvedTag = {
  slug: string
  name: string
  color: string | null
  orphan: boolean
  inactive: boolean
}

/** Cinza neutro da órfã: ela não pode fingir uma cor que ninguém escolheu. */
export const ORPHAN_TOOLTIP = 'Tag excluída do catálogo — só dá pra remover.'

export function tagIndex(catalog: readonly TagCatalogEntry[]): Map<string, TagCatalogEntry> {
  return new Map(catalog.map((t) => [t.slug, t]))
}

/**
 * Slug → tag exibível. Slug desconhecido NUNCA quebra o render: vira órfã com
 * o próprio slug como rótulo, cinza e removível.
 */
export function resolveTag(
  slug: string,
  index: Map<string, TagCatalogEntry>
): ResolvedTag {
  const found = index.get(slug)
  if (!found) {
    return { slug, name: slug, color: null, orphan: true, inactive: false }
  }
  return {
    slug,
    name: found.name,
    color: found.color,
    orphan: false,
    inactive: !found.is_active,
  }
}

export function resolveTags(
  slugs: readonly string[] | null | undefined,
  index: Map<string, TagCatalogEntry>
): ResolvedTag[] {
  return (slugs ?? []).map((s) => resolveTag(s, index))
}

/**
 * Rótulo do vocabulário de filtro: inativa se anuncia como tal. O Julio precisa
 * saber que está filtrando por algo que saiu de circulação, senão "cadê a tag
 * X na lista de aplicar?" vira um chamado.
 */
export function filterOptionLabel(tag: TagCatalogEntry): string {
  return tag.is_active ? tag.name : `${tag.name} (desativada)`
}
