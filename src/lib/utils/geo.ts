type BdcEntry = {
  name?: string
  description?: string
  adminLevel?: number
  order?: number
}

type BdcData = {
  city?: string
  locality?: string
  localityInfo?: {
    administrative?: BdcEntry[]
    informative?: BdcEntry[]
  }
}

/** lowercase + sem acento, pra comparar bairro vs cidade. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Extrai o bairro de localityInfo:
 *   - administrative com adminLevel >= 9 (nível 8 é o MUNICÍPIO), ou
 *   - informative cuja description contenha suburb/neighbourhood/district
 * Guard: nunca retorna algo igual a d.city NEM a d.locality (normalizados).
 * Entre os válidos, pega o de maior `order`. Nada válido → undefined.
 */
function extractNeighborhood(d: BdcData, city?: string): string | undefined {
  const info = d.localityInfo
  if (!info) return undefined

  const blocked = new Set(
    [city, d.city, d.locality].filter(Boolean).map((s) => normalize(s as string))
  )
  const candidates: Array<{ name: string; order: number }> = []

  for (const a of info.administrative ?? []) {
    if (typeof a.adminLevel === 'number' && a.adminLevel >= 9 && a.name) {
      candidates.push({ name: a.name, order: a.order ?? 0 })
    }
  }

  const keywords = ['suburb', 'neighbourhood', 'district']
  for (const i of info.informative ?? []) {
    const desc = (i.description ?? '').toLowerCase()
    if (i.name && keywords.some((k) => desc.includes(k))) {
      candidates.push({ name: i.name, order: i.order ?? 0 })
    }
  }

  const valid = candidates.filter((c) => !blocked.has(normalize(c.name)))
  if (valid.length === 0) return undefined

  valid.sort((a, b) => b.order - a.order)
  return valid[0].name
}

/**
 * Cidade real: administrative com adminLevel === 8 (município) se houver;
 * senão o fallback da API (d.city vem "Região Metropolitana..." — inútil).
 */
function extractCity(d: BdcData): string | undefined {
  const admin8 = (d.localityInfo?.administrative ?? []).find(
    (a) => a.adminLevel === 8 && a.name
  )
  return admin8?.name || d.city || d.locality || undefined
}

/**
 * Reverse geocoding client-side via BigDataCloud (grátis, sem API key).
 * Best-effort: preenche o que der; usuário SEMPRE pode editar os campos.
 * Nunca lança — falha retorna objeto vazio.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ city?: string; neighborhood?: string }> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`
    )
    if (!res.ok) return {}
    const d = (await res.json()) as BdcData
    console.debug('[reverseGeocode] raw:', d) // diagnóstico — remove na 3c
    const city = extractCity(d)
    const neighborhood = extractNeighborhood(d, city)
    return { city, neighborhood }
  } catch {
    return {}
  }
}
